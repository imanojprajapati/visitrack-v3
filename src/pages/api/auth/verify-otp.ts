import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import OTP from '../../../models/OTP';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    // 1. Validate input
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Clean and validate email
    const cleanEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Clean and validate OTP
    const cleanOTP = otp.toString().trim();
    if (!/^\d{6}$/.test(cleanOTP)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format'
      });
    }

    // 2. Connect to database
    await connectToDatabase();

    // 3. Find the most recent valid OTP
    const storedOTP = await OTP.findOne({
      email: cleanEmail,
      expires: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    // 4. Handle OTP not found
    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: 'No valid OTP found. Please request a new OTP.',
        code: 'OTP_EXPIRED'
      });
    }

    // 5. Check attempts
    if (storedOTP.attempts >= 3) {
      await OTP.deleteOne({ _id: storedOTP._id });
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.',
        code: 'TOO_MANY_ATTEMPTS'
      });
    }

    // 6. Verify OTP
    if (storedOTP.otp !== cleanOTP) {
      // Increment attempts
      storedOTP.attempts += 1;
      await storedOTP.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
        code: 'INVALID_OTP',
        attemptsRemaining: 3 - storedOTP.attempts
      });
    }

    // 7. OTP is valid - delete it and return success
    await OTP.deleteOne({ _id: storedOTP._id });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      code: 'SUCCESS'
    });

  } catch (error) {
    console.error('Error in verify-OTP endpoint:', error);
    
    // Handle database connection errors
    if (error instanceof Error && 
        (error.message.includes('database') || 
         error.message.includes('connection') ||
         error.message.includes('MongoDB'))) {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again.',
        code: 'DATABASE_ERROR'
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      code: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    });
  }
} 