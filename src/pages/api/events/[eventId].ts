import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Event, { IEvent } from '../../../models/Event';
import Form from '../../../models/Form';
import { EventForm, FormField } from '../../../types/form';
import mongoose from 'mongoose';

interface IFormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface IFormDocument {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  title: string;
  fields: IFormField[];
  createdAt: Date;
  updatedAt: Date;
}

interface EventWithForm extends Omit<IEvent, 'formId'> {
  formId?: mongoose.Types.ObjectId;
  form?: EventForm;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { eventId } = req.query;

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ message: 'Invalid event ID' });
  }

  // Connect to database
  await connectToDatabase();

  // Validate MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ message: 'Invalid event ID format' });
  }

  switch (req.method) {
    case 'GET':
      try {
        // Get event with form details
        const event = await Event.findById(eventId).lean() as EventWithForm | null;

        if (!event) {
          return res.status(404).json({ message: 'Event not found' });
        }

        // Convert dates to ISO strings for consistent formatting
        const formattedEvent = {
          ...event,
          startDate: event.startDate?.toISOString(),
          endDate: event.endDate?.toISOString(),
          registrationDeadline: event.registrationDeadline?.toISOString(),
          createdAt: event.createdAt?.toISOString(),
          updatedAt: event.updatedAt?.toISOString(),
        };

        // If event has a formId, fetch the form details
        if (formattedEvent.formId) {
          const form = await Form.findById(formattedEvent.formId).lean() as IFormDocument | null;
          if (form) {
            // Convert form fields to match the expected type
            const convertedFields: FormField[] = form.fields.map(field => ({
              id: field.id,
              type: field.type as FormField['type'],
              label: field.label,
              required: field.required,
              placeholder: field.placeholder,
              options: field.options?.map(opt => ({ label: opt, value: opt })) || undefined,
              validation: field.validation
            }));

            formattedEvent.form = {
              id: form._id.toString(),
              title: form.title,
              fields: convertedFields
            };
          }
        }

        // Remove the raw formId from response
        const { formId, ...eventData } = formattedEvent;

        res.status(200).json(eventData);
      } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ message: 'Failed to fetch event details' });
      }
      break;

    case 'PUT':
      try {
        const updates = req.body;

        // Validate request body
        if (!updates || typeof updates !== 'object') {
          return res.status(400).json({ message: 'Invalid request body' });
        }

        // Validate and convert dates
        const dateFields = ['startDate', 'endDate', 'registrationDeadline'];
        for (const field of dateFields) {
          if (updates[field]) {
            try {
              const date = new Date(updates[field]);
              if (isNaN(date.getTime())) {
                return res.status(400).json({ message: `Invalid ${field} format` });
              }
              updates[field] = date;
            } catch (error) {
              return res.status(400).json({ message: `Invalid ${field} format` });
            }
          }
        }

        // Validate required fields
        const requiredFields = ['title', 'startDate', 'status'];
        for (const field of requiredFields) {
          if (!updates[field]) {
            return res.status(400).json({ message: `${field} is required` });
          }
        }

        // Update event
        const updatedEvent = await Event.findByIdAndUpdate(
          eventId,
          { 
            ...updates,
            updatedAt: new Date()
          },
          { 
            new: true, 
            runValidators: true
          }
        ) as IEvent | null;

        if (!updatedEvent) {
          return res.status(404).json({ message: 'Event not found' });
        }

        // Convert to plain object and format dates
        const eventObj = updatedEvent.toObject();
        const formattedEvent = {
          ...eventObj,
          _id: eventObj._id.toString(),
          startDate: eventObj.startDate?.toISOString(),
          endDate: eventObj.endDate?.toISOString(),
          registrationDeadline: eventObj.registrationDeadline?.toISOString(),
          createdAt: eventObj.createdAt?.toISOString(),
          updatedAt: eventObj.updatedAt?.toISOString(),
          formId: eventObj.formId?.toString()
        };

        res.status(200).json(formattedEvent);
      } catch (error) {
        console.error('Error updating event:', error);
        if (error instanceof Error) {
          res.status(500).json({ message: error.message });
        } else {
          res.status(500).json({ message: 'Failed to update event' });
        }
      }
      break;

    default:
      res.status(405).json({ message: 'Method not allowed' });
  }
} 