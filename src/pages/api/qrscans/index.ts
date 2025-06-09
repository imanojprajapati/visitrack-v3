import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { db } = await connectToDatabase();
      
      // Fetch all scans, sorted by scanTime in descending order
      const scans = await db.collection('qrscans')
        .find({})
        .sort({ scanTime: -1 })
        .limit(100) // Limit to last 100 scans
        .toArray();

      return res.status(200).json(scans);
    } catch (error) {
      console.error('Error fetching scans:', error);
      return res.status(500).json({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { db } = await connectToDatabase();
      const { visitorId, scanTime, entryType, status } = req.body;

      // Only visitorId is required for manual entry
      if (!visitorId) {
        return res.status(400).json({ message: 'Missing required field: visitorId' });
      }

      // Set defaults for optional fields
      const now = new Date();
      const result = await db.collection('qrscans').insertOne({
        visitorId,
        scanTime: scanTime || now,
        entryType: entryType || 'manual',
        status: status || 'Visited',
        createdAt: now,
        updatedAt: now
      });

      if (!result.acknowledged) {
        throw new Error('Failed to create scan record');
      }

      return res.status(201).json({ 
        message: 'Scan record created successfully',
        scanId: result.insertedId 
      });
    } catch (error) {
      console.error('Error creating scan record:', error);
      return res.status(500).json({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
} 