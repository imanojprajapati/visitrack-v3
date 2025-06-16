import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import User, { IUser } from '../../../models/User';
import { verifyAccessToken } from '../../../lib/jwt';

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
    // Verify admin authentication using cookies
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const decoded = verifyAccessToken(accessToken);
    
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Connect to database
    await connectToDatabase();

    // Fetch all users (excluding password field)
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 }) as IUser[];

    // Transform users for frontend
    const transformedUsers = users.map(user => ({
      id: (user._id as any).toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }));

    return res.status(200).json({
      success: true,
      users: transformedUsers
    });

  } catch (error) {
    console.error('Fetch users error:', error);
    
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