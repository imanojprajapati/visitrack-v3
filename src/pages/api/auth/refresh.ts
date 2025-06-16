import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyRefreshToken, generateTokens, TokenPayload } from '../../../lib/jwt';

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
    // Get refresh token from cookies or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let tokenPayload;
    try {
      tokenPayload = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Connect to database
    await connectToDatabase();

    // Verify user still exists and is active
    const user = await User.findById(tokenPayload.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate new tokens
    const newTokenPayload: TokenPayload = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      name: user.name
    };

    const tokens = generateTokens(newTokenPayload);

    // Set new HTTP-only cookies
    res.setHeader('Set-Cookie', [
      `accessToken=${tokens.accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${tokens.expiresIn}`,
      `refreshToken=${tokens.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}` // 30 days
    ]);

    return res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    
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