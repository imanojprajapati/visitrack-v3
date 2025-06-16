import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import User, { IUser } from '../../../models/User';
import { verifyAccessToken } from '../../../lib/jwt';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
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

    const { name, email } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Connect to database
    await connectToDatabase();

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(), 
      _id: { $ne: decoded.userId } 
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      decoded.userId,
      {
        name: name.trim(),
        email: email.toLowerCase(),
      },
      { new: true, runValidators: true }
    ) as IUser;

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: String(updatedUser._id),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
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

    // Handle duplicate key errors
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        code: 'DUPLICATE_EMAIL'
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