import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor, { IVisitor } from '../../../models/Visitor';
import Event, { IEvent } from '../../../models/Event';
import mongoose from 'mongoose';
import { handleApiError, ApiError, isDatabaseError } from '../../../utils/api-error';

interface ScanEntryRequest {
  visitorId: string;
  deviceInfo?: string;
  entryType?: 'QR' | 'Manual';
}

interface ScanEntryResponse {
  success: boolean;
  message: string;
  visitor?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    eventName: string;
    eventLocation: string;
    eventStartDate: string;
    eventEndDate: string;
    eventStartTime: string;
    eventEndTime: string;
    status: string;
    checkInTime: string;
    additionalData?: Record<string, any>;
  };
  scanRecord?: {
    _id: string;
    visitorId: string;
    eventId: string;
    name: string;
    company: string;
    eventName: string;
    scanTime: string;
    entryType: string;
    status: string;
    deviceInfo: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScanEntryResponse>
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
      case 'POST':
        try {
          const { visitorId, deviceInfo = 'Electron App', entryType = 'QR' }: ScanEntryRequest = req.body;

          // Validate required fields
          if (!visitorId) {
            throw new ApiError(400, 'Missing required field: visitorId');
          }

          // Validate visitorId format (MongoDB ObjectId)
          if (!mongoose.Types.ObjectId.isValid(visitorId)) {
            throw new ApiError(400, 'Invalid visitor ID format');
          }

          console.log(`Processing scan entry for visitor: ${visitorId}`);

          // Find visitor by ID
          const visitor = await Visitor.findById(visitorId)
            .populate<{ eventId: IEvent }>('eventId', 'title location startDate endDate time endTime')
            .lean()
            .exec();

          if (!visitor) {
            throw new ApiError(404, 'Visitor not found');
          }

          console.log(`Found visitor: ${visitor.name} for event: ${visitor.eventName}`);

          // Check if visitor is already checked in
          if (visitor.status === 'Visited' || visitor.status === 'checked_in') {
            return res.status(200).json({
              success: false,
              message: 'Visitor is already checked in',
              visitor: {
                _id: visitor._id.toString(),
                name: visitor.name,
                email: visitor.email,
                phone: visitor.phone,
                company: visitor.company,
                eventName: visitor.eventName,
                eventLocation: visitor.eventLocation,
                eventStartDate: visitor.eventStartDate,
                eventEndDate: visitor.eventEndDate,
                eventStartTime: visitor.eventStartTime,
                eventEndTime: visitor.eventEndTime,
                status: visitor.status,
                checkInTime: visitor.checkInTime || '',
                additionalData: visitor.additionalData
              }
            });
          }

          // Update visitor status to checked in
          const now = new Date();
          const checkInTime = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getFullYear() % 100).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

          const updatedVisitor = await Visitor.findByIdAndUpdate(
            visitorId,
            {
              status: 'Visited',
              checkInTime: checkInTime,
              scanTime: now,
              updatedAt: checkInTime
            },
            { new: true }
          ).populate<{ eventId: IEvent }>('eventId', 'title location startDate endDate time endTime');

          if (!updatedVisitor) {
            throw new ApiError(500, 'Failed to update visitor status');
          }

          console.log(`Updated visitor status to Visited: ${updatedVisitor.name}`);

          // Create scan record in qrscans collection
          const { db } = await connectToDatabase();
          const scanRecord = {
            visitorId: visitorId,
            eventId: visitor.eventId.toString(),
            registrationId: visitor.registrationId.toString(),
            name: visitor.name,
            company: visitor.company,
            eventName: visitor.eventName,
            scanTime: now,
            entryType: entryType,
            status: 'Visited',
            deviceInfo: deviceInfo,
            createdAt: now,
            updatedAt: now
          };

          const scanResult = await db.collection('qrscans').insertOne(scanRecord);

          if (!scanResult.acknowledged) {
            console.warn('Failed to create scan record, but visitor was updated');
          }

          console.log(`Created scan record: ${scanResult.insertedId}`);

          // Return success response with visitor details
          return res.status(200).json({
            success: true,
            message: 'Visitor checked in successfully',
            visitor: {
              _id: String((updatedVisitor as any)._id || visitorId),
              name: updatedVisitor.name,
              email: updatedVisitor.email,
              phone: updatedVisitor.phone,
              company: updatedVisitor.company,
              eventName: updatedVisitor.eventName,
              eventLocation: updatedVisitor.eventLocation,
              eventStartDate: updatedVisitor.eventStartDate,
              eventEndDate: updatedVisitor.eventEndDate,
              eventStartTime: updatedVisitor.eventStartTime,
              eventEndTime: updatedVisitor.eventEndTime,
              status: updatedVisitor.status,
              checkInTime: updatedVisitor.checkInTime || '',
              additionalData: updatedVisitor.additionalData
            },
            scanRecord: {
              _id: scanResult.insertedId.toString(),
              visitorId: scanRecord.visitorId,
              eventId: scanRecord.eventId,
              name: scanRecord.name,
              company: scanRecord.company,
              eventName: scanRecord.eventName,
              scanTime: scanRecord.scanTime.toISOString(),
              entryType: scanRecord.entryType,
              status: scanRecord.status,
              deviceInfo: scanRecord.deviceInfo
            }
          });

        } catch (error) {
          if (error instanceof ApiError) {
            throw error;
          }
          if (isDatabaseError(error)) {
            throw new ApiError(503, 'Database error while processing scan entry', error);
          }
          throw new ApiError(500, 'Error processing scan entry', error);
        }

      default:
        throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleApiError(error, res);
  }
} 