import mongoose from 'mongoose';

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
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    };

    globalWithMongoose.mongoose.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongoose) => {
      return mongoose;
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
});

// Handle disconnection
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  globalWithMongoose.mongoose.conn = null;
  globalWithMongoose.mongoose.promise = null;
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
}); 