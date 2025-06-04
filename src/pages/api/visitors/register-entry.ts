import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import Event from '../../../models/Event';
import QRScan from '../../../models/QRScan';
import mongoose from 'mongoose';

interface IEvent {
  _id: mongoose.Types.ObjectId;
  title: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { visitorId, eventId } = req.body;

    if (!visitorId) {
      return res.status(400).json({ message: 'Visitor ID is required' });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(visitorId)) {
      return res.status(400).json({ message: 'Invalid visitor ID format' });
    }

    // Connect to database
    await connectToDatabase();

    // Find visitor
    const visitor = await Visitor.findById(visitorId).lean();
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // If eventId is provided, verify visitor is registered for this event
    let event: IEvent | null = null;
    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      // Check if the visitor is registered for this event
      if (visitor.eventId.toString() !== eventId) {
        return res.status(404).json({ message: 'Visitor is not registered for this event' });
      }

      // Get event details
      event = await Event.findById(eventId).lean() as IEvent | null;
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
    }

    // Create QR scan record
    const scan = await QRScan.create([{
      visitorId: new mongoose.Types.ObjectId(visitorId),
      eventId: event ? new mongoose.Types.ObjectId(eventId) : undefined,
      name: visitor.name,
      company: visitor.company,
      eventName: event?.title || 'General Entry',
      scanTime: new Date(),
      entryType: 'scan',
      status: 'Visited'
    }], { session });

    // Update visitor status
    await Visitor.findByIdAndUpdate(
      visitorId,
      { 
        $set: { 
          lastVisit: new Date(),
          status: 'Visited'
        }
      },
      { session }
    );

    await session.commitTransaction();

    return res.status(200).json({
      message: 'Visitor entry registered successfully',
      scan: scan[0]
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error registering visitor entry:', error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to register visitor entry'
    });
  } finally {
    session.endSession();
  }
} 