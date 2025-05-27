import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Registration from '../../../models/Registration';
import Event, { IEvent } from '../../../models/Event';
import Visitor from '../../../models/Visitor';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

interface RegistrationField {
  label: string;
  value: any;
}

interface RegistrationData {
  [key: string]: RegistrationField;
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
        const getVisitorName = (data: any): string => {
          if (!data || typeof data !== 'object') return 'Unknown';
          
          try {
            // Try to find name in formData
            const formData = data.formData || data;
            if (!formData || typeof formData !== 'object') return 'Unknown';

            // Look for name field in various formats
            const nameField = Object.values(formData).find((field: any) => {
              if (!field || typeof field !== 'object') return false;
              const label = String(field.label || '').toLowerCase();
              return label.includes('name') || label.includes('full name') || label.includes('visitor name');
            });

            return nameField ? String(nameField.value || 'Unknown') : 'Unknown';
          } catch (error) {
            console.error('Error extracting visitor name:', error);
            return 'Unknown';
          }
        };

        // Combine registration and event data
        const visitors = registrations.map(registration => {
          try {
            const event = eventMap[registration.eventId.toString()];
            return {
              ...registration,
              name: getVisitorName(registration),
              event: event ? {
                title: event.title,
                location: event.location,
                startDate: event.startDate,
                endDate: event.endDate,
              } : null
            };
          } catch (error) {
            console.error('Error processing registration:', error);
            return {
              ...registration,
              name: 'Unknown',
              event: null
            };
          }
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

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // Verify that the event exists and get current count
          const eventDoc = await Event.findById(newEventId).session(session);
          if (!eventDoc) {
            throw new Error('Event not found');
          }

          // Check if event is at capacity
          if (eventDoc.visitors >= eventDoc.capacity) {
            throw new Error(`Event is at full capacity (${eventDoc.capacity} registrations)`);
          }

          // Create the registration
          const registration = await Registration.create([{
            eventId: newEventId,
            formId: newFormId,
            formData: data,
            status: 'registered',
            submittedAt: new Date(),
          }], { session });

          // Extract visitor data from registration
          const registrationData = data as RegistrationData;
          
          // Helper function to get field value with flexible label matching
          const getFieldValue = (primaryLabel: string, alternativeLabels: string[] = []): string => {
            const labels = [primaryLabel, ...alternativeLabels];
            const field = Object.values(registrationData).find(f => 
              labels.some(label => f.label.toLowerCase().includes(label.toLowerCase()))
            );
            return field ? String(field.value || '') : '';
          };

          // Create visitor record with more flexible data extraction
          const visitorData = {
            registrationId: registration[0]._id,
            eventId: newEventId,
            formId: newFormId,
            name: getFieldValue('Name', ['Full Name', 'Visitor Name', 'First Name', 'Last Name']),
            email: getFieldValue('Email', ['Email ID', 'Enter a Email', 'Email Address', 'E-mail']),
            phone: getFieldValue('Phone', ['Phone No', 'Phone Number', 'Mobile Number', 'Contact Number']),
            age: Number(getFieldValue('Age', ['Visitor Age', 'Age Group'])) || 0,
            eventName: eventDoc.title,
            eventLocation: eventDoc.location,
            eventStartDate: eventDoc.startDate,
            eventEndDate: eventDoc.endDate,
            status: 'registered',
            additionalData: registrationData,
          };

          // More flexible validation - only require at least one contact method
          const hasContactInfo = visitorData.email || visitorData.phone;
          if (!visitorData.name || !hasContactInfo) {
            throw new Error('Please provide at least a name and either an email or phone number');
          }

          // Create visitor record
          const visitor = await Visitor.create([visitorData], { session });

          // Update event's visitor count using atomic operation
          const updatedEvent = await Event.findByIdAndUpdate(
            newEventId,
            { $inc: { visitors: 1 } },
            { new: true, session }
          ).lean();

          if (!updatedEvent) {
            throw new Error('Failed to update event visitor count');
          }

          // Commit the transaction
          await session.commitTransaction();

          // Return the updated event data along with registration info
          res.status(201).json({
            success: true,
            registration: registration[0],
            visitor: visitor[0],
            event: updatedEvent,
            message: 'Registration submitted successfully'
          });
        } catch (error: any) {
          // If an error occurred, abort the transaction
          await session.abortTransaction();
          throw error;
        } finally {
          // End the session
          session.endSession();
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