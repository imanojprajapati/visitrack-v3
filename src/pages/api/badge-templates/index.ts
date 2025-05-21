import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import BadgeTemplate from '../../../models/BadgeTemplate';
import { uploadToCloudinary, deleteFromCloudinary } from '../../../lib/cloudinary';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Connect to database
    await connectToDatabase();

    switch (req.method) {
      case 'GET':
        const { eventId } = req.query;
        const query = eventId ? { eventId } : {};
        
        const templates = await BadgeTemplate.find(query)
          .sort({ createdAt: -1 })
          .lean();

        res.status(200).json(templates);
        break;

      case 'POST':
        try {
          const templateData = { ...req.body };
          
          // Handle logo upload if provided
          if (templateData.logo?.enabled && templateData.logo?.imageData) {
            const logoResult = await uploadToCloudinary(templateData.logo.imageData, 'badge-templates/logos');
            templateData.logo.cloudinaryUrl = logoResult.url;
            templateData.logo.cloudinaryPublicId = logoResult.publicId;
            delete templateData.logo.imageData;
          }

          // Handle photo upload if provided
          if (templateData.photo?.enabled && templateData.photo?.imageData) {
            const photoResult = await uploadToCloudinary(templateData.photo.imageData, 'badge-templates/photos');
            templateData.photo.cloudinaryUrl = photoResult.url;
            templateData.photo.cloudinaryPublicId = photoResult.publicId;
            delete templateData.photo.imageData;
          }

          // Handle background upload if provided
          if (templateData.background?.imageData) {
            const bgResult = await uploadToCloudinary(templateData.background.imageData, 'badge-templates/backgrounds');
            templateData.background = {
              cloudinaryUrl: bgResult.url,
              cloudinaryPublicId: bgResult.publicId
            };
          }

          // Convert eventId to ObjectId
          templateData.eventId = new mongoose.Types.ObjectId(templateData.eventId);

          const template = await BadgeTemplate.create(templateData);
          res.status(201).json(template);
        } catch (createError: any) {
          console.error('Error creating badge template:', createError);
          
          if (createError.name === 'ValidationError') {
            const validationErrors = Object.keys(createError.errors).map(key => ({
              field: key,
              message: createError.errors[key].message,
              value: createError.errors[key].value
            }));
            
            return res.status(400).json({
              error: 'Validation Error',
              details: validationErrors
            });
          }
          
          throw createError;
        }
        break;

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
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error handling badge templates:', error);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 