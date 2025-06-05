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
    if (req.method !== 'GET') {
      throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }

    // Connect to database with retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        await connectToDatabase();
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new ApiError(503, 'Database connection failed after multiple attempts');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
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
      .lean()
      .exec();

    if (!scans || scans.length === 0) {
      return res.status(200).json({
        message: 'No QR scans found',
        scans: []
      });
    }

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

    return res.status(200).json({
      message: 'QR scans retrieved successfully',
      count: formattedScans.length,
      scans: formattedScans
    });
  } catch (error) {
    handleApiError(error, res);
  }
}