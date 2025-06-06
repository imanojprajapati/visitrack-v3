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

    // Input validation
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

    // Connect to database with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    let lastError = null;

    while (retryCount < maxRetries) {
      try {
        await connectToDatabase();
        break; // If connection successful, exit the loop
      } catch (error) {
        lastError = error;
        console.error(`Database connection attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        if (retryCount < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
    }

    if (retryCount === maxRetries) {
      throw new Error('Failed to connect to database after multiple attempts');
    }

    // Find the most recent OTP for this email
    const storedOTP = await OTP.findOne({ 
      email: email.toLowerCase().trim(),
      expires: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!storedOTP) {
      return res.status(400).json({ 
        message: 'No valid OTP found for this email. Please request a new OTP.',
        code: 'OTP_EXPIRED'
      });
    }

    // Check if too many attempts
    if (storedOTP.attempts >= 3) {
      await OTP.deleteOne({ _id: storedOTP._id });
      return res.status(400).json({ 
        message: 'Too many failed attempts. Please request a new OTP.',
        code: 'TOO_MANY_ATTEMPTS'
      });
    }

    // Increment attempts
    storedOTP.attempts += 1;
    await storedOTP.save();

    // Verify OTP
    if (storedOTP.otp !== otp.trim()) {
      return res.status(400).json({ 
        message: 'Invalid OTP. Please try again.',
        code: 'INVALID_OTP',
        attemptsRemaining: 3 - storedOTP.attempts
      });
    }

    // OTP is valid, delete it
    await OTP.deleteOne({ _id: storedOTP._id });

    // Return success response
    res.status(200).json({ 
      message: 'OTP verified successfully',
      code: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error in verify-OTP endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Determine if this is a database connection error
    const isDatabaseError = error instanceof Error && 
      (error.message.includes('database') || 
       error.message.includes('connection') ||
       error.message.includes('MongoDB'));

    res.status(isDatabaseError ? 503 : 500).json({ 
      message: isDatabaseError ? 'Service temporarily unavailable. Please try again.' : 'Failed to verify OTP',
      code: isDatabaseError ? 'DATABASE_ERROR' : 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
} 