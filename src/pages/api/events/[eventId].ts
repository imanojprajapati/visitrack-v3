import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Event, { IEvent } from '../../../models/Event';
import Form from '../../../models/Form';
import Visitor from '../../../models/Visitor';
import Registration from '../../../models/Registration';
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
  startDate: string;
  endDate: string;
  time: string;
  endTime: string;
  status: string;
  capacity: number;
  visitors: number;
  formId?: mongoose.Types.ObjectId;
  registrationDeadline?: string;
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

// Helper function to format dates to DD-MM-YYYY format
const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    // If it's already a string in DD-MM-YYYY format, return it
    if (/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/.test(date)) {
      return date;
    }
    // Otherwise parse it as a date
    date = new Date(date);
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { eventId } = req.query;

  // Helper function to convert 12-hour time format to 24-hour format
  const convertTo24HourFormat = (time12h: string): string => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier === 'PM') {
      hours = (parseInt(hours, 10) + 12).toString();
    }
    
    return `${hours.padStart(2, '0')}:${minutes}`;
  };

  if (!eventId || typeof eventId !== 'string') {
    console.error('Invalid event ID provided:', eventId);
    return res.status(400).json({ message: 'Invalid event ID' });
  }

  // Add retry logic for database connection
  let retries = 3;
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      // Connect to database with timeout
      const connectionPromise = connectToDatabase();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      );
      
      await Promise.race([connectionPromise, timeoutPromise]);
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      console.error(`Database connection attempt failed (${retries} retries left):`, lastError);
      retries--;
      
      if (retries === 0) {
        return res.status(503).json({ 
          message: 'Database connection failed after multiple attempts',
          error: lastError.message
        });
      }
      
      // Exponential backoff with jitter
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, 3 - retries) * 1000 * (0.5 + Math.random()))
      );
    }
  }

  try {
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.error('Invalid event ID format:', eventId);
      return res.status(400).json({ message: 'Invalid event ID format' });
    }

    switch (req.method) {
      case 'GET':
        try {
          // Get event with form details using lean() for better performance
          const event = await Event.findById(eventId)
            .lean()
            .exec() as unknown as MongoEvent;

          if (!event) {
            console.error('Event not found for ID:', eventId);
            return res.status(404).json({ message: 'Event not found' });
          }

          // Convert ObjectId to string and format dates
          const formattedEvent = {
            ...event,
            _id: event._id.toString(),
            startDate: event.startDate, // Already in DD-MM-YYYY format
            endDate: event.endDate, // Already in DD-MM-YYYY format
            registrationDeadline: event.registrationDeadline, // Already in DD-MM-YYYY format
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString(),
            formId: event.formId?.toString()
          } as FormattedEvent;

          // If event has a formId, fetch the form details with timeout
          if (event.formId) {
            try {
              const formPromise = Form.findById(event.formId)
                .lean()
                .exec() as Promise<IFormDocument>;
              
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Form fetch timeout')), 5000)
              );

              const form = await Promise.race([formPromise, timeoutPromise]) as IFormDocument;

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

          // Set appropriate headers
          res.setHeader('Cache-Control', 'no-store, must-revalidate');
          res.setHeader('Content-Type', 'application/json');

          return res.status(200).json(eventData);
        } catch (error) {
          console.error('Error processing event:', error);
          return res.status(500).json({ 
            message: 'Internal server error while processing event',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

      case 'PUT':
        const updates = req.body;
        console.log('Received update data:', updates);

        // Validate request body
        if (!updates || typeof updates !== 'object') {
          return res.status(400).json({ message: 'Invalid request body' });
        }

        // Validate and convert dates to DD-MM-YYYY format
        const dateFields = ['startDate', 'endDate', 'registrationDeadline'];
        for (const field of dateFields) {
          if (updates[field]) {
            try {
              updates[field] = formatDate(updates[field]);
            } catch (error) {
              console.error(`Error converting ${field}:`, error);
              return res.status(400).json({ message: `Invalid ${field} format` });
            }
          }
        }

        // Handle banner field - extract URL from fileList if needed
        if (updates.banner && Array.isArray(updates.banner) && updates.banner.length > 0) {
          const bannerFile = updates.banner[0];
          if (bannerFile.response && bannerFile.response.url) {
            updates.banner = bannerFile.response.url;
          } else if (bannerFile.url) {
            updates.banner = bannerFile.url;
          }
        }

        // Convert time formats from 12-hour to 24-hour format
        if (updates.time) {
          updates.time = convertTo24HourFormat(updates.time);
        }
        if (updates.endTime) {
          updates.endTime = convertTo24HourFormat(updates.endTime);
        }

        console.log('Processed updates:', updates);

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
          startDate: updatedEvent.startDate,
          endDate: updatedEvent.endDate,
          registrationDeadline: updatedEvent.registrationDeadline,
          createdAt: updatedEvent.createdAt.toISOString(),
          updatedAt: updatedEvent.updatedAt.toISOString(),
          formId: updatedEvent.formId?.toString()
        };

        return res.status(200).json(formattedUpdatedEvent);

      case 'DELETE':
        try {
          console.log(`Attempting to delete event: ${eventId}`);
          
          // Check if event exists
          const eventToDelete = await Event.findById(eventId);
          if (!eventToDelete) {
            console.log(`Event not found: ${eventId}`);
            return res.status(404).json({ message: 'Event not found' });
          }

          console.log(`Found event: ${eventToDelete.title}`);

          // Check if there are any visitors registered for this event
          const visitorCount = await Visitor.countDocuments({ eventId });
          const registrationCount = await Registration.countDocuments({ eventId });

          console.log(`Visitor count: ${visitorCount}, Registration count: ${registrationCount}`);

          if (visitorCount > 0) {
            console.log(`Cannot delete event - ${visitorCount} visitors exist`);
            return res.status(400).json({ 
              message: `Cannot delete event. There are ${visitorCount} visitors registered for this event. Please remove all registrations first.` 
            });
          }

          if (registrationCount > 0) {
            console.log(`Cannot delete event - ${registrationCount} registrations exist`);
            return res.status(400).json({ 
              message: `Cannot delete event. There are ${registrationCount} registrations for this event. Please remove all registrations first.` 
            });
          }

          // Delete the event
          console.log(`Proceeding with event deletion...`);
          const deleteResult = await Event.findByIdAndDelete(eventId);
          
          if (!deleteResult) {
            console.log(`Event deletion failed - no document found`);
            return res.status(404).json({ message: 'Event not found or already deleted' });
          }

          console.log(`Event ${eventId} deleted successfully`);

          return res.status(200).json({ 
            message: 'Event deleted successfully',
            deletedEventId: eventId
          });

        } catch (error) {
          console.error('Error deleting event:', error);
          return res.status(500).json({ 
            message: 'Internal server error while deleting event',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling event request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 