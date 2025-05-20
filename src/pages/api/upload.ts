import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Files } from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), 'public', 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir,
      keepExtensions: true,
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

    // Generate unique filename
    const ext = path.extname(file.originalFilename);
    const filename = `${uuidv4()}${ext}`;
    const newPath = path.join(uploadDir, filename);

    try {
      // Rename file to unique name
      await fs.promises.rename(file.filepath, newPath);

      // Return the URL path to the uploaded file
      const fileUrl = `/uploads/${filename}`;
      return res.status(200).json({ url: fileUrl });
    } catch (err) {
      console.error('File rename error:', err);
      return res.status(500).json({ error: 'Failed to save uploaded file' });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
}