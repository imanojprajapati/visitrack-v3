import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Event from '../../../models/Event';
import mongoose from 'mongoose';
import { handleApiError, ApiError } from '../../../utils/api-error';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await connectToDatabase();

    switch (req.method) {
      case 'GET':
        try {
          const { status, category } = req.query;
          const query: any = {};

          // Add filters if provided
          if (status) query.status = status;
          if (category) query.category = category;

          const events = await Event.find(query)
            .sort({ startDate: 1 })
            .lean();

          return res.status(200).json(events);
        } catch (error) {
          throw new ApiError(500, 'Failed to fetch events', error);
        }

      case 'POST':
        try {
          const eventData = req.body;

          // Validate required fields
          if (!eventData.title) {
            throw new ApiError(400, 'Event title is required');
          }
          if (!eventData.location) {
            throw new ApiError(400, 'Event location is required');
          }
          if (!eventData.startDate) {
            throw new ApiError(400, 'Event start date is required');
          }

          // Parse dates
          const startDate = new Date(eventData.startDate);
          const endDate = eventData.endDate ? new Date(eventData.endDate) : startDate;

          if (isNaN(startDate.getTime())) {
            throw new ApiError(400, 'Invalid start date format');
          }
          if (isNaN(endDate.getTime())) {
            throw new ApiError(400, 'Invalid end date format');
          }

          // Create new event
          const newEvent = {
            title: eventData.title,
            description: eventData.description || '',
            location: eventData.location,
            venue: eventData.venue || eventData.location,
            startDate: startDate,
            endDate: endDate,
            time: eventData.time,
            endTime: eventData.endTime,
            category: eventData.category || 'General',
            organizer: eventData.organizer || 'Admin',
            status: eventData.status || 'draft',
            capacity: eventData.capacity || 100,
            banner: eventData.banner || '',
            registrationDeadline: eventData.registrationDeadline ? new Date(eventData.registrationDeadline) : undefined,
            formId: eventData.formId ? new mongoose.Types.ObjectId(eventData.formId) : undefined,
            visitors: 0
          };

          const event = await Event.create(newEvent);

          return res.status(201).json({
            success: true,
            message: 'Event created successfully',
            event: event
          });
        } catch (error) {
          if (error instanceof Error && error.name === 'ValidationError') {
            throw new ApiError(400, 'Invalid event data', error);
          }
          throw error;
        }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleApiError(error, res);
  }
}