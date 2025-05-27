import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Registration from '../../../models/Registration';
import Event, { IEvent } from '../../../models/Event';
import Visitor from '../../../models/Visitor';
import { Types } from 'mongoose';

interface RegistrationData {
  [key: string]: {
    label: string;
    value: string | number;
  };
}

type LeanEventDocument = {
  _id: Types.ObjectId;
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  status: string;
  __v: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Connect to database
    const conn = await connectToDatabase();
    if (!conn) {
      throw new Error('Failed to connect to database');
    }

    switch (req.method) {
      case 'GET':
        // Get query parameters for filtering
        const { eventId: queryEventId, formId: queryFormId } = req.query;

        // Build the query
        const query: any = {};
        if (queryEventId) query.eventId = queryEventId;
        if (queryFormId) query.formId = queryFormId;

        // Fetch registrations with event details
        const registrations = await Registration.find(query).lean();
        
        // Get all unique event IDs from registrations
        const eventIds = Array.from(new Set(registrations.map(reg => reg.eventId.toString())));
        
        // Fetch all related events
        const events = (await Event.find({ _id: { $in: eventIds } }).lean()) as unknown as LeanEventDocument[];
        
        // Create a map of events for easy lookup
        const eventMap = events.reduce((map: Record<string, LeanEventDocument>, event) => {
          map[event._id.toString()] = event;
          return map;
        }, {});

        // Helper function to get visitor name from registration data
        const getVisitorName = (data: RegistrationData): string => {
          const nameField = Object.values(data).find(field => field.label === 'Name');
          return nameField ? String(nameField.value) : 'Unknown';
        };

        // Combine registration and event data
        const visitors = registrations.map(registration => {
          const registrationData = registration.data as RegistrationData;
          const event = eventMap[registration.eventId.toString()];
          return {
            ...registration,
            name: getVisitorName(registrationData),
            event: event ? {
              title: event.title,
              location: event.location,
              startDate: event.startDate,
              endDate: event.endDate,
            } : null
          };
        });

        res.status(200).json(visitors);
        break;

      case 'POST':
        const { eventId: newEventId, formId: newFormId, data } = req.body;

        // Validate required fields
        if (!newEventId || !newFormId || !data) {
          console.error('Missing required fields:', { newEventId, newFormId, hasData: !!data });
          return res.status(400).json({ 
            error: 'Missing required fields',
            details: {
              eventId: !newEventId,
              formId: !newFormId,
              data: !data
            }
          });
        }

        // Validate data structure
        if (typeof data !== 'object' || Object.keys(data).length === 0) {
          console.error('Invalid data structure:', data);
          return res.status(400).json({ error: 'Invalid form data structure' });
        }

        // Verify that the event exists
        const event = await Event.findById(newEventId).lean() as IEvent;
        if (!event) {
          console.error('Event not found:', newEventId);
          return res.status(404).json({ error: 'Event not found' });
        }

        try {
          // Create the registration
          const registration = await Registration.create({
            eventId: newEventId,
            formId: newFormId,
            formData: data,
            status: 'registered',
            submittedAt: new Date(),
          });

          // Extract visitor data from registration
          const registrationData = data as Record<string, { label: string; value: any }>;
          
          // Helper function to get field value by label
          const getFieldValue = (label: string, possibleLabels: string[] = []): string => {
            // First try the exact label
            let field = Object.values(registrationData).find(f => f.label === label);
            
            // If not found and we have possible alternative labels, try those
            if (!field && possibleLabels.length > 0) {
              field = Object.values(registrationData).find(f => possibleLabels.includes(f.label));
            }
            
            // If still not found, try case-insensitive match
            if (!field) {
              field = Object.values(registrationData).find(f => 
                f.label.toLowerCase() === label.toLowerCase() ||
                possibleLabels.some(pl => pl.toLowerCase() === f.label.toLowerCase())
              );
            }
            
            return field ? String(field.value) : '';
          };

          // Create visitor record
          const visitorData = {
            registrationId: registration._id,
            eventId: newEventId,
            formId: newFormId,
            name: getFieldValue('Name', ['Full Name', 'Visitor Name']),
            email: getFieldValue('Email', ['Email ID', 'Enter a Email', 'Email Address']),
            phone: getFieldValue('Phone', ['Phone No', 'Phone Number', 'Mobile Number']),
            age: Number(getFieldValue('Age', ['Visitor Age'])) || 0,
            eventName: event.title,
            eventLocation: event.location,
            eventStartDate: event.startDate,
            eventEndDate: event.endDate,
            status: 'registered',
            additionalData: registrationData,
          };

          // Validate required visitor fields
          const requiredFields = ['name', 'email', 'phone'];
          const missingFields = requiredFields.filter(field => !visitorData[field as keyof typeof visitorData]);

          if (missingFields.length > 0) {
            console.error('Missing required visitor fields:', missingFields);
            // Delete the registration since we can't create a visitor
            await Registration.findByIdAndDelete(registration._id);
            return res.status(400).json({ 
              error: 'Missing required visitor information',
              missingFields
            });
          }

          await Visitor.create(visitorData);

          res.status(201).json({
            success: true,
            registration,
            message: 'Registration submitted successfully'
          });
        } catch (error: any) {
          console.error('Error creating registration/visitor:', error);
          // If there's a validation error, return it with details
          if (error.name === 'ValidationError') {
            return res.status(400).json({
              error: 'Validation Error',
              details: Object.keys(error.errors).reduce((acc, key) => {
                acc[key] = error.errors[key].message;
                return acc;
              }, {} as Record<string, string>)
            });
          }
          throw error; // Re-throw other errors to be caught by outer try-catch
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error handling registrations:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 