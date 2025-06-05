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

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details
    });
  }

  // Handle MongoDB connection errors
  if (error instanceof Error && error.message.includes('MongoServerError')) {
    return res.status(503).json({
      error: 'Database connection error',
      message: 'Please try again later'
    });
  }

  // Handle validation errors
  if (error instanceof Error && error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message
    });
  }

  // Handle other errors
  return res.status(500).json({
    error: 'Internal Server Error',
    message: error instanceof Error ? error.message : 'An unexpected error occurred'
  });
}

export function validateMongoId(id: string, fieldName: string = 'ID') {
  const { Types } = require('mongoose');
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${fieldName} format`);
  }
} 