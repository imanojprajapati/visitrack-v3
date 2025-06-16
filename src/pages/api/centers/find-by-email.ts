import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Center from '../../../models/Center';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    console.log('Center API called with email:', email);

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    await connectToDatabase();
    console.log('Database connected, searching for email:', email);

    // Find center by email (case-insensitive)
    const center = await Center.findOne({ email: email.toLowerCase() });
    console.log('Center search result:', center);

    if (center) {
      console.log('Center found:', {
        name: center.name,
        email: center.email,
        company: center.company,
        city: center.city
      });
      res.status(200).json({
        found: true,
        center: {
          name: center.name,
          email: center.email,
          phone: center.phone,
          company: center.company,
          city: center.city,
          state: center.state,
          country: center.country,
          pincode: center.pincode
        }
      });
    } else {
      console.log('No center found for email:', email);
      res.status(200).json({
        found: false,
        message: 'No center data found for this email'
      });
    }
  } catch (error) {
    console.error('Error finding center by email:', error);
    res.status(500).json({ 
      message: 'Failed to find center data',
      error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    });
  }
} 