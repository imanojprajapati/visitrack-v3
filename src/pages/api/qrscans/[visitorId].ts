import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { visitorId } = req.query;
  if (!visitorId || typeof visitorId !== 'string') {
    return res.status(400).json({ message: 'Invalid visitor ID' });
  }

  try {
    const { db } = await connectToDatabase();
    const { status, error } = req.body;

    // Validate required fields
    if (!status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Update the most recent scan record for this visitor using findOneAndUpdate
    const result = await db.collection('qrscans').findOneAndUpdate(
      { visitorId },
      { 
        $set: { 
          status,
          error,
          updatedAt: new Date()
        }
      },
      { 
        sort: { scanTime: -1 },
        returnDocument: 'after'
      }
    );

    if (!result || !result.value) {
      return res.status(404).json({ message: 'Scan record not found' });
    }

    return res.status(200).json({ 
      message: 'Scan record updated successfully',
      scan: result.value
    });
  } catch (error) {
    console.error('Error updating scan record:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 