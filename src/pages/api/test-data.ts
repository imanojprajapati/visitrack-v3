import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../lib/mongodb';
import Visitor from '../../models/Visitor';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();

    // Create sample visitor data
    const sampleVisitor = await Visitor.create({
      registrationId: new mongoose.Types.ObjectId(),
      eventId: new mongoose.Types.ObjectId(),
      formId: new mongoose.Types.ObjectId(),
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      company: 'Tech Corp',
      age: 30,
      qrCode: '6842a28d2f9437dd9f4053cb',
      eventName: 'Tech Conference 2024',
      eventLocation: 'Convention Center',
      eventStartDate: '15-01-24',
      eventEndDate: '16-01-24',
      eventStartTime: '09:00',
      eventEndTime: '17:00',
      status: 'registered',
      createdAt: '10-01-24',
      updatedAt: '10-01-24',
      additionalData: {}
    });

    return res.status(201).json({
      message: 'Sample visitor created successfully',
      visitor: sampleVisitor
    });
  } catch (error) {
    console.error('Error creating sample visitor:', error);
    return res.status(500).json({
      message: 'Failed to create sample visitor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 