import { NextApiRequest, NextApiResponse } from 'next';
import { extractTokenFromHeader, verifyAccessToken } from './jwt';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    userId: string;
    email: string;
    role: string;
    name: string;
  };
}

export const withAuth = (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
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
      const tokenPayload = verifyAccessToken(token);
      
      // Add user info to request
      req.user = tokenPayload;

      // Call the original handler
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  };
};

export const withRole = (allowedRoles: string[]) => {
  return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
    return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      return handler(req, res);
    });
  };
}; 