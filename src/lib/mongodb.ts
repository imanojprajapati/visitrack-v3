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
      bufferCommands: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_CONNECTION_TIMEOUT || '10000'),
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000'),
      family: 4,
      retryWrites: true,
      retryReads: true,
      connectTimeoutMS: 10000
    };

    globalWithMongoose.mongoose.promise = mongoose.connect(MONGODB_URI as string, opts)
      .then((mongoose) => {
        console.log('MongoDB connected successfully');
        // Register all models after successful connection
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
    globalWithMongoose.mongoose.conn = await globalWithMongoose.mongoose.promise;
    return globalWithMongoose.mongoose.conn;
  } catch (e) {
    globalWithMongoose.mongoose.promise = null;
    throw e;
  }
}

// Add connection event listeners
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  globalWithMongoose.mongoose.conn = null;
  globalWithMongoose.mongoose.promise = null;
});

// Handle disconnection
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  globalWithMongoose.mongoose.conn = null;
  globalWithMongoose.mongoose.promise = null;
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});