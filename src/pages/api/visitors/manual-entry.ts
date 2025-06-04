import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import QRScan from '../../../models/QRScan';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Connect to database
  await connectToDatabase();

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { visitorId, eventId } = req.body;

    if (!visitorId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Visitor ID is required' });
    }

    // Validate MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(visitorId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    // Find visitor
    const query: any = { _id: visitorId };
    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      query.eventId = eventId;
    }

    // Find visitor with less restrictive status check
    const visitor = await Visitor.findOne(query).session(session);

    if (!visitor) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Check if visitor has already been marked as visited
    if (visitor.status === 'Visited') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Visitor has already been marked as visited',
        visitor: {
          _id: visitor._id,
          name: visitor.name,
          company: visitor.company,
          eventName: visitor.eventName,
          status: visitor.status,
          scanTime: visitor.scanTime,
          eventId: visitor.eventId
        }
      });
    }

    // Update visitor status to 'Visited' and add scan time
    const now = new Date();
    const updatedVisitor = await Visitor.findByIdAndUpdate(
      visitorId,
      {
        $set: {
          status: 'Visited',
          scanTime: now,
          lastUpdated: now
        }
      },
      { new: true, session }
    );

    if (!updatedVisitor) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ message: 'Failed to update visitor status' });
    }

    // Create QR scan record
    const qrScan = await QRScan.create([{
      visitorId: visitor._id,
      eventId: visitor.eventId,
      registrationId: visitor.registrationId,
      name: visitor.name,
      company: visitor.company,
      eventName: visitor.eventName,
      scanTime: now,
      entryType: 'manual',
      status: 'Visited',
      deviceInfo: req.headers['user-agent'] || 'Unknown device'
    }], { session });

    if (!qrScan[0]) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ message: 'Failed to create scan record' });
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Return success response with visitor details
    return res.status(200).json({
      message: 'Visitor entry processed successfully',
      visitor: {
        _id: updatedVisitor._id,
        name: updatedVisitor.name,
        company: updatedVisitor.company,
        eventName: updatedVisitor.eventName,
        status: updatedVisitor.status,
        scanTime: now.toISOString(),
        eventId: updatedVisitor.eventId
      }
    });
  } catch (error) {
    // If an error occurred, abort the transaction
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('Error processing manual entry:', error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to process manual entry'
    });
  }
} 