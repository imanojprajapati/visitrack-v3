import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Registration from '../../../models/Registration';
import Visitor from '../../../models/Visitor';
import Event from '../../../models/Event';
import BadgeTemplate from '../../../models/BadgeTemplate';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, eventId } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    await connectToDatabase();

    // Build query
    const query: any = {};
    if (eventId) {
      query.eventId = eventId;
    }

    // Find visitor by email
    const visitor: any = await Visitor.findOne({
      email: { $regex: new RegExp(email, 'i') }, // Case-insensitive search
      ...query
    }).lean();

    if (!visitor) {
      return res.status(404).json({ 
        message: 'No registration found with this email address',
        found: false
      });
    }

    // Get event details
    const event: any = await Event.findById(visitor.eventId).lean();
    if (!event) {
      return res.status(404).json({ 
        message: 'Event not found',
        found: false
      });
    }

    // Get registration details
    const registration: any = await Registration.findById(visitor.registrationId).lean();

    // Check if badge template exists for this event
    const badgeTemplate: any = await BadgeTemplate.findOne({ eventId: visitor.eventId }).lean();

    // Prepare response data
    const responseData = {
      found: true,
      visitor: {
        _id: visitor._id,
        name: visitor.name,
        email: visitor.email,
        phone: visitor.phone,
        status: visitor.status,
        registrationId: visitor.registrationId,
      },
      event: {
        _id: event._id,
        title: event.title,
        description: event.description,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status,
        organizer: event.organizer,
      },
      registration: registration ? {
        _id: registration._id,
        submittedAt: registration.submittedAt,
        status: registration.status,
        formData: registration.formData,
      } : null,
      badgeAvailable: !!badgeTemplate,
      badgeTemplateId: badgeTemplate?._id,
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error finding registration by email:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 