import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import OTP from '../../../models/OTP';
import mongoose from 'mongoose';

// Add a simple in-memory lock to prevent concurrent verifications
const verificationLocks = new Map<string, boolean>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, otp } = req.body;
  const lockKey = `${email}-${otp}`;

  // Check if this verification is already in progress
  if (verificationLocks.get(lockKey)) {
    return res.status(429).json({ 
      message: 'Verification already in progress. Please wait.',
      code: 'VERIFICATION_IN_PROGRESS'
    });
  }

  try {
    // Set the lock
    verificationLocks.set(lockKey, true);

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

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the most recent OTP for this email
      const storedOTP = await OTP.findOne({ 
        email: email.toLowerCase().trim(),
        expires: { $gt: new Date() }
      }).sort({ createdAt: -1 }).session(session);

      if (!storedOTP) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: 'No valid OTP found for this email. Please request a new OTP.',
          code: 'OTP_EXPIRED'
        });
      }

      // Check if too many attempts
      if (storedOTP.attempts >= 3) {
        await OTP.deleteOne({ _id: storedOTP._id }).session(session);
        await session.commitTransaction();
        return res.status(400).json({ 
          message: 'Too many failed attempts. Please request a new OTP.',
          code: 'TOO_MANY_ATTEMPTS'
        });
      }

      // Increment attempts
      storedOTP.attempts += 1;
      await storedOTP.save({ session });

      // Verify OTP
      if (storedOTP.otp !== otp.trim()) {
        await session.commitTransaction();
        return res.status(400).json({ 
          message: 'Invalid OTP. Please try again.',
          code: 'INVALID_OTP',
          attemptsRemaining: 3 - storedOTP.attempts
        });
      }

      // OTP is valid, delete it
      await OTP.deleteOne({ _id: storedOTP._id }).session(session);
      await session.commitTransaction();

      // Return success response
      res.status(200).json({ 
        message: 'OTP verified successfully',
        code: 'SUCCESS'
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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
  } finally {
    // Clear the lock
    verificationLocks.delete(lockKey);
  }
} 