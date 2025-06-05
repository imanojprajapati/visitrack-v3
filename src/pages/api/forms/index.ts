import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Form from '../../../models/Form';
import Event from '../../../models/Event';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await connectToDatabase();

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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { eventId, title, fields } = req.body;

      // Validate required fields
      if (!eventId || !title || !fields || !Array.isArray(fields)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate eventId format
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID format' });
      }

      // Check if event exists
      const event = await Event.findById(eventId).session(session);
      if (!event) {
        await session.abortTransaction();
        return res.status(404).json({ error: 'Event not found' });
      }

      // Create new form
      const form = await Form.create([{
        eventId,
        title,
        fields,
      }], { session });

      // Update event with form reference
      await Event.findByIdAndUpdate(
        eventId,
        { formId: form[0]._id },
        { session }
      );

      // Commit the transaction
      await session.commitTransaction();

      return res.status(201).json(form[0]);
    } catch (error) {
      await session.abortTransaction();
      console.error('Error creating form:', error);
      return res.status(500).json({ error: 'Failed to create form' });
    } finally {
      session.endSession();
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 