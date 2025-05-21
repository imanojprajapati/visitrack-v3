import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { v2 as cloudinary } from 'cloudinary';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dghizdjio',
  api_key: '221918581878115',
  api_secret: 'mXHD2jRujLsDEkIlFgLjllpITIc',
  secure: true
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      filter: (part) => {
        return part.mimetype ? part.mimetype.startsWith('image/') : false;
      },
    });

    const [fields, files]: [formidable.Fields, formidable.Files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('File parsing error:', err);
          reject(err);
          return;
        }
        resolve([fields, files]);
      });
    });

    // Get the uploaded file
    const fileArray = files.file;
    if (!fileArray || !Array.isArray(fileArray) || fileArray.length === 0) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = fileArray[0];
    if (!file.originalFilename || !file.filepath) {
      console.error('Invalid file object:', file);
      return res.status(400).json({ error: 'Invalid file upload' });
    }

    try {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(file.filepath, {
        folder: 'visitrack',
        resource_type: 'auto',
      });

      // Return the Cloudinary URL
      return res.status(200).json({ url: result.secure_url });
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return res.status(500).json({ error: 'Failed to upload file to Cloudinary' });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to process upload' });
  }
}