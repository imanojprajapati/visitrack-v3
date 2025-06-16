import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import User, { IUser } from '../../../models/User';
import { verifyAccessToken } from '../../../lib/jwt';

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

    const { email, password, name, role } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
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

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters with 1 uppercase, 1 lowercase, and 1 number'
      });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'staff'];
    const userRole = role || 'staff';
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, manager, or staff'
      });
    }

    // Connect to database
    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const userData = {
      email: email.toLowerCase(),
      password,
      name: name.trim(),
      role: userRole,
      isActive: true
    };

    const user = await User.create(userData) as IUser;

    // Return success response (without password)
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    
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