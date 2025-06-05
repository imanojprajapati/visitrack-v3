import { NextApiRequest, NextApiResponse } from 'next';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { connectToDatabase } from '../../../lib/mongodb';
import BadgeTemplate from '../../../models/BadgeTemplate';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, templateId, eventId } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Connect to database
    await connectToDatabase();

    // Convert base64 to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Cloudinary using buffer
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'badge-templates/qr-codes',
          resource_type: 'image',
          format: 'png',
          transformation: [
            { quality: 'auto' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else if (result) resolve(result);
          else reject(new Error('Upload failed: No result returned'));
        }
      );

      // Write buffer to upload stream
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(buffer);
      bufferStream.pipe(uploadStream);
    });

    if (!result || !result.secure_url) {
      throw new Error('Failed to upload to Cloudinary');
    }

    // Update the template with the QR code URL
    const updatedTemplate = await BadgeTemplate.findByIdAndUpdate(
      templateId,
      {
        $set: {
          'qrCode.cloudinaryUrl': result.secure_url,
          'qrCode.cloudinaryPublicId': result.public_id,
          'qrCode.enabled': true
        }
      },
      { new: true }
    );

    if (!updatedTemplate) {
      throw new Error('Failed to update template with QR code');
    }

    res.status(200).json({
      url: result.secure_url,
      publicId: result.public_id,
      template: updatedTemplate
    });
  } catch (error: any) {
    console.error('Error uploading QR code:', error);
    res.status(500).json({
      error: 'Error uploading QR code',
      message: error.message
    });
  }
} 