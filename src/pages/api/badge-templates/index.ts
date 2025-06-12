import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import BadgeTemplate from '../../../models/BadgeTemplate';
import { handleApiError, ApiError, validateMongoId } from '../../../utils/api-error';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await connectToDatabase();

    switch (req.method) {
      case 'GET':
        const { eventId } = req.query;
        
        if (eventId) {
          validateMongoId(eventId as string, 'Event ID');
        }
        
        const query = eventId ? { eventId: new mongoose.Types.ObjectId(eventId as string) } : {};
        const templates = await BadgeTemplate.find(query)
          .sort({ createdAt: -1 })
          .lean();

        return res.status(200).json(templates);

      case 'POST':
        const templateData = { ...req.body };
        console.log('Received template data:', templateData);

        if (!templateData.eventId) {
          throw new ApiError(400, 'Event ID is required');
        }

        validateMongoId(templateData.eventId, 'Event ID');

        try {
          // Convert eventId to ObjectId
          templateData.eventId = new mongoose.Types.ObjectId(templateData.eventId);
          console.log('Processed template data:', templateData);

          // Check if a badge template already exists for this event
          const existingTemplate = await BadgeTemplate.findOne({ eventId: templateData.eventId });
          if (existingTemplate) {
            throw new ApiError(409, 'A badge template already exists for this event. You can only create one badge template per event.');
          }

          const template = await BadgeTemplate.create(templateData);
          console.log('Created template:', template);
          return res.status(201).json(template);
        } catch (error) {
          console.error('Error creating template:', error);
          throw error;
        }

      case 'DELETE':
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'Template ID is required' });
        }

        const templateToDelete = await BadgeTemplate.findById(id);
        if (!templateToDelete) {
          return res.status(404).json({ error: 'Template not found' });
        }

        // Delete the template
        await BadgeTemplate.findByIdAndDelete(id);
        res.status(200).json({ message: 'Template deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleApiError(error, res);
  }
} 