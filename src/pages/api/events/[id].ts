import { NextApiRequest, NextApiResponse } from 'next';
import { CreateEventInput, Event } from '../../../types/event';
import clientPromise from '../../../utils/mongodb';
import { DB_NAME } from '../../../utils/constants';
import { ObjectId } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection("events");

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid event ID format' });
    }

    const objectId = new ObjectId(id);

    switch (req.method) {
      case 'GET':
        try {
          const event = await collection.findOne({ _id: objectId });
          if (!event) {
            return res.status(404).json({ error: 'Event not found' });
          }
          res.status(200).json(event);
        } catch (error) {
          console.error('Failed to fetch event:', error);
          res.status(500).json({ error: 'Failed to fetch event' });
        }
        break;

      case 'PUT':
        try {
          const eventData: Partial<CreateEventInput> = req.body;
          
          // Validate required fields
          if (!eventData.title || !eventData.description || !eventData.category || 
              !eventData.startDate || !eventData.endDate || !eventData.location || 
              !eventData.organizer) {
            return res.status(400).json({ error: 'Missing required fields' });
          }

          // Validate dates
          const startDate = new Date(eventData.startDate);
          const endDate = new Date(eventData.endDate);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
          }

          const updateData = {
            ...eventData,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            updatedAt: new Date(),
          };

          const result = await collection.updateOne(
            { _id: objectId },
            { $set: updateData }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Event not found' });
          }

          res.status(200).json({ 
            message: 'Event updated successfully',
            eventId: id
          });
        } catch (error) {
          console.error('Failed to update event:', error);
          res.status(500).json({ error: 'Failed to update event' });
        }
        break;

      case 'DELETE':
        try {
          const result = await collection.deleteOne({ _id: objectId });
          
          if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Event not found' });
          }

          res.status(200).json({ message: 'Event deleted successfully' });
        } catch (error) {
          console.error('Failed to delete event:', error);
          res.status(500).json({ error: 'Failed to delete event' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 