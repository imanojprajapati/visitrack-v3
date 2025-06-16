import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import User, { IUser } from '../../../models/User';
import { verifyAccessToken } from '../../../lib/jwt';
import bcrypt from 'bcryptjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    // Verify authentication using cookies
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const decoded = verifyAccessToken(accessToken);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Validate new password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters with 1 uppercase, 1 lowercase, and 1 number'
      });
    }

    // Connect to database
    await connectToDatabase();

    // Get user with password
    const user = await User.findById(decoded.userId) as IUser;
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.findByIdAndUpdate(
      decoded.userId,
      {
        password: hashedNewPassword,
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    
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

    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationErrors = Object.values((error as any).errors || {}).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }

    // Handle JWT errors
    if (error instanceof Error && error.message.includes('jwt')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'JWT_ERROR'
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    });
  }
} 