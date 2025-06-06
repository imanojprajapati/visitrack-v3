import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import Event from '../../../models/Event';
import mongoose from 'mongoose';
import { handleApiError, ApiError, isDatabaseError } from '../../../utils/api-error';

interface RegistrationData {
  [key: string]: {
    label: string;
    value: any;
  };
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
            .populate('eventId', 'title location startDate endDate')
            .sort({ checkInTime: -1 })
            .lean()
            .exec();

          if (!visitors) {
            throw new ApiError(404, 'No visitors found');
          }

          // Format response
          const formattedVisitors = visitors.map(visitor => {
            try {
              const formatted: FormattedVisitor = {
                ...visitor,
                _id: visitor._id.toString(),
                eventId: visitor.eventId ? {
                  ...visitor.eventId,
                  _id: visitor.eventId._id.toString(),
                  startDate: new Date(visitor.eventId.startDate).toISOString(),
                  endDate: new Date(visitor.eventId.endDate).toISOString()
                } : null,
                checkInTime: new Date(visitor.checkInTime).toISOString(),
                createdAt: new Date(visitor.createdAt).toISOString(),
                updatedAt: new Date(visitor.updatedAt).toISOString()
              };

              // Handle optional fields
              if (visitor.checkOutTime) {
                formatted.checkOutTime = new Date(visitor.checkOutTime).toISOString();
              }
              if (visitor.formData) {
                formatted.formData = visitor.formData;
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
          await newVisitor.populate('eventId', 'title location startDate endDate');

          // Format response
          const formattedVisitor: FormattedVisitor = {
            ...newVisitor.toObject(),
            _id: newVisitor._id.toString(),
            eventId: newVisitor.eventId ? {
              ...newVisitor.eventId,
              _id: newVisitor.eventId._id.toString(),
              startDate: new Date(newVisitor.eventId.startDate).toISOString(),
              endDate: new Date(newVisitor.eventId.endDate).toISOString()
            } : null,
            checkInTime: newVisitor.checkInTime.toISOString(),
            createdAt: newVisitor.createdAt.toISOString(),
            updatedAt: newVisitor.updatedAt.toISOString()
          };

          // Handle optional fields
          if (newVisitor.checkOutTime) {
            formattedVisitor.checkOutTime = newVisitor.checkOutTime.toISOString();
          }
          if (newVisitor.formData) {
            formattedVisitor.formData = newVisitor.formData;
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