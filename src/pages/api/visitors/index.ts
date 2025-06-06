import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor, { IVisitor } from '../../../models/Visitor';
import Event, { IEvent } from '../../../models/Event';
import mongoose from 'mongoose';
import { handleApiError, ApiError, isDatabaseError } from '../../../utils/api-error';

interface RegistrationData {
  [key: string]: {
    label: string;
    value: any;
  };
}

interface FormattedEvent {
  _id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
}

type VisitorStatus = 'registered' | 'checked_in' | 'checked_out' | 'cancelled' | 'Visited';

interface FormattedVisitor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  age?: number;
  eventId: FormattedEvent | null;
  eventName: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate: string;
  status: VisitorStatus;
  checkInTime: string;
  checkOutTime?: string;
  formData?: Record<string, { label: string; value: any }>;
  createdAt: string;
  updatedAt: string;
}

interface PopulatedVisitor extends Omit<IVisitor, 'eventId' | 'status'> {
  eventId: IEvent & { _id: mongoose.Types.ObjectId };
  status: VisitorStatus;
  _id: mongoose.Types.ObjectId;
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
          const { eventId, date } = req.query;

          // Validate eventId if provided
          if (eventId && !mongoose.Types.ObjectId.isValid(eventId as string)) {
            throw new ApiError(400, 'Invalid event ID format');
          }

          // Build query
          const query: any = {};
          if (eventId) {
            query.eventId = new mongoose.Types.ObjectId(eventId as string);
          }
          if (date) {
            try {
              const startDate = new Date(date as string);
              startDate.setHours(0, 0, 0, 0);
              const endDate = new Date(date as string);
              endDate.setHours(23, 59, 59, 999);
              query.checkInTime = { $gte: startDate, $lte: endDate };
            } catch (error) {
              throw new ApiError(400, 'Invalid date format');
            }
          }

          // Fetch visitors with populated event data
          const visitors = await Visitor.find(query)
            .populate<{ eventId: IEvent }>('eventId', 'title location startDate endDate')
            .sort({ checkInTime: -1 })
            .lean()
            .exec();

          if (!visitors) {
            throw new ApiError(404, 'No visitors found');
          }

          // Format response
          const formattedVisitors = visitors.map(visitor => {
            try {
              const populatedVisitor = visitor as unknown as PopulatedVisitor;
              const formatted: FormattedVisitor = {
                ...populatedVisitor,
                _id: populatedVisitor._id.toString(),
                eventId: populatedVisitor.eventId ? {
                  _id: populatedVisitor.eventId._id.toString(),
                  title: populatedVisitor.eventId.title,
                  location: populatedVisitor.eventId.location,
                  startDate: new Date(populatedVisitor.eventId.startDate).toISOString(),
                  endDate: new Date(populatedVisitor.eventId.endDate).toISOString()
                } : null,
                checkInTime: new Date(populatedVisitor.checkInTime || populatedVisitor.createdAt).toISOString(),
                createdAt: new Date(populatedVisitor.createdAt).toISOString(),
                updatedAt: new Date(populatedVisitor.updatedAt).toISOString()
              };

              // Handle optional fields
              if (populatedVisitor.checkOutTime) {
                formatted.checkOutTime = new Date(populatedVisitor.checkOutTime).toISOString();
              }
              if (populatedVisitor.additionalData) {
                formatted.formData = populatedVisitor.additionalData as Record<string, { label: string; value: any }>;
              }

              return formatted;
            } catch (error) {
              console.error('Error formatting visitor:', error);
              throw new ApiError(500, 'Error formatting visitor data');
            }
          });

          // Set cache control headers
          res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
          return res.status(200).json(formattedVisitors);

        } catch (error) {
          if (error instanceof ApiError) {
            throw error;
          }
          if (isDatabaseError(error)) {
            throw new ApiError(503, 'Database error while fetching visitors', error);
          }
          throw new ApiError(500, 'Error fetching visitors', error);
        }

      case 'POST':
        try {
          const visitorData = req.body;

          // Validate required fields
          if (!visitorData.eventId || !visitorData.name || !visitorData.email) {
            throw new ApiError(400, 'Missing required fields');
          }

          // Validate eventId format
          if (!mongoose.Types.ObjectId.isValid(visitorData.eventId)) {
            throw new ApiError(400, 'Invalid event ID format');
          }

          // Check if event exists
          const event = await Event.findById(visitorData.eventId);
          if (!event) {
            throw new ApiError(404, 'Event not found');
          }

          // Create new visitor
          const newVisitor = await Visitor.create({
            ...visitorData,
            eventId: new mongoose.Types.ObjectId(visitorData.eventId),
            checkInTime: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });

          // Populate event data
          await newVisitor.populate<{ eventId: IEvent }>('eventId', 'title location startDate endDate');

          // Format response
          const populatedVisitor = newVisitor.toObject() as unknown as PopulatedVisitor;
          const formattedVisitor: FormattedVisitor = {
            ...populatedVisitor,
            _id: populatedVisitor._id.toString(),
            eventId: populatedVisitor.eventId ? {
              _id: populatedVisitor.eventId._id.toString(),
              title: populatedVisitor.eventId.title,
              location: populatedVisitor.eventId.location,
              startDate: new Date(populatedVisitor.eventId.startDate).toISOString(),
              endDate: new Date(populatedVisitor.eventId.endDate).toISOString()
            } : null,
            checkInTime: new Date(populatedVisitor.checkInTime || populatedVisitor.createdAt).toISOString(),
            createdAt: new Date(populatedVisitor.createdAt).toISOString(),
            updatedAt: new Date(populatedVisitor.updatedAt).toISOString()
          };

          // Handle optional fields
          if (populatedVisitor.checkOutTime) {
            formattedVisitor.checkOutTime = new Date(populatedVisitor.checkOutTime).toISOString();
          }
          if (populatedVisitor.additionalData) {
            formattedVisitor.formData = populatedVisitor.additionalData as Record<string, { label: string; value: any }>;
          }

          return res.status(201).json(formattedVisitor);

        } catch (error) {
          if (error instanceof ApiError) {
            throw error;
          }
          if (error instanceof mongoose.Error.ValidationError) {
            throw new ApiError(400, 'Validation error', error.errors);
          }
          if (isDatabaseError(error)) {
            throw new ApiError(503, 'Database error while creating visitor', error);
          }
          throw new ApiError(500, 'Error creating visitor', error);
        }

      default:
        throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleApiError(error, res);
  }
} 