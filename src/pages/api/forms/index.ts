import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../lib/db';
import Form from '../../../models/Form';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const { eventId } = req.query;
      
      let query = {};
      if (eventId) {
        query = { eventId };
      }
      
      const forms = await Form.find(query).sort({ createdAt: -1 });
      return res.status(200).json(forms);
    } catch (error) {
      console.error('Error fetching forms:', error);
      return res.status(500).json({ error: 'Failed to fetch forms' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { eventId, title, fields } = req.body;

      // Validate required fields
      if (!eventId || !title || !fields || !Array.isArray(fields)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create new form
      const form = await Form.create({
        eventId,
        title,
        fields,
      });

      return res.status(201).json(form);
    } catch (error) {
      console.error('Error creating form:', error);
      return res.status(500).json({ error: 'Failed to create form' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 