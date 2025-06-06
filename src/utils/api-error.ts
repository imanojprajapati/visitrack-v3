import { NextApiResponse } from 'next';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown, res: NextApiResponse) {
  console.error('API Error:', error);

  // Handle known API errors
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
      code: error.statusCode
    });
  }

  // Handle MongoDB connection errors
  if (error instanceof Error) {
    if (error.message.includes('MongoServerError')) {
      return res.status(503).json({
        error: 'Database connection error',
        message: 'Unable to connect to the database. Please try again later.',
        code: 503
      });
    }

    if (error.message.includes('Database connection timeout')) {
      return res.status(503).json({
        error: 'Database timeout',
        message: 'Database connection timed out. Please try again later.',
        code: 503
      });
    }

    if (error.message.includes('MongoNetworkError')) {
      return res.status(503).json({
        error: 'Database network error',
        message: 'Unable to reach the database. Please check your connection and try again.',
        code: 503
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message,
        code: 400
      });
    }

    // Handle mongoose errors
    if (error.name === 'MongooseError') {
      return res.status(500).json({
        error: 'Database Error',
        message: 'An error occurred while accessing the database.',
        code: 500
      });
    }
  }

  // Handle other errors
  return res.status(500).json({
    error: 'Internal Server Error',
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    code: 500
  });
}

export function validateMongoId(id: string, fieldName: string = 'ID') {
  const { Types } = require('mongoose');
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${fieldName} format`);
  }
}

// Helper function to check if an error is a database connection error
export function isDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  return (
    error.message.includes('MongoServerError') ||
    error.message.includes('Database connection timeout') ||
    error.message.includes('MongoNetworkError') ||
    error.name === 'MongooseError'
  );
}

// Helper function to format error response
export function formatErrorResponse(error: unknown): { error: string; message: string; code: number } {
  if (error instanceof ApiError) {
    return {
      error: error.message,
      message: error.message,
      code: error.statusCode
    };
  }

  if (error instanceof Error) {
    if (isDatabaseError(error)) {
      return {
        error: 'Database Error',
        message: 'Unable to connect to the database. Please try again later.',
        code: 503
      };
    }

    return {
      error: error.name,
      message: error.message,
      code: 500
    };
  }

  return {
    error: 'Unknown Error',
    message: 'An unexpected error occurred',
    code: 500
  };
} 