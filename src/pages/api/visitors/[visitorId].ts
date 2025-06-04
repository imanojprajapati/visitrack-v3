import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import Event from '../../../models/Event';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { visitorId } = req.query;
    const eventId = req.query.eventId as string;

    console.log('Fetching visitor details:', { visitorId, eventId });

    if (!visitorId || typeof visitorId !== 'string') {
      console.error('Invalid visitor ID:', visitorId);
      return res.status(400).json({ message: 'Visitor ID is required' });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(visitorId)) {
      console.error('Invalid MongoDB ObjectId:', visitorId);
      return res.status(400).json({ message: 'Invalid visitor ID format' });
    }

    // Connect to database
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connection established');

    // Find visitor
    console.log('Finding visitor:', visitorId);
    const visitor = await Visitor.findById(visitorId).lean();
    
    if (!visitor) {
      console.error('Visitor not found:', visitorId);
      return res.status(404).json({ message: 'Visitor not found' });
    }
    
    console.log('Found visitor:', visitor._id);

    // If eventId is provided, verify visitor is registered for this event
    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      console.log('Checking event registration:', eventId);
      
      // Check if the visitor is registered for this event by checking their eventId field
      if (visitor.eventId.toString() !== eventId) {
        console.error('Visitor not registered for event:', { visitorId, eventId, visitorEventId: visitor.eventId });
        return res.status(404).json({ message: 'Visitor is not registered for this event' });
      }
      
      // Verify the event exists
      const event = await Event.findById(eventId).lean();
      if (!event) {
        console.error('Event not found:', eventId);
        return res.status(404).json({ message: 'Event not found' });
      }
      
      console.log('Visitor registration confirmed for event:', eventId);
    }

    // Return visitor details
    console.log('Returning visitor details');
    return res.status(200).json({
      message: 'Visitor details retrieved successfully',
      visitor: {
        ...visitor,
        id: visitor._id
      }
    });

  } catch (error) {
    console.error('Error fetching visitor details:', error);
    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes('Database connection failed')) {
      return res.status(503).json({ 
        message: 'Database connection error. Please try again later.'
      });
    }
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to fetch visitor details'
    });
  }
} 