import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';

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
    const { db } = await connectToDatabase();

    // Find the visitor
    const visitor = await db.collection('visitors').findOne({
      _id: new ObjectId(visitorId)
    });

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Check if visitor has already entered
    const existingEntry = await db.collection('entries').findOne({
      visitorId: new ObjectId(visitorId),
      entryTime: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)) // Start of today
      }
    });

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
    const entry = {
      visitorId: new ObjectId(visitorId),
      eventId: visitor.eventId,
      entryTime,
      createdAt: entryTime
    };

    await db.collection('entries').insertOne(entry);

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