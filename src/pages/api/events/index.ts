import type { NextApiRequest, NextApiResponse } from 'next';
import type { IEvent } from '../../../models/Event';
import Event from '../../../models/Event';
import mongoose from 'mongoose';
import { connectToDatabase } from '../../../lib/mongodb';
import { CreateEventInput } from '../../../types/event';
import clientPromise from '../../../utils/mongodb';
import { DB_NAME } from '../../../utils/constants';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Connect to database using mongoose
    const conn = await connectToDatabase();
    if (!conn) {
      throw new Error('Failed to connect to database');
    }

    switch (req.method) {
      case 'GET':
        try {
          const events = await Event.find()
            .sort({ createdAt: -1 })
            .lean();
          
          res.status(200).json(events);
        } catch (error) {
          console.error('Failed to fetch events:', error);
          res.status(500).json({ error: 'Failed to fetch events' });
        }
        break;
      
      case 'POST':
        try {
          const eventData = req.body;
          
          console.log('Received event data:', eventData);

          // Validate required fields
          if (!eventData.title || !eventData.location || !eventData.startDate || 
              !eventData.endDate || !eventData.time || !eventData.endTime) {
            console.error('Missing required fields:', {
              title: !eventData.title,
              location: !eventData.location,
              startDate: !eventData.startDate,
              endDate: !eventData.endDate,
              time: !eventData.time,
              endTime: !eventData.endTime
            });
            return res.status(400).json({ error: 'Missing required fields' });
          }

          // Validate dates
          const startDate = new Date(eventData.startDate);
          const endDate = new Date(eventData.endDate);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error('Invalid date format:', { startDate: eventData.startDate, endDate: eventData.endDate });
            return res.status(400).json({ error: 'Invalid date format' });
          }

          // Create new event with proper initialization
          const newEvent = {
            title: eventData.title,
            description: eventData.description || '',
            location: eventData.location,
            venue: eventData.venue || eventData.location,
            startDate: startDate,
            endDate: endDate,
            time: eventData.time,
            endTime: eventData.endTime,
            category: eventData.category || 'General',
            organizer: eventData.organizer || 'Admin',
            status: eventData.status || 'draft',
            capacity: eventData.capacity || 100,
            banner: eventData.banner || '',
            registrationDeadline: eventData.registrationDeadline ? new Date(eventData.registrationDeadline) : undefined,
            formId: eventData.formId ? new mongoose.Types.ObjectId(eventData.formId) : undefined,
            visitors: 0 // Initialize visitor count to 0
          };

          // Use the Event model to create the event
          const event = await Event.create(newEvent);

          res.status(201).json({ 
            success: true,
            message: 'Event created successfully',
            event: event
          });
        } catch (error: any) {
          console.error('Error creating event:', error);
          res.status(500).json({ 
            error: 'Failed to create event',
            message: error.message,
            details: error.errors // Include validation errors in response
          });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error handling events:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message
    });
  }
}