import { NextApiRequest, NextApiResponse } from 'next';
import { CreateEventInput, Event } from '../../../types/event';
import clientPromise from '../../../utils/mongodb';
import { DB_NAME } from '../../../utils/constants';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    switch (req.method) {
      case 'GET':
        try {
          const events = await db
            .collection("events")
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
          
          res.status(200).json(events);
        } catch (error) {
          console.error('Failed to fetch events:', error);
          res.status(500).json({ error: 'Failed to fetch events' });
        }
        break;
      
      case 'POST':
        try {
          const eventData: CreateEventInput = req.body;
          
          console.log('Received event data:', eventData);

          // Validate required fields
          if (!eventData.title || !eventData.description || !eventData.category || 
              !eventData.startDate || !eventData.endDate || !eventData.location || 
              !eventData.organizer) {
            console.error('Missing required fields:', {
              title: !eventData.title,
              description: !eventData.description,
              category: !eventData.category,
              startDate: !eventData.startDate,
              endDate: !eventData.endDate,
              location: !eventData.location,
              organizer: !eventData.organizer
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

          const newEvent: Omit<Event, '_id'> = {
            ...eventData,
            startDate,
            endDate,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const result = await db.collection("events").insertOne(newEvent);
          
          if (!result.insertedId) {
            throw new Error('Failed to insert event');
          }

          res.status(201).json({ 
            message: 'Event created successfully',
            eventId: result.insertedId 
          });
        } catch (error) {
          console.error('Failed to create event:', error);
          res.status(500).json({ error: 'Failed to create event' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}