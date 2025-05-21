import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Registration from '../../../models/Registration';
import Event from '../../../models/Event';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { registrationId } = req.query;

  try {
    await connectToDatabase();
    const registration = await Registration.findById(registrationId)
      .populate('eventId', 'title location startDate endDate')
      .populate('formId', 'title fields');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    res.status(200).json(registration);
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 