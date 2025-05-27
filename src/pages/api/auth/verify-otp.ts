import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import OTP from '../../../models/OTP';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Invalid OTP format' });
    }

    // Connect to database
    await connectToDatabase();

    // Find the most recent OTP for this email
    const storedOTP = await OTP.findOne({ 
      email,
      expires: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!storedOTP) {
      return res.status(400).json({ message: 'No valid OTP found for this email. Please request a new OTP.' });
    }

    // Check if too many attempts
    if (storedOTP.attempts >= 3) {
      await OTP.deleteOne({ _id: storedOTP._id });
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Increment attempts
    storedOTP.attempts += 1;
    await storedOTP.save();

    if (storedOTP.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // OTP is valid, delete it
    await OTP.deleteOne({ _id: storedOTP._id });

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error: unknown) {
    console.error('Error in verify-OTP endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ 
      message: 'Failed to verify OTP',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
} 