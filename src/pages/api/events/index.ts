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
          const { status, admin } = req.query;
          const query: any = {};

          // Handle status filter
          if (status === 'upcoming') {
            // Convert current date to DD-MM-YYYY format for string comparison
            const today = new Date();
            const todayStr = formatDate(today);
            console.log('Upcoming events query - today:', todayStr);
            query.startDate = { $gte: todayStr };
            query.status = { $in: ['published', 'upcoming'] };
            console.log('Upcoming events query:', JSON.stringify(query));
          } else if (status) {
            query.status = status;
          }

          // Filter out events where end date has passed (only for public pages, not admin)
          if ((status === 'upcoming' || !status) && !admin) {
            const today = new Date();
            const todayStr = formatDate(today);
            console.log('Public events query - today:', todayStr);
            query.endDate = { $gte: todayStr };
            console.log('Public events query:', JSON.stringify(query));
          }

          // Add error handling for the query
          if (status && !['upcoming', 'published', 'draft', 'cancelled'].includes(status as string)) {
            throw new ApiError(400, 'Invalid status filter');
          }

          const events = await Event.find(query)
            .sort({ startDate: 1 }) // Sort by start date: nearest to latest (6/25/25 to 12/12/25)
            .lean()
            .exec();

          console.log(`Found ${events.length} events for query:`, JSON.stringify(query));
          if (events.length > 0) {
            console.log('First event:', {
              _id: events[0]._id,
              title: events[0].title,
              startDate: events[0].startDate,
              endDate: events[0].endDate,
              status: events[0].status
            });
          }

          if (!events) {
            throw new ApiError(404, 'No events found');
          }

          // Transform dates to DD-MM-YYYY format to prevent JSON serialization issues
          const formattedEvents = events.map(event => {
            try {
              // Extract formId before spreading to avoid type conflicts
              const { formId, ...eventWithoutFormId } = event;
              
              const formatted: FormattedEvent = {
                ...eventWithoutFormId,
                _id: event._id?.toString() || '',
                startDate: event.startDate, // Already in DD-MM-YYYY format
                endDate: event.endDate, // Already in DD-MM-YYYY format
                createdAt: new Date(event.createdAt).toISOString(),
                updatedAt: new Date(event.updatedAt).toISOString()
              };

              // Handle optional fields
              if (event.registrationDeadline) {
                formatted.registrationDeadline = event.registrationDeadline; // Already in DD-MM-YYYY format
              }
              if (formId) {
                formatted.formId = formId.toString();
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

          // Test: Check the Event model schema
          console.log('Event model schema check:', {
            startDatePath: Event.schema.paths.startDate,
            endDatePath: Event.schema.paths.endDate,
            registrationDeadlinePath: Event.schema.paths.registrationDeadline
          });

          // Test: Try to create a minimal event first
          console.log('Testing minimal event creation...');
          try {
            const testEvent = await Event.create({
              title: 'Test Event',
              location: 'Test Location',
              startDate: '20-08-2025',
              endDate: '25-08-2025',
              time: '09:00',
              endTime: '17:00',
              status: 'draft',
              capacity: 100
            });
            console.log('Test event created successfully:', testEvent._id);
            // Delete the test event
            await Event.findByIdAndDelete(testEvent._id);
            console.log('Test event deleted');
          } catch (testError) {
            console.error('Test event creation failed:', testError);
            throw new ApiError(400, `Schema test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
          }

          // Validate required fields
          if (!eventData.title || !eventData.location || !eventData.startDate || !eventData.endDate) {
            throw new ApiError(400, 'Missing required fields');
          }

          // Convert date strings to DD-MM-YYYY format
          try {
            if (eventData.startDate) eventData.startDate = formatDate(eventData.startDate);
            if (eventData.endDate) eventData.endDate = formatDate(eventData.endDate);
            if (eventData.registrationDeadline) eventData.registrationDeadline = formatDate(eventData.registrationDeadline);
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
          console.log('Creating event with data:', JSON.stringify(eventData, null, 2));
          const newEvent = await Event.create({
            ...eventData,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log('Event created successfully:', newEvent._id);

          // Format response
          const formattedEvent: FormattedEvent = {
            _id: newEvent._id?.toString() || '',
            title: newEvent.title,
            description: newEvent.description,
            location: newEvent.location,
            venue: newEvent.venue,
            startDate: newEvent.startDate,
            endDate: newEvent.endDate,
            time: newEvent.time,
            endTime: newEvent.endTime,
            status: newEvent.status,
            capacity: newEvent.capacity,
            visitors: newEvent.visitors,
            createdAt: newEvent.createdAt.toISOString(),
            updatedAt: newEvent.updatedAt.toISOString()
          };

          // Handle optional fields
          if (newEvent.registrationDeadline) {
            formattedEvent.registrationDeadline = newEvent.registrationDeadline;
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