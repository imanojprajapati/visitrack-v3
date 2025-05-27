import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

if (!process.env.MONGODB_DB) {
  throw new Error('Please add your Mongo Database name to .env.local');
}

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    };

    mongoose.set('strictQuery', true);
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('Connected to MongoDB successfully');
        return mongoose;
      })
      .catch((error) => {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    
    // Test the connection
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      console.log('Database connection is healthy');
    } else {
      throw new Error('Database connection not established');
    }
    
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error('Error connecting to database:', error);
    throw error;
  }
}

export { connectToDatabase }; 