import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../lib/db';
import Registration from '../../../models/Registration';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const { eventId, formId } = req.query;
      
      let query = {};
      if (eventId) {
        query = { ...query, eventId };
      }
      if (formId) {
        query = { ...query, formId };
      }
      
      const registrations = await Registration.find(query).sort({ submittedAt: -1 });
      return res.status(200).json(registrations);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      return res.status(500).json({ error: 'Failed to fetch registrations' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { eventId, formId, data } = req.body;

      // Validate required fields
      if (!eventId || !formId || !data) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create new registration
      const registration = await Registration.create({
        eventId,
        formId,
        data,
      });

      return res.status(201).json(registration);
    } catch (error) {
      console.error('Error creating registration:', error);
      return res.status(500).json({ error: 'Failed to create registration' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 