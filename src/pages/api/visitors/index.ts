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
  eventId: FormattedEvent | null;
  eventName: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate: string;
  status: VisitorStatus;
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
                    eventId: visitor.eventId ? {
                      _id: visitor.eventId._id.toString(),
                      title: visitor.eventId.title,
                      location: visitor.eventId.location,
                      startDate: formatDateToDDMMYYYY(parseDateString(visitor.eventId.startDate)),
                      endDate: formatDateToDDMMYYYY(parseDateString(visitor.eventId.endDate))
                    } : null,
                    eventName: visitor.eventId?.title || '',
                    eventLocation: visitor.eventId?.location || '',
                    eventStartDate: visitor.eventId?.startDate ? formatDateToDDMMYYYY(parseDateString(visitor.eventId.startDate)) : '',
                    eventEndDate: visitor.eventId?.endDate ? formatDateToDDMMYYYY(parseDateString(visitor.eventId.endDate)) : '',
                    status: visitor.status,
                    checkInTime: (() => {
                      const parsed = parseDateString(visitor.checkInTime || visitor.createdAt);
                      return parsed instanceof Date ? parsed.toISOString() : new Date(parsed).toISOString();
                    })(),
                    createdAt: (() => {
                      const parsed = parseDateString(visitor.createdAt);
                      return parsed instanceof Date ? parsed.toISOString() : new Date(parsed).toISOString();
                    })(),
                    updatedAt: (() => {
                      const parsed = parseDateString(visitor.updatedAt);
                      return parsed instanceof Date ? parsed.toISOString() : new Date(parsed).toISOString();
                    })(),
                    additionalData: {}
                  };

                  // Handle optional fields
                  if (visitor.checkOutTime) {
                    const parsed = parseDateString(visitor.checkOutTime);
                    formatted.checkOutTime = parsed instanceof Date ? parsed.toISOString() : new Date(parsed).toISOString();
                  }
                  
                  // Convert additionalData to the format expected by frontend
                  if (visitor.additionalData) {
                    formatted.additionalData = visitor.additionalData as Record<string, { label: string; value: any }>;
                  } else {
                    formatted.additionalData = {};
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
                ...populatedVisitor,
                _id: populatedVisitor._id.toString(),
                eventId: populatedVisitor.eventId ? {
                  _id: populatedVisitor.eventId._id.toString(),
                  title: populatedVisitor.eventId.title,
                  location: populatedVisitor.eventId.location,
                  startDate: formatDateToDDMMYYYY(parseDateString(populatedVisitor.eventId.startDate)),
                  endDate: formatDateToDDMMYYYY(parseDateString(populatedVisitor.eventId.endDate))
                } : null,
                eventName: populatedVisitor.eventName,
                eventLocation: populatedVisitor.eventLocation,
                eventStartDate: formatDateToDDMMYYYY(parseDateString(populatedVisitor.eventStartDate)),
                eventEndDate: formatDateToDDMMYYYY(parseDateString(populatedVisitor.eventEndDate)),
                checkInTime: (() => {
                  const parsed = parseDateString(populatedVisitor.checkInTime || populatedVisitor.createdAt);
                  return parsed instanceof Date ? parsed.toISOString() : new Date(parsed).toISOString();
                })(),
                createdAt: (() => {
                  const parsed = parseDateString(populatedVisitor.createdAt);
                  return parsed instanceof Date ? parsed.toISOString() : new Date(parsed).toISOString();
                })(),
                updatedAt: (() => {
                  const parsed = parseDateString(populatedVisitor.updatedAt);
                  return parsed instanceof Date ? parsed.toISOString() : new Date(parsed).toISOString();
                })(),
                additionalData: {}
              };

              // Handle optional fields
              if (populatedVisitor.checkOutTime) {
                const parsed = parseDateString(populatedVisitor.checkOutTime);
                formatted.checkOutTime = parsed instanceof Date ? parsed.toISOString() : new Date(parsed).toISOString();
              }
              if (populatedVisitor.additionalData) {
                formatted.additionalData = populatedVisitor.additionalData as Record<string, { label: string; value: any }>;
              } else {
                formatted.additionalData = {};
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
              startDate: formatDateToDDMMYYYY(parseDateString(populatedVisitor.eventId.startDate)),
              endDate: formatDateToDDMMYYYY(parseDateString(populatedVisitor.eventId.endDate))
            } : null,
            eventName: populatedVisitor.eventName,
            eventLocation: populatedVisitor.eventLocation,
            eventStartDate: formatDateToDDMMYYYY(parseDateString(populatedVisitor.eventStartDate)),
            eventEndDate: formatDateToDDMMYYYY(parseDateString(populatedVisitor.eventEndDate)),
            checkInTime: (() => {
              const parsed = parseDateString(populatedVisitor.checkInTime || populatedVisitor.createdAt);
              return parsed instanceof Date ? parsed.toISOString() : new Date(parsed).toISOString();
            })(),
            createdAt: (() => {
              const parsed = parseDateString(populatedVisitor.createdAt);
              return parsed instanceof Date ? parsed.toISOString() : new Date(parsed).toISOString();
            })(),
            updatedAt: (() => {
              const parsed = parseDateString(populatedVisitor.updatedAt);
              return parsed instanceof Date ? parsed.toISOString() : new Date(parsed).toISOString();
            })(),
            additionalData: {}
          };

          // Handle optional fields
          if (populatedVisitor.checkOutTime) {
            const parsed = parseDateString(populatedVisitor.checkOutTime);
            formattedVisitor.checkOutTime = parsed instanceof Date ? parsed.toISOString() : new Date(parsed).toISOString();
          }
          if (populatedVisitor.additionalData) {
            formattedVisitor.additionalData = populatedVisitor.additionalData as Record<string, { label: string; value: any }>;
          } else {
            formattedVisitor.additionalData = {};
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

// Helper function to parse DD-MM-YY or DD-MM-YYYY format to Date object or return string as-is
const parseDateString = (dateStr: string): Date | string => {
  if (!dateStr) return new Date();
  
  // Debug: Log the input date string
  console.log('parseDateString input:', dateStr, 'type:', typeof dateStr);
  
  // Check if it's in DD-MM-YYYY format first - return as-is to avoid timezone issues
  const ddMMYYYYRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/;
  if (ddMMYYYYRegex.test(dateStr)) {
    // For DD-MM-YYYY, return the string as-is to avoid timezone conversion
    console.log(`parseDateString: DD-MM-YYYY format - returning as-is: ${dateStr}`);
    return dateStr;
  }
  
  // Check if it's in DD-MM-YY format - convert to DD-MM-YYYY as string
  const ddMMYYRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{2}$/;
  if (ddMMYYRegex.test(dateStr)) {
    const parts = dateStr.split('-');
    const day = parts[0];
    const month = parts[1];
    const yearStr = parts[2];
    
    // Convert 2-digit year to 4-digit year
    const yearNum = parseInt(yearStr, 10);
    const year = yearNum < 50 ? '20' + yearStr : '19' + yearStr;
    
    const convertedDate = `${day}-${month}-${year}`;
    console.log(`parseDateString: DD-MM-YY format - ${dateStr} -> ${convertedDate}`);
    return convertedDate;
  }
  
  // Check if it's already in ISO format
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    console.log('parseDateString: ISO format detected, returning:', isoDate.toISOString());
    return isoDate;
  }
  
  console.log('parseDateString: No valid format detected, returning current date');
  return new Date();
};

// Helper function to format date to DD-MM-YYYY format
const formatDateToDDMMYYYY = (date: Date | string): string => {
  // If it's already a string in DD-MM-YYYY format, return it
  if (typeof date === 'string' && /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/.test(date)) {
    return date;
  }
  
  // If it's a Date object, format it
  if (date instanceof Date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return `${day}-${month}-${year}`;
  }
  
  // If it's a string but not in DD-MM-YYYY format, try to parse it
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      const day = parsedDate.getDate().toString().padStart(2, '0');
      const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = parsedDate.getFullYear().toString();
      return `${day}-${month}-${year}`;
    }
  }
  
  // Fallback
  return '';
}; 