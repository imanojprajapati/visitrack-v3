import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Event, { IEvent } from '../../../models/Event';
import Form from '../../../models/Form';
import { EventForm, FormField } from '../../../types/form';
import mongoose, { Document } from 'mongoose';

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

interface IFormDocument extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  title: string;
  fields: IFormField[];
  createdAt: Date;
  updatedAt: Date;
}

type MongoEvent = {
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
  formId?: mongoose.Types.ObjectId;
  registrationDeadline?: Date;
  createdAt: Date;
  updatedAt: Date;
};

type FormattedEvent = {
  _id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  time: string;
  endTime: string;
  status: string;
  capacity: number;
  visitors: number;
  registrationDeadline?: string;
  createdAt: string;
  updatedAt: string;
  form?: EventForm;
  formId?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { eventId } = req.query;

  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ message: 'Invalid event ID' });
  }

  try {
    // Connect to database
    await connectToDatabase();

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID format' });
    }

    switch (req.method) {
      case 'GET':
        // Get event with form details
        const event = await Event.findById(eventId).lean() as unknown as MongoEvent;

        if (!event) {
          return res.status(404).json({ message: 'Event not found' });
        }

        // Convert ObjectId to string and format dates
        const formattedEvent = {
          ...event,
          _id: event._id.toString(),
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          registrationDeadline: event.registrationDeadline?.toISOString(),
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString(),
          formId: event.formId?.toString()
        } as FormattedEvent;

        // If event has a formId, fetch the form details
        if (event.formId) {
          try {
            const form = await Form.findById(event.formId).lean() as unknown as IFormDocument;
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
          } catch (formError) {
            console.error('Error fetching form:', formError);
            // Don't fail the entire request if form fetch fails
            formattedEvent.form = undefined;
          }
        }

        // Remove the raw formId from response to prevent circular references
        const { formId, ...eventData } = formattedEvent;

        return res.status(200).json(eventData);

      case 'PUT':
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
        ).lean() as unknown as MongoEvent;

        if (!updatedEvent) {
          return res.status(404).json({ message: 'Event not found' });
        }

        // Format response
        const formattedUpdatedEvent = {
          ...updatedEvent,
          _id: updatedEvent._id.toString(),
          startDate: updatedEvent.startDate.toISOString(),
          endDate: updatedEvent.endDate.toISOString(),
          registrationDeadline: updatedEvent.registrationDeadline?.toISOString(),
          createdAt: updatedEvent.createdAt.toISOString(),
          updatedAt: updatedEvent.updatedAt.toISOString(),
          formId: updatedEvent.formId?.toString()
        };

        return res.status(200).json(formattedUpdatedEvent);

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling event request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 