import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { eventId } = req.query;

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ message: 'Invalid event ID' });
  }

  try {
    await connectToDatabase();

    switch (req.method) {
      case 'GET':
        const event = await Event.findById(eventId);
        if (!event) {
          return res.status(404).json({ message: 'Event not found' });
        }
        return res.status(200).json(event);

      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Error handling event request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 