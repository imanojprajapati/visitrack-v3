import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import Visitor from '../../../models/Visitor';
import Event, { IEvent } from '../../../models/Event';
import Registration from '../../../models/Registration';
import mongoose from 'mongoose';

interface RegistrationData {
  [key: string]: {
    label: string;
    value: any;
  };
}

interface IRegistration extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  formId: mongoose.Types.ObjectId;
  data: RegistrationData;
  status: string;
  submittedAt: Date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();

  try {
    const {
      name,
      email,
      phone,
      company,
      city,
      state,
      country,
      pincode,
      source,
      eventId,
      startDate,
      endDate,
    } = req.query;

    // Build the query
    const query: any = {};

    // Add filters if they exist
    if (eventId) query.eventId = eventId;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    // Add text search filters
    if (name) query.name = { $regex: name, $options: 'i' };
    if (email) query.email = { $regex: email, $options: 'i' };
    if (phone) query.phone = { $regex: phone, $options: 'i' };
    if (company) query['additionalData.company'] = { $regex: company, $options: 'i' };
    if (city) query['additionalData.city'] = { $regex: city, $options: 'i' };
    if (state) query['additionalData.state'] = { $regex: state, $options: 'i' };
    if (country) query['additionalData.country'] = { $regex: country, $options: 'i' };
    if (pincode) query['additionalData.pincode'] = { $regex: pincode, $options: 'i' };
    if (source) query['additionalData.source'] = { $regex: source, $options: 'i' };

    // Fetch visitors with event details
    const visitors = await Visitor.find(query)
      .populate('eventId', 'title location startDate endDate')
      .sort({ createdAt: -1 })
      .lean();

    // Format the response
    const formattedVisitors = visitors.map(visitor => {
      const event = visitor.eventId as any;
      const additionalData = visitor.additionalData || {};

      return {
        _id: visitor._id,
        name: visitor.name,
        email: visitor.email,
        phone: visitor.phone,
        company: additionalData.company?.value || '',
        city: additionalData.city || '',
        state: additionalData.state || '',
        country: additionalData.country || '',
        pincode: additionalData.pincode || '',
        source: additionalData.source || 'Website',
        eventName: event?.title || 'Unknown Event',
        eventLocation: event?.location || 'Unknown Location',
        eventStartDate: event?.startDate || '',
        eventEndDate: event?.endDate || '',
        status: visitor.status,
        createdAt: visitor.createdAt,
        additionalData: visitor.additionalData,
      };
    });

    res.status(200).json(formattedVisitors);
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({ error: 'Failed to fetch visitors' });
  }
} 