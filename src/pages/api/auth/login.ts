import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import User, { IUser } from '../../../models/User';
import { generateTokens, TokenPayload } from '../../../lib/jwt';

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
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
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

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true }) as IUser;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      name: user.name
    };

    const tokens = generateTokens(tokenPayload);

    // Set HTTP-only cookies for security
    res.setHeader('Set-Cookie', [
      `accessToken=${tokens.accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${tokens.expiresIn}`,
      `refreshToken=${tokens.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}` // 30 days
    ]);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: user.lastLogin
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
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
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        code: 'VALIDATION_ERROR'
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