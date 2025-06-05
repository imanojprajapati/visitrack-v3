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
        const { status } = req.query;
        const query: any = {};

        // Handle status filter
        if (status === 'upcoming') {
          query.startDate = { $gte: new Date() };
          query.status = { $in: ['published', 'upcoming'] };
        } else if (status) {
          query.status = status;
        }

        const events = await Event.find(query)
          .sort({ startDate: 1 })
          .lean();

        return res.status(200).json(events);

      case 'POST':
        const eventData = req.body;

        // Convert date strings to Date objects
        if (eventData.startDate) eventData.startDate = new Date(eventData.startDate);
        if (eventData.endDate) eventData.endDate = new Date(eventData.endDate);
        if (eventData.registrationDeadline) eventData.registrationDeadline = new Date(eventData.registrationDeadline);

        // Create new event
        const newEvent = await Event.create({
          ...eventData,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        return res.status(201).json(newEvent);

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling event request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}