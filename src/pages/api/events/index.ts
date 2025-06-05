import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Event, { IEvent } from '../../../models/Event';
import mongoose from 'mongoose';
import { handleApiError, ApiError } from '../../../utils/api-error';

interface EventDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  time: string;
  endTime: string;
  status: string;
  capacity: number;
  visitors: number;
  registrationDeadline?: Date;
  createdAt: Date;
  updatedAt: Date;
  formId?: mongoose.Types.ObjectId;
}

interface FormattedEvent {
  _id: string;
  title?: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  time?: string;
  endTime?: string;
  status?: string;
  capacity?: number;
  visitors?: number;
  registrationDeadline?: string;
  createdAt: string;
  updatedAt: string;
  formId?: string;
  [key: string]: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await connectToDatabase();

    switch (req.method) {
      case 'GET':
        const { status } = req.query;
        const query: any = {};

        // Handle status filter
        if (status === 'upcoming') {
          query.startDate = { $gte: new Date() };
          query.status = { $in: ['published', 'upcoming'] };
        } else if (status) {
          query.status = status;
        }

        const events = await Event.find(query)
          .sort({ startDate: 1 })
          .lean();

        // Transform dates to ISO strings to prevent JSON serialization issues
        const formattedEvents = events.map(event => {
          const formatted: FormattedEvent = {
            ...event,
            _id: event._id?.toString() || '',
            startDate: new Date(event.startDate).toISOString(),
            endDate: new Date(event.endDate).toISOString(),
            createdAt: new Date(event.createdAt).toISOString(),
            updatedAt: new Date(event.updatedAt).toISOString()
          };

          // Handle optional fields
          if (event.registrationDeadline) {
            formatted.registrationDeadline = new Date(event.registrationDeadline).toISOString();
          }
          if (event.formId) {
            formatted.formId = event.formId.toString();
          }

          return formatted;
        });

        return res.status(200).json(formattedEvents);

      case 'POST':
        const eventData = req.body;

        // Validate required fields
        if (!eventData.title || !eventData.location || !eventData.startDate || !eventData.endDate) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        // Convert date strings to Date objects
        try {
          if (eventData.startDate) eventData.startDate = new Date(eventData.startDate);
          if (eventData.endDate) eventData.endDate = new Date(eventData.endDate);
          if (eventData.registrationDeadline) eventData.registrationDeadline = new Date(eventData.registrationDeadline);
        } catch (error) {
          return res.status(400).json({ message: 'Invalid date format' });
        }

        // Create new event
        const newEvent = await Event.create({
          ...eventData,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Format response
        const formattedEvent: FormattedEvent = {
          ...newEvent.toObject(),
          _id: newEvent._id.toString(),
          startDate: newEvent.startDate.toISOString(),
          endDate: newEvent.endDate.toISOString(),
          createdAt: newEvent.createdAt.toISOString(),
          updatedAt: newEvent.updatedAt.toISOString()
        };

        // Handle optional fields
        if (newEvent.registrationDeadline) {
          formattedEvent.registrationDeadline = newEvent.registrationDeadline.toISOString();
        }
        if (newEvent.formId) {
          formattedEvent.formId = newEvent.formId.toString();
        }

        return res.status(201).json(formattedEvent);

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling event request:', error);
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}