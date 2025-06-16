import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import User from '../../../models/User';
import { extractTokenFromHeader, verifyAccessToken } from '../../../lib/jwt';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    // Extract token from Authorization header or cookies
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader) || req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    // Verify token
    let tokenPayload;
    try {
      tokenPayload = verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Connect to database
    await connectToDatabase();

    // Get user from database
    const user = await User.findById(tokenPayload.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Me endpoint error:', error);
    
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
      message: 'Internal server error',
      code: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    });
  }
} 