import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import BadgeTemplate from '@/models/BadgeTemplate';
import { uploadToCloudinary, deleteFromCloudinary } from '../../../lib/cloudinary';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { templateId } = req.query;

  if (!templateId || typeof templateId !== 'string') {
    return res.status(400).json({ message: 'Invalid template ID' });
  }

  try {
    await connectToDatabase();

    switch (req.method) {
      case 'GET':
        const template = await BadgeTemplate.findById(templateId);
        if (!template) {
          return res.status(404).json({ message: 'Template not found' });
        }
        return res.status(200).json(template);

      case 'PUT':
        const updatedTemplate = await BadgeTemplate.findByIdAndUpdate(
          templateId,
          req.body,
          { new: true }
        );
        if (!updatedTemplate) {
          return res.status(404).json({ message: 'Template not found' });
        }
        return res.status(200).json(updatedTemplate);

      case 'DELETE':
        const deletedTemplate = await BadgeTemplate.findByIdAndDelete(templateId);
        if (!deletedTemplate) {
          return res.status(404).json({ message: 'Template not found' });
        }
        return res.status(200).json({ message: 'Template deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Error handling template request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 