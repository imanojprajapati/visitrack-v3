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

type VisitorStatus = 'registered' | 'Visited';

interface FormattedVisitor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  age?: number;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  source?: string;
  location?: string;
  qrCode: string;
  eventId: FormattedEvent | null;
  eventName: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate: string;
  eventStartTime: string;
  eventEndTime: string;
  status: VisitorStatus;
  scanTime?: Date;
  checkInTime: string;
  checkOutTime?: string;
  additionalData?: Record<string, { label: string; value: any }>;
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
          const { 
            eventId, 
            date, 
            name, 
            email, 
            phone, 
            company,
            city, 
            state, 
            country, 
            pincode,
            source,
            location,
            status,
            startDate,
            endDate
          } = req.query;

          // Validate eventId if provided
          if (eventId && !mongoose.Types.ObjectId.isValid(eventId as string)) {
            throw new ApiError(400, 'Invalid event ID format');
          }

          // Build query
          const query: any = {};
          
          // Basic filters
          if (eventId) {
            query.eventId = new mongoose.Types.ObjectId(eventId as string);
          }
          
          if (name) {
            query.$or = [
              { name: { $regex: name as string, $options: 'i' } },
              { 'additionalData.name.value': { $regex: name as string, $options: 'i' } }
            ];
          }
          
          if (email) {
            query.$or = [
              { email: { $regex: email as string, $options: 'i' } },
              { 'additionalData.email.value': { $regex: email as string, $options: 'i' } }
            ];
          }
          
          if (phone) {
            query.$or = [
              { phone: { $regex: phone as string, $options: 'i' } },
              { 'additionalData.phone.value': { $regex: phone as string, $options: 'i' } }
            ];
          }
          
          if (company) {
            query.$or = [
              { company: { $regex: company as string, $options: 'i' } },
              { 'additionalData.company.value': { $regex: company as string, $options: 'i' } }
            ];
          }
          
          if (location) {
            query.eventLocation = { $regex: location as string, $options: 'i' };
          }
          
          if (status) {
            query.status = status as string;
          }
          
          // Additional data filters (from form fields)
          if (city) {
            query['additionalData.city.value'] = { $regex: city as string, $options: 'i' };
          }
          
          if (state) {
            query['additionalData.state.value'] = { $regex: state as string, $options: 'i' };
          }
          
          if (country) {
            query['additionalData.country.value'] = { $regex: country as string, $options: 'i' };
          }
          
          if (pincode) {
            query.$or = [
              { 'additionalData.pinCode.value': { $regex: pincode as string, $options: 'i' } },
              { 'additionalData.pincode.value': { $regex: pincode as string, $options: 'i' } }
            ];
          }
          
          if (source) {
            query['additionalData.source.value'] = { $regex: source as string, $options: 'i' };
          }
          
          // Date range filter for event date
          if (startDate && endDate) {
            try {
              const start = new Date(startDate as string);
              start.setHours(0, 0, 0, 0);
              const end = new Date(endDate as string);
              end.setHours(23, 59, 59, 999);
              
              console.log('Filtering by event date range:', {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                startDateParam: startDate,
                endDateParam: endDate
              });
              
              // Build match conditions for aggregation
              const matchConditions: any = {
                // Filter events that occur within the specified date range
                // Event start date should be <= end date of filter range
                // Event end date should be >= start date of filter range
                $and: [
                  { 'eventData.startDate': { $lte: end } },
                  { 'eventData.endDate': { $gte: start } }
                ]
              };
              
              // Add other filters to the aggregation match
              if (eventId) {
                matchConditions.eventId = new mongoose.Types.ObjectId(eventId as string);
              }
              if (name) {
                matchConditions.$or = [
                  { name: { $regex: name as string, $options: 'i' } },
                  { 'additionalData.name.value': { $regex: name as string, $options: 'i' } }
                ];
              }
              if (email) {
                matchConditions.$or = [
                  { email: { $regex: email as string, $options: 'i' } },
                  { 'additionalData.email.value': { $regex: email as string, $options: 'i' } }
                ];
              }
              if (phone) {
                matchConditions.$or = [
                  { phone: { $regex: phone as string, $options: 'i' } },
                  { 'additionalData.phone.value': { $regex: phone as string, $options: 'i' } }
                ];
              }
              if (company) {
                matchConditions.$or = [
                  { company: { $regex: company as string, $options: 'i' } },
                  { 'additionalData.company.value': { $regex: company as string, $options: 'i' } }
                ];
              }
              if (location) {
                matchConditions.eventLocation = { $regex: location as string, $options: 'i' };
              }
              if (status) {
                matchConditions.status = status as string;
              }
              if (city) {
                matchConditions['additionalData.city.value'] = { $regex: city as string, $options: 'i' };
              }
              if (state) {
                matchConditions['additionalData.state.value'] = { $regex: state as string, $options: 'i' };
              }
              if (country) {
                matchConditions['additionalData.country.value'] = { $regex: country as string, $options: 'i' };
              }
              if (pincode) {
                matchConditions.$or = [
                  { 'additionalData.pinCode.value': { $regex: pincode as string, $options: 'i' } },
                  { 'additionalData.pincode.value': { $regex: pincode as string, $options: 'i' } }
                ];
              }
              if (source) {
                matchConditions['additionalData.source.value'] = { $regex: source as string, $options: 'i' };
              }
              
              // Filter by event date range using aggregation pipeline
              const visitors = await Visitor.aggregate([
                {
                  $lookup: {
                    from: 'events',
                    localField: 'eventId',
                    foreignField: '_id',
                    as: 'eventData'
                  }
                },
                {
                  $unwind: '$eventData'
                },
                {
                  $match: matchConditions
                },
                {
                  $lookup: {
                    from: 'events',
                    localField: 'eventId',
                    foreignField: '_id',
                    as: 'eventId'
                  }
                },
                {
                  $unwind: '$eventId'
                },
                {
                  $sort: { createdAt: -1 }
                }
              ]);

              console.log(`Found ${visitors.length} visitors for events in date range`);
              
              // Debug: Check first visitor's additionalData
              if (visitors.length > 0) {
                console.log('First visitor additionalData:', JSON.stringify(visitors[0].additionalData, null, 2));
              }

              // Format the aggregated results
              const formattedVisitors = visitors.map(visitor => {
                try {
                  const formatted: FormattedVisitor = {
                    _id: visitor._id.toString(),
                    name: visitor.name,
                    email: visitor.email,
                    phone: visitor.phone,
                    company: visitor.company,
                    age: visitor.age,
                    city: visitor.city,
                    state: visitor.state,
                    country: visitor.country,
                    pincode: visitor.pincode,
                    source: visitor.source,
                    location: visitor.location,
                    qrCode: visitor.qrCode,
                    eventId: visitor.eventId ? {
                      _id: visitor.eventId._id.toString(),
                      title: visitor.eventId.title,
                      location: visitor.eventId.location,
                      startDate: new Date(visitor.eventId.startDate).toISOString(),
                      endDate: new Date(visitor.eventId.endDate).toISOString()
                    } : null,
                    eventName: visitor.eventId?.title || '',
                    eventLocation: visitor.eventId?.location || '',
                    eventStartDate: visitor.eventId?.startDate ? new Date(visitor.eventId.startDate).toISOString() : '',
                    eventEndDate: visitor.eventId?.endDate ? new Date(visitor.eventId.endDate).toISOString() : '',
                    eventStartTime: visitor.eventStartTime || '',
                    eventEndTime: visitor.eventEndTime || '',
                    status: visitor.status,
                    scanTime: visitor.scanTime,
                    checkInTime: new Date(visitor.checkInTime || visitor.createdAt).toISOString(),
                    createdAt: new Date(visitor.createdAt).toISOString(),
                    updatedAt: new Date(visitor.updatedAt).toISOString()
                  };

                  // Handle optional fields
                  if (visitor.checkOutTime) {
                    formatted.checkOutTime = new Date(visitor.checkOutTime).toISOString();
                  }
                  
                  // Convert additionalData to the format expected by frontend
                  if (visitor.additionalData) {
                    formatted.additionalData = visitor.additionalData as Record<string, { label: string; value: any }>;
                    console.log(`Visitor ${formatted._id} additionalData:`, JSON.stringify(visitor.additionalData, null, 2));
                  } else {
                    formatted.additionalData = {};
                    console.log(`Visitor ${formatted._id} has no additionalData`);
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
              throw new ApiError(400, 'Invalid date range format');
            }
          }
          
          // Single date filter (for backward compatibility)
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
            .sort({ createdAt: -1 })
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
                _id: populatedVisitor._id.toString(),
                name: populatedVisitor.name,
                email: populatedVisitor.email,
                phone: populatedVisitor.phone,
                company: populatedVisitor.company,
                age: populatedVisitor.age,
                city: populatedVisitor.city,
                state: populatedVisitor.state,
                country: populatedVisitor.country,
                pincode: populatedVisitor.pincode,
                source: populatedVisitor.source,
                location: populatedVisitor.location,
                qrCode: populatedVisitor.qrCode,
                eventId: populatedVisitor.eventId ? {
                  _id: populatedVisitor.eventId._id.toString(),
                  title: populatedVisitor.eventId.title,
                  location: populatedVisitor.eventId.location,
                  startDate: new Date(populatedVisitor.eventId.startDate).toISOString(),
                  endDate: new Date(populatedVisitor.eventId.endDate).toISOString()
                } : null,
                eventName: populatedVisitor.eventName,
                eventLocation: populatedVisitor.eventLocation,
                eventStartDate: populatedVisitor.eventStartDate,
                eventEndDate: populatedVisitor.eventEndDate,
                eventStartTime: populatedVisitor.eventStartTime,
                eventEndTime: populatedVisitor.eventEndTime,
                status: populatedVisitor.status,
                scanTime: populatedVisitor.scanTime,
                checkInTime: new Date(populatedVisitor.checkInTime || populatedVisitor.createdAt).toISOString(),
                createdAt: new Date(populatedVisitor.createdAt).toISOString(),
                updatedAt: new Date(populatedVisitor.updatedAt).toISOString()
              };

              // Handle optional fields
              if (populatedVisitor.checkOutTime) {
                formatted.checkOutTime = new Date(populatedVisitor.checkOutTime).toISOString();
              }
              if (populatedVisitor.additionalData) {
                formatted.additionalData = populatedVisitor.additionalData as Record<string, { label: string; value: any }>;
                console.log(`Visitor ${formatted._id} additionalData:`, JSON.stringify(populatedVisitor.additionalData, null, 2));
              } else {
                formatted.additionalData = {};
                console.log(`Visitor ${formatted._id} has no additionalData`);
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
            _id: populatedVisitor._id.toString(),
            name: populatedVisitor.name,
            email: populatedVisitor.email,
            phone: populatedVisitor.phone,
            company: populatedVisitor.company,
            age: populatedVisitor.age,
            city: populatedVisitor.city,
            state: populatedVisitor.state,
            country: populatedVisitor.country,
            pincode: populatedVisitor.pincode,
            source: populatedVisitor.source,
            location: populatedVisitor.location,
            qrCode: populatedVisitor.qrCode,
            eventId: populatedVisitor.eventId ? {
              _id: populatedVisitor.eventId._id.toString(),
              title: populatedVisitor.eventId.title,
              location: populatedVisitor.eventId.location,
              startDate: new Date(populatedVisitor.eventId.startDate).toISOString(),
              endDate: new Date(populatedVisitor.eventId.endDate).toISOString()
            } : null,
            eventName: populatedVisitor.eventName,
            eventLocation: populatedVisitor.eventLocation,
            eventStartDate: populatedVisitor.eventStartDate,
            eventEndDate: populatedVisitor.eventEndDate,
            eventStartTime: populatedVisitor.eventStartTime,
            eventEndTime: populatedVisitor.eventEndTime,
            status: populatedVisitor.status,
            scanTime: populatedVisitor.scanTime,
            checkInTime: new Date(populatedVisitor.checkInTime || populatedVisitor.createdAt).toISOString(),
            createdAt: new Date(populatedVisitor.createdAt).toISOString(),
            updatedAt: new Date(populatedVisitor.updatedAt).toISOString()
          };

          // Handle optional fields
          if (populatedVisitor.checkOutTime) {
            formattedVisitor.checkOutTime = new Date(populatedVisitor.checkOutTime).toISOString();
          }
          if (populatedVisitor.additionalData) {
            formattedVisitor.additionalData = populatedVisitor.additionalData as Record<string, { label: string; value: any }>;
            console.log(`Visitor ${formattedVisitor._id} additionalData:`, JSON.stringify(populatedVisitor.additionalData, null, 2));
          } else {
            formattedVisitor.additionalData = {};
            console.log(`Visitor ${formattedVisitor._id} has no additionalData`);
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