import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Form from '../../../models/Form';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { formId } = req.query;

  if (!formId || typeof formId !== 'string') {
    return res.status(400).json({ error: 'Invalid form ID' });
  }

  // Connect to database
  await connectToDatabase();

  // Validate MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(formId)) {
    return res.status(400).json({ error: 'Invalid form ID format' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const form = await Form.findById(formId).lean();
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
        if (!eventId || !title || !Array.isArray(fields)) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate eventId format
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
          return res.status(400).json({ error: 'Invalid event ID format' });
        }

        // Update form
        const updatedForm = await Form.findByIdAndUpdate(
          formId,
          { 
            eventId: new mongoose.Types.ObjectId(eventId),
            title,
            fields,
            updatedAt: new Date()
          },
          { new: true, runValidators: true }
        ).lean();

        if (!updatedForm) {
          return res.status(404).json({ error: 'Form not found' });
        }

        return res.status(200).json(updatedForm);
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