import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Form from '../../../models/Form';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await connectToDatabase();
  const { formId } = req.query;

  if (!formId || typeof formId !== 'string') {
    return res.status(400).json({ error: 'Invalid form ID' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const form = await Form.findById(formId);
        if (!form) {
          return res.status(404).json({ error: 'Form not found' });
        }
        return res.status(200).json(form);
      } catch (error) {
        console.error('Error fetching form:', error);
        return res.status(500).json({ error: 'Failed to fetch form' });
      }

    case 'PUT':
      try {
        const { eventId, title, fields } = req.body;

        // Validate required fields
        if (!eventId || !title || !fields || !Array.isArray(fields)) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const form = await Form.findByIdAndUpdate(
          formId,
          { eventId, title, fields },
          { new: true, runValidators: true }
        );

        if (!form) {
          return res.status(404).json({ error: 'Form not found' });
        }

        return res.status(200).json(form);
      } catch (error) {
        console.error('Error updating form:', error);
        return res.status(500).json({ error: 'Failed to update form' });
      }

    case 'DELETE':
      try {
        const form = await Form.findByIdAndDelete(formId);
        if (!form) {
          return res.status(404).json({ error: 'Form not found' });
        }
        return res.status(200).json({ message: 'Form deleted successfully' });
      } catch (error) {
        console.error('Error deleting form:', error);
        return res.status(500).json({ error: 'Failed to delete form' });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
} 