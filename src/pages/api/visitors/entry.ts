import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import Entry from '../../../models/Entry';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { visitorId } = req.body;

    if (!visitorId) {
      return res.status(400).json({ message: 'Visitor ID is required' });
    }

    // Connect to MongoDB
    await connectToDatabase();

    // Find the visitor
    const visitor = await Visitor.findById(visitorId).lean();

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Check if visitor has already entered
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const existingEntry = await Entry.findOne({
      visitorId: new mongoose.Types.ObjectId(visitorId),
      entryTime: {
        $gte: startOfToday
      }
    }).lean();

    if (existingEntry) {
      return res.status(400).json({
        message: 'Visitor has already entered today',
        entry: {
          ...visitor,
          entryTime: existingEntry.entryTime
        }
      });
    }

    // Record the entry
    const entryTime = new Date();
    const entry = await Entry.create({
      visitorId: new mongoose.Types.ObjectId(visitorId),
      eventId: visitor.eventId,
      entryTime,
      createdAt: entryTime
    });

    // Return visitor details with entry time
    return res.status(200).json({
      ...visitor,
      entryTime
    });

  } catch (error) {
    console.error('Error recording visitor entry:', error);
    return res.status(500).json({ message: 'Failed to record visitor entry' });
  }
} 