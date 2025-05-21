import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import BadgeTemplate from '../../../models/BadgeTemplate';
import { uploadToCloudinary, deleteFromCloudinary } from '../../../lib/cloudinary';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await connectToDatabase();
    const { templateId } = req.query;

    if (!templateId || typeof templateId !== 'string') {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    switch (req.method) {
      case 'GET':
        const template = await BadgeTemplate.findById(templateId);
        if (!template) {
          return res.status(404).json({ error: 'Template not found' });
        }
        res.status(200).json(template);
        break;

      case 'PUT':
        const templateToUpdate = await BadgeTemplate.findById(templateId);
        if (!templateToUpdate) {
          return res.status(404).json({ error: 'Template not found' });
        }

        const updateData = { ...req.body };

        // Handle logo update
        if (updateData.logo?.imageData) {
          // Delete old logo if exists
          if (templateToUpdate.logo.cloudinaryPublicId) {
            await deleteFromCloudinary(templateToUpdate.logo.cloudinaryPublicId);
          }
          // Upload new logo
          const logoResult = await uploadToCloudinary(updateData.logo.imageData, 'badge-templates/logos');
          updateData.logo.cloudinaryUrl = logoResult.url;
          updateData.logo.cloudinaryPublicId = logoResult.publicId;
          delete updateData.logo.imageData;
        }

        // Handle photo update
        if (updateData.photo?.imageData) {
          // Delete old photo if exists
          if (templateToUpdate.photo.cloudinaryPublicId) {
            await deleteFromCloudinary(templateToUpdate.photo.cloudinaryPublicId);
          }
          // Upload new photo
          const photoResult = await uploadToCloudinary(updateData.photo.imageData, 'badge-templates/photos');
          updateData.photo.cloudinaryUrl = photoResult.url;
          updateData.photo.cloudinaryPublicId = photoResult.publicId;
          delete updateData.photo.imageData;
        }

        // Handle background update
        if (updateData.background?.imageData) {
          // Delete old background if exists
          if (templateToUpdate.background?.cloudinaryPublicId) {
            await deleteFromCloudinary(templateToUpdate.background.cloudinaryPublicId);
          }
          // Upload new background
          const bgResult = await uploadToCloudinary(updateData.background.imageData, 'badge-templates/backgrounds');
          updateData.background = {
            cloudinaryUrl: bgResult.url,
            cloudinaryPublicId: bgResult.publicId
          };
        }

        const updatedTemplate = await BadgeTemplate.findByIdAndUpdate(
          templateId,
          updateData,
          { new: true, runValidators: true }
        );

        res.status(200).json(updatedTemplate);
        break;

      case 'DELETE':
        const templateToDelete = await BadgeTemplate.findById(templateId);
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

        await BadgeTemplate.findByIdAndDelete(templateId);
        res.status(200).json({ message: 'Template and associated images deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error handling template request:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
} 