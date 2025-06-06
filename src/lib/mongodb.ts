import mongoose from 'mongoose';
import { registerModels } from './models';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const globalWithMongoose = global as { mongoose: MongooseCache };

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (globalWithMongoose.mongoose.conn) {
    try {
      // Test the connection if db is available
      const db = mongoose.connection.db;
      if (db) {
        await db.admin().ping();
      }
      return globalWithMongoose.mongoose.conn;
    } catch (error) {
      console.error('MongoDB connection test failed:', error);
      // Reset connection if ping fails
      globalWithMongoose.mongoose.conn = null;
      globalWithMongoose.mongoose.promise = null;
    }
  }

  if (!globalWithMongoose.mongoose.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10, // Increased from 5
      minPoolSize: 2, // Increased from 1
      serverSelectionTimeoutMS: 10000, // Increased from 5000
      socketTimeoutMS: 15000, // Increased from 10000
      connectTimeoutMS: 10000, // Increased from 5000
      family: 4,
      retryWrites: true,
      retryReads: true,
      heartbeatFrequencyMS: 5000, // Increased from 2000
      maxIdleTimeMS: 30000, // Increased from 10000
      waitQueueTimeoutMS: 10000, // Increased from 5000
      autoIndex: true,
      maxConnecting: 5, // Increased from 3
      // Add new options for better connection handling
      compressors: 'zlib',
      zlibCompressionLevel: 3, // Changed to valid value
      monitorCommands: true
    };

    globalWithMongoose.mongoose.promise = mongoose.connect(MONGODB_URI as string, opts)
      .then((mongoose) => {
        console.log('MongoDB connected successfully');
        registerModels();
        return mongoose;
      })
      .catch((error) => {
        console.error('MongoDB connection error:', error);
        globalWithMongoose.mongoose.promise = null;
        throw error;
      });
  }

  try {
    const connectionPromise = globalWithMongoose.mongoose.promise;
    const timeoutPromise = new Promise<typeof mongoose>((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 10000) // Increased from 5000
    );
    
    const result = await Promise.race([connectionPromise, timeoutPromise]);
    globalWithMongoose.mongoose.conn = result;

    // Add connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      globalWithMongoose.mongoose.conn = null;
      globalWithMongoose.mongoose.promise = null;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      globalWithMongoose.mongoose.conn = null;
      globalWithMongoose.mongoose.promise = null;
    });

    return result;
  } catch (e) {
    globalWithMongoose.mongoose.promise = null;
    throw e;
  }
}

process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during MongoDB connection cleanup:', err);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});