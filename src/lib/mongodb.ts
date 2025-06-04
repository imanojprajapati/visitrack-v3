import mongoose, { ConnectOptions } from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
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
    // Test existing connection
    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        console.log('Using existing database connection');
        return cached.conn;
      }
    } catch (error) {
      console.log('Existing connection failed, creating new connection');
      cached.conn = null;
      cached.promise = null;
    }
  }

  if (!cached.promise) {
    const opts: ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      writeConcern: {
        w: 'majority'
      }
    };

    mongoose.set('strictQuery', true);
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('New connection to MongoDB established');
        return mongoose;
      })
      .catch((error) => {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    
    // Test the new connection
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      console.log('Database connection is healthy');
    }
    
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error('Error connecting to database:', error);
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Add connection event listeners
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  cached.conn = null;
  cached.promise = null;
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

export { connectToDatabase }; 