import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../lib/mongodb';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Testing database connection...');
    const { mongoose: mongooseInstance, db } = await connectToDatabase();
    
    console.log('Database connected successfully');
    console.log('Database name:', db.databaseName);
    
    // Check if models are registered
    const registeredModels = mongooseInstance.modelNames();
    console.log('Registered models:', registeredModels);
    
    // Test Visitor model
    const Visitor = mongooseInstance.model('Visitor');
    console.log('Visitor model found:', !!Visitor);
    
    // Count visitors in database
    const visitorCount = await Visitor.countDocuments();
    console.log('Total visitors in database:', visitorCount);
    
    return res.status(200).json({
      message: 'Database connection test successful',
      databaseName: db.databaseName,
      registeredModels,
      visitorCount,
      connectionState: mongooseInstance.connection.readyState
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    return res.status(500).json({
      message: 'Database connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
} 