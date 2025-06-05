import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import Event from '../../../models/Event';
import { handleApiError, ApiError } from '../../../utils/api-error';
import mongoose from 'mongoose';

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
    await connectToDatabase();

    if (req.method !== 'GET') {
      throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }

    const { eventId, status, startDate, endDate } = req.query;
    const query: any = {};

    // Add filters
    if (eventId) {
      if (!mongoose.Types.ObjectId.isValid(eventId as string)) {
        throw new ApiError(400, 'Invalid event ID format');
      }
      query.eventId = new mongoose.Types.ObjectId(eventId as string);
    }

    if (status) {
      query.status = status;
    }

    if (startDate) {
      const start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ApiError(400, 'Invalid start date format');
      }
      query.createdAt = { $gte: start };
    }

    if (endDate) {
      const end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ApiError(400, 'Invalid end date format');
      }
      if (!query.createdAt) query.createdAt = {};
      query.createdAt.$lte = end;
    }

    // Fetch visitors with populated event data
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
        city: additionalData.city?.value || '',
        state: additionalData.state?.value || '',
        country: additionalData.country?.value || '',
        pincode: additionalData.pincode?.value || '',
        source: additionalData.source?.value || 'Website',
        eventName: event?.title || 'Unknown Event',
        eventLocation: event?.location || 'Unknown Location',
        eventStartDate: event?.startDate || '',
        eventEndDate: event?.endDate || '',
        status: visitor.status,
        createdAt: visitor.createdAt,
        additionalData: visitor.additionalData,
      };
    });

    return res.status(200).json(formattedVisitors);
  } catch (error) {
    handleApiError(error, res);
  }
} 