import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../lib/db';
import Form from '../../../models/Form';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await connectDB();
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      const form = await Form.findByIdAndDelete(id);
      
      if (!form) {
        return res.status(404).json({ error: 'Form not found' });
      }

      return res.status(200).json({ message: 'Form deleted successfully' });
    } catch (error) {
      console.error('Error deleting form:', error);
      return res.status(500).json({ error: 'Failed to delete form' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 