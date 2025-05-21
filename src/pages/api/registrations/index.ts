import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import Registration from '../../../models/Registration';
import Event, { IEvent } from '../../../models/Event';
import Visitor from '../../../models/Visitor';

interface RegistrationData {
  [key: string]: {
    label: string;
    value: string | number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  try {
    switch (req.method) {
      case 'GET':
        // Get query parameters for filtering
        const { eventId, formId } = req.query;

        // Build the query
        const query: any = {};
        if (eventId) query.eventId = eventId;
        if (formId) query.formId = formId;

        // Fetch registrations with event details
        const registrations = await Registration.find(query).lean();
        
        // Get all unique event IDs from registrations
        const eventIds = Array.from(new Set(registrations.map(reg => reg.eventId.toString())));
        
        // Fetch all related events
        const events = await Event.find({ _id: { $in: eventIds } }).lean();
        
        // Create a map of events for easy lookup
        const eventMap = events.reduce((map: Record<string, IEvent>, event: IEvent) => {
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
          return {
            ...registration,
            name: getVisitorName(registrationData),
            event: eventMap[registration.eventId.toString()] ? {
              title: eventMap[registration.eventId.toString()].title,
              location: eventMap[registration.eventId.toString()].location,
              startDate: eventMap[registration.eventId.toString()].startDate,
              endDate: eventMap[registration.eventId.toString()].endDate,
            } : null
          };
        });

        res.status(200).json(visitors);
        break;

      case 'POST':
        const { eventId: newEventId, formId: newFormId, data } = req.body;

        if (!newEventId || !newFormId || !data) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify that the event exists
        const event = await Event.findById(newEventId).lean() as IEvent;
        if (!event) {
          return res.status(404).json({ error: 'Event not found' });
        }

        // Create the registration
        const registration = await Registration.create({
          eventId: newEventId,
          formId: newFormId,
          data,
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

        // Validate required fields
        const requiredFields = ['name', 'email', 'phone'];
        const missingFields = requiredFields.filter(field => !visitorData[field]);

        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        await Visitor.create(visitorData);

        res.status(201).json(registration);
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error handling registrations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 