import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../../lib/mongodb';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { visitorId } = req.query;
  if (!visitorId || typeof visitorId !== 'string') {
    return res.status(400).json({ message: 'Invalid visitor ID' });
  }

  try {
    const { db } = await connectToDatabase();
    const { status, checkInTime } = req.body;

    // Validate required fields
    if (!status || !checkInTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(visitorId);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid visitor ID format' });
    }

    // Update visitor status and check-in time
    const result = await db.collection('visitors').updateOne(
      { _id: objectId },
      { 
        $set: { 
          status,
          checkInTime,
          updatedAt: new Date()
        }
      }
    );

    if (!result.acknowledged) {
      throw new Error('Failed to update visitor status');
    }

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    return res.status(200).json({ 
      message: 'Visitor status updated successfully',
      status,
      checkInTime
    });
  } catch (error) {
    console.error('Error updating visitor status:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 