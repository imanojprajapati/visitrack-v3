import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Event, { IEvent } from '../../../models/Event';
import mongoose from 'mongoose';
import { handleApiError, ApiError, isDatabaseError } from '../../../utils/api-error';

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
    // Add retry logic for database connection
    let retries = 3;
    let lastError: Error | null = null;

    while (retries > 0) {
      try {
        // Connect to database with timeout
        const connectionPromise = connectToDatabase();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 10000)
        );
        
        await Promise.race([connectionPromise, timeoutPromise]);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error occurred');
        console.error(`Database connection attempt failed (${retries} retries left):`, lastError);
        retries--;
        
        if (retries === 0) {
          throw new ApiError(503, 'Database connection failed after multiple attempts', lastError);
        }
        
        // Exponential backoff with jitter
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, 3 - retries) * 1000 * (0.5 + Math.random()))
        );
      }
    }

    switch (req.method) {
      case 'GET':
        try {
          const { status } = req.query;
          const query: any = {};

          // Handle status filter
          if (status === 'upcoming') {
            query.startDate = { $gte: new Date() };
            query.status = { $in: ['published', 'upcoming'] };
          } else if (status) {
            query.status = status;
          }

          // Add error handling for the query
          if (status && !['upcoming', 'published', 'draft', 'cancelled'].includes(status as string)) {
            throw new ApiError(400, 'Invalid status filter');
          }

          const events = await Event.find(query)
            .sort({ startDate: 1 })
            .lean()
            .exec();

          if (!events) {
            throw new ApiError(404, 'No events found');
          }

          // Transform dates to ISO strings to prevent JSON serialization issues
          const formattedEvents = events.map(event => {
            try {
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
            } catch (error) {
              console.error('Error formatting event:', error);
              throw new ApiError(500, 'Error formatting event data');
            }
          });

          // Set cache control headers
          res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
          return res.status(200).json(formattedEvents);

        } catch (error) {
          if (error instanceof ApiError) {
            throw error;
          }
          if (isDatabaseError(error)) {
            throw new ApiError(503, 'Database error while fetching events', error);
          }
          throw new ApiError(500, 'Error fetching events', error);
        }

      case 'POST':
        try {
          const eventData = req.body;
          console.log('Received event data:', eventData);

          // Validate required fields
          if (!eventData.title || !eventData.location || !eventData.startDate || !eventData.endDate) {
            throw new ApiError(400, 'Missing required fields');
          }

          // Convert date strings to Date objects
          try {
            if (eventData.startDate) eventData.startDate = new Date(eventData.startDate);
            if (eventData.endDate) eventData.endDate = new Date(eventData.endDate);
            if (eventData.registrationDeadline) eventData.registrationDeadline = new Date(eventData.registrationDeadline);
          } catch (error) {
            throw new ApiError(400, 'Invalid date format');
          }

          // Convert time formats from 12-hour to 24-hour format
          if (eventData.time) {
            console.log('Time field:', eventData.time);
          }
          if (eventData.endTime) {
            console.log('EndTime field:', eventData.endTime);
          }

          // Handle banner field - extract URL from fileList if needed
          if (eventData.banner && Array.isArray(eventData.banner) && eventData.banner.length > 0) {
            const bannerFile = eventData.banner[0];
            if (bannerFile.response && bannerFile.response.url) {
              eventData.banner = bannerFile.response.url;
            } else if (bannerFile.url) {
              eventData.banner = bannerFile.url;
            }
          }

          console.log('Processed event data:', eventData);

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

        } catch (error) {
          if (error instanceof ApiError) {
            throw error;
          }
          if (error instanceof mongoose.Error.ValidationError) {
            throw new ApiError(400, 'Validation error', error.errors);
          }
          if (isDatabaseError(error)) {
            throw new ApiError(503, 'Database error while creating event', error);
          }
          throw new ApiError(500, 'Error creating event', error);
        }

      default:
        throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleApiError(error, res);
  }
}