import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Generate access token
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'visitrack',
    audience: 'visitrack-users'
  } as jwt.SignOptions);
};

// Generate refresh token
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'visitrack',
    audience: 'visitrack-refresh'
  } as jwt.SignOptions);
};

// Generate both tokens
export const generateTokens = (payload: TokenPayload): TokenResponse => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  // Calculate expiration time in seconds
  const expiresIn = JWT_EXPIRES_IN === '7d' ? 7 * 24 * 60 * 60 : 60 * 60; // Default to 7 days or 1 hour
  
  return {
    accessToken,
    refreshToken,
    expiresIn
  };
};

// Verify access token
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'visitrack',
      audience: 'visitrack-users'
    } as jwt.VerifyOptions) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'visitrack',
      audience: 'visitrack-refresh'
    } as jwt.VerifyOptions) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

// Extract token from Authorization header
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

// Decode token without verification (for debugging)
export const decodeToken = (token: string): any => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}; 