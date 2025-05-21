import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import Visitor from '../../../models/Visitor';
import Event, { IEvent } from '../../../models/Event';
import Registration from '../../../models/Registration';
import mongoose from 'mongoose';

interface RegistrationData {
  [key: string]: {
    label: string;
    value: any;
  };
}

interface IRegistration extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  formId: mongoose.Types.ObjectId;
  data: RegistrationData;
  status: string;
  submittedAt: Date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  try {
    switch (req.method) {
      case 'GET':
        // Get query parameters for filtering
        const { eventId, status, search } = req.query;

        // Build the query
        const query: any = {};
        if (eventId) query.eventId = eventId;
        if (status) query.status = status;
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ];
        }

        const visitors = await Visitor.find(query)
          .sort({ createdAt: -1 })
          .lean();

        res.status(200).json(visitors);
        break;

      case 'POST':
        const { registrationId } = req.body;

        if (!registrationId) {
          return res.status(400).json({ error: 'Registration ID is required' });
        }

        // Find the registration
        const registration = await Registration.findById(registrationId).lean() as IRegistration;
        if (!registration) {
          return res.status(404).json({ error: 'Registration not found' });
        }

        // Find the event
        const event = await Event.findById(registration.eventId).lean() as IEvent;
        if (!event) {
          return res.status(404).json({ error: 'Event not found' });
        }

        // Extract visitor data from registration
        const registrationData = registration.data;
        
        // Helper function to get field value by label
        const getFieldValue = (label: string): string => {
          const field = Object.values(registrationData).find(f => f.label === label);
          return field ? String(field.value) : '';
        };

        // Create visitor record
        const visitor = await Visitor.create({
          registrationId: registration._id,
          eventId: registration.eventId,
          formId: registration.formId,
          name: getFieldValue('Name'),
          email: getFieldValue('Enter a Email'),
          phone: getFieldValue('Phone No'),
          age: Number(getFieldValue('Age')) || 0,
          eventName: event.title,
          eventLocation: event.location,
          eventStartDate: event.startDate,
          eventEndDate: event.endDate,
          status: 'registered',
          additionalData: registrationData,
        });

        res.status(201).json(visitor);
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error handling visitors:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 