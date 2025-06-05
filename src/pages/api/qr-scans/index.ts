import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import QRScan from '../../../models/QRScan';
import { handleApiError, ApiError } from '../../../utils/api-error';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await connectToDatabase();

    if (req.method !== 'GET') {
      throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }

    const { eventId, startDate, endDate } = req.query;
    const query: any = {};

    // Add filters
    if (eventId) {
      if (!mongoose.Types.ObjectId.isValid(eventId as string)) {
        throw new ApiError(400, 'Invalid event ID format');
      }
      query.eventId = new mongoose.Types.ObjectId(eventId as string);
    }

    if (startDate) {
      const start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ApiError(400, 'Invalid start date format');
      }
      query.scanTime = { $gte: start };
    }

    if (endDate) {
      const end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ApiError(400, 'Invalid end date format');
      }
      if (!query.scanTime) query.scanTime = {};
      query.scanTime.$lte = end;
    }

    // Fetch QR scans with populated visitor and event data
    const scans = await QRScan.find(query)
      .populate('visitorId', 'name email phone company')
      .populate('eventId', 'title location startDate endDate')
      .sort({ scanTime: -1 })
      .lean();

    // Format the response
    const formattedScans = scans.map(scan => {
      const visitor = scan.visitorId as any;
      const event = scan.eventId as any;

      return {
        _id: scan._id,
        visitorId: scan.visitorId,
        eventId: scan.eventId,
        registrationId: scan.registrationId,
        name: visitor?.name || scan.name,
        company: visitor?.company || scan.company,
        eventName: event?.title || scan.eventName,
        scanTime: scan.scanTime,
        entryType: scan.entryType,
        status: scan.status,
        deviceInfo: scan.deviceInfo
      };
    });

    return res.status(200).json(formattedScans);
  } catch (error) {
    handleApiError(error, res);
  }
} 