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

export async function connectToDatabase() {
  if (globalWithMongoose.mongoose.conn) {
    return globalWithMongoose.mongoose.conn;
  }

  if (!globalWithMongoose.mongoose.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 5,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 5000,
      family: 4,
      retryWrites: true,
      retryReads: true,
      heartbeatFrequencyMS: 2000,
      maxIdleTimeMS: 10000,
      waitQueueTimeoutMS: 5000,
      keepAlive: true,
      keepAliveInitialDelay: 300000,
      autoIndex: true,
      maxConnecting: 3
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
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 5000)
    );
    
    globalWithMongoose.mongoose.conn = await Promise.race([connectionPromise, timeoutPromise]);
    return globalWithMongoose.mongoose.conn;
  } catch (e) {
    globalWithMongoose.mongoose.promise = null;
    throw e;
  }
}

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

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