import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    console.error('Invalid visitor ID:', id);
    return res.status(400).json({ message: 'Invalid visitor ID' });
  }

  try {
    console.log('Connecting to database...');
    const { mongoose } = await connectToDatabase();
    console.log('Connected to database, searching for visitor:', id);

    const visitor = await Visitor.findById(id);
    console.log('Visitor search result:', visitor ? 'Found' : 'Not found');

    if (!visitor) {
      console.error('Visitor not found:', id);
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Convert MongoDB document to plain object and format dates
    const visitorData = {
      _id: visitor._id.toString(),
      name: visitor.name,
      email: visitor.email,
      phone: visitor.phone,
      age: visitor.age,
      eventName: visitor.eventName,
      eventLocation: visitor.eventLocation,
      eventStartDate: visitor.eventStartDate,
      eventEndDate: visitor.eventEndDate,
      status: visitor.status,
      checkInTime: visitor.checkInTime,
      checkOutTime: visitor.checkOutTime,
      createdAt: visitor.createdAt,
      updatedAt: visitor.updatedAt
    };

    console.log('Sending visitor data for ID:', id);
    res.status(200).json(visitorData);
  } catch (error) {
    console.error('Error in visitor API:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 