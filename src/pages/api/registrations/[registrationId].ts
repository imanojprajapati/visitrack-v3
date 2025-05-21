import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../lib/dbConnect';
import Registration from '../../../../models/Registration';
import Event from '../../../../models/Event';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { registrationId } = req.query;

  if (!registrationId || typeof registrationId !== 'string') {
    return res.status(400).json({ error: 'Invalid registration ID' });
  }

  await dbConnect();

  try {
    switch (req.method) {
      case 'GET':
        const registration = await Registration.findById(registrationId);
        
        if (!registration) {
          return res.status(404).json({ error: 'Registration not found' });
        }

        // Fetch event details
        const event = await Event.findById(registration.eventId);
        
        // Combine registration and event data
        const visitorData = {
          ...registration.toObject(),
          event: event ? {
            title: event.title,
            location: event.location,
            startDate: event.startDate,
            endDate: event.endDate,
          } : undefined,
        };

        res.status(200).json(visitorData);
        break;

      case 'PUT':
        // Update registration status (for check-in/check-out)
        const { status } = req.body;
        
        if (!status || !['checked-in', 'checked-out'].includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
        }

        const updatedRegistration = await Registration.findByIdAndUpdate(
          registrationId,
          { status },
          { new: true }
        );

        if (!updatedRegistration) {
          return res.status(404).json({ error: 'Registration not found' });
        }

        res.status(200).json(updatedRegistration);
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error handling registration:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 