import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import BadgeTemplate from '../../../models/BadgeTemplate';
import { uploadToCloudinary, deleteFromCloudinary } from '../../../lib/cloudinary';
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

        if (!templateData.eventId) {
          throw new ApiError(400, 'Event ID is required');
        }

        validateMongoId(templateData.eventId, 'Event ID');

        try {
          // Handle logo upload if provided
          if (templateData.logo?.enabled && templateData.logo?.imageData) {
            const logoResult = await uploadToCloudinary(templateData.logo.imageData, 'badge-templates/logos');
            if (!logoResult?.url) {
              throw new ApiError(500, 'Failed to upload logo');
            }
            templateData.logo.cloudinaryUrl = logoResult.url;
            templateData.logo.cloudinaryPublicId = logoResult.publicId;
            delete templateData.logo.imageData;
          }

          // Handle photo upload if provided
          if (templateData.photo?.enabled && templateData.photo?.imageData) {
            const photoResult = await uploadToCloudinary(templateData.photo.imageData, 'badge-templates/photos');
            if (!photoResult?.url) {
              throw new ApiError(500, 'Failed to upload photo');
            }
            templateData.photo.cloudinaryUrl = photoResult.url;
            templateData.photo.cloudinaryPublicId = photoResult.publicId;
            delete templateData.photo.imageData;
          }

          // Handle background upload if provided
          if (templateData.background?.imageData) {
            const bgResult = await uploadToCloudinary(templateData.background.imageData, 'badge-templates/backgrounds');
            if (!bgResult?.url) {
              throw new ApiError(500, 'Failed to upload background');
            }
            templateData.background = {
              cloudinaryUrl: bgResult.url,
              cloudinaryPublicId: bgResult.publicId
            };
          }

          // Convert eventId to ObjectId
          templateData.eventId = new mongoose.Types.ObjectId(templateData.eventId);

          const template = await BadgeTemplate.create(templateData);
          return res.status(201).json(template);
        } catch (error) {
          // Clean up any uploaded images if template creation fails
          if (templateData.logo?.cloudinaryPublicId) {
            await deleteFromCloudinary(templateData.logo.cloudinaryPublicId);
          }
          if (templateData.photo?.cloudinaryPublicId) {
            await deleteFromCloudinary(templateData.photo.cloudinaryPublicId);
          }
          if (templateData.background?.cloudinaryPublicId) {
            await deleteFromCloudinary(templateData.background.cloudinaryPublicId);
          }
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

        // Delete images from Cloudinary
        try {
          if (templateToDelete.logo.cloudinaryPublicId) {
            await deleteFromCloudinary(templateToDelete.logo.cloudinaryPublicId);
          }
          if (templateToDelete.photo.cloudinaryPublicId) {
            await deleteFromCloudinary(templateToDelete.photo.cloudinaryPublicId);
          }
          if (templateToDelete.background?.cloudinaryPublicId) {
            await deleteFromCloudinary(templateToDelete.background.cloudinaryPublicId);
          }
        } catch (cloudinaryError) {
          console.error('Error deleting images from Cloudinary:', cloudinaryError);
          // Continue with template deletion even if Cloudinary deletion fails
        }

        // Delete the template
        await BadgeTemplate.findByIdAndDelete(id);
        res.status(200).json({ message: 'Template and associated images deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        throw new ApiError(405, `Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleApiError(error, res);
  }
} 