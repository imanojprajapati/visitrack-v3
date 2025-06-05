import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, eventId } = req.body;

    if (!email || !eventId) {
      return res.status(400).json({ message: 'Email and eventId are required' });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID format' });
    }

    // Connect to database
    await connectToDatabase();

    // Find visitor using Mongoose model with case-insensitive email match
    const visitor = await Visitor.findOne({
      email: { $regex: new RegExp('^' + email.toLowerCase() + '$', 'i') },
      eventId: new mongoose.Types.ObjectId(eventId),
      status: { $in: ['registered', 'checked_in', 'Visited'] }
    }).lean();

    if (visitor) {
      return res.status(200).json({
        isRegistered: true,
        visitor: {
          _id: visitor._id,
          eventId: visitor.eventId,
          registrationId: visitor.registrationId,
          name: visitor.name,
          email: visitor.email,
          phone: visitor.phone,
          company: visitor.company || '',
          eventName: visitor.eventName,
          eventLocation: visitor.eventLocation,
          eventStartDate: visitor.eventStartDate,
          eventEndDate: visitor.eventEndDate,
          status: visitor.status,
          qrCode: visitor.qrCode,
          createdAt: visitor.createdAt,
          additionalData: visitor.additionalData
        },
      });
    }

    res.status(200).json({ isRegistered: false });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error occurred');
    console.error('Error checking registration:', error);
    res.status(500).json({ 
      message: 'Failed to check registration status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 