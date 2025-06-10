import { NextApiRequest, NextApiResponse } from 'next';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dghizdjio',
  api_key: '221918581878115',
  api_secret: 'mXHD2jRujLsDEkIlFgLjllpITIc',
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
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Upload to Cloudinary using server-side credentials
    const result = await cloudinary.uploader.upload(image, {
      folder: 'badge-templates',
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    res.status(200).json({
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
    });
  } catch (error: any) {
    console.error('Error uploading to Cloudinary:', error);
    res.status(500).json({
      error: 'Error uploading to Cloudinary',
      message: error.message,
    });
  }
} 