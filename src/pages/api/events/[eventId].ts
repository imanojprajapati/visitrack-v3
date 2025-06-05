import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Event, { IEvent } from '../../../models/Event';
import Form from '../../../models/Form';
import { EventForm, FormField } from '../../../types/form';
import mongoose from 'mongoose';

interface EventWithForm extends Omit<IEvent, 'formId'> {
  formId?: mongoose.Types.ObjectId;
  form?: EventForm;
}

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

        // If event has a formId, fetch the form details
        if (event.formId) {
          const form = await Form.findById(event.formId).lean() as IFormDocument | null;
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

            event.form = {
              id: form._id.toString(),
              title: form.title,
              fields: convertedFields
            };
          }
        }

        // Remove the raw formId from response
        const { formId, ...eventData } = event;

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

        // Convert dates to proper format
        if (updates.startDate) updates.startDate = new Date(updates.startDate);
        if (updates.endDate) updates.endDate = new Date(updates.endDate);
        if (updates.registrationDeadline) updates.registrationDeadline = new Date(updates.registrationDeadline);

        // Update event
        const updatedEvent = await Event.findByIdAndUpdate(
          eventId,
          { ...updates, updatedAt: new Date() },
          { new: true, runValidators: true }
        ).lean();

        if (!updatedEvent) {
          return res.status(404).json({ message: 'Event not found' });
        }

        res.status(200).json(updatedEvent);
      } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ message: 'Failed to update event' });
      }
      break;

    default:
      res.status(405).json({ message: 'Method not allowed' });
  }
} 