const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local if it exists
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    });
    console.log('Loaded environment variables from .env.local');
  } else {
    console.log('No .env.local file found, using default values');
  }
}

// Load environment variables
loadEnvFile();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/visitrack';

console.log('MongoDB URI:', MONGODB_URI);

// User Schema (simplified version for the script)
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff'],
    default: 'admin'
  },
  name: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'users' // Explicitly set collection name
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      console.log('Password hashed successfully');
    } catch (error) {
      console.error('Error hashing password:', error);
      return next(error);
    }
  }
  next();
});

// Delete existing model to prevent conflicts
if (mongoose.models.User) {
  delete mongoose.models.User;
}

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    console.log('Starting admin user creation...');
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    
    // Connect to MongoDB with better error handling
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully');

    // Test the connection
    const db = mongoose.connection;
    console.log('Database name:', db.name);
    console.log('Database host:', db.host);
    console.log('Database port:', db.port);

    // List all collections to verify connection
    const collections = await db.db.listCollections().toArray();
    console.log('Existing collections:', collections.map(c => c.name));

    // Check if admin user already exists
    console.log('Checking for existing admin user...');
    const existingAdmin = await User.findOne({ email: 'admin@visitrack.com' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log('Created:', existingAdmin.createdAt);
      process.exit(0);
    }

    console.log('No existing admin user found, creating new one...');

    // Create admin user
    const adminUser = new User({
      email: 'admin@visitrack.com',
      password: 'Admin123!', // This will be hashed automatically
      name: 'System Administrator',
      role: 'admin',
      isActive: true
    });

    console.log('Saving admin user...');
    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@visitrack.com');
    console.log('🔑 Password: Admin123!');
    console.log('👤 Role: admin');
    console.log('🆔 User ID:', adminUser._id);
    console.log('📅 Created:', adminUser.createdAt);

    // Verify the user was saved by fetching it
    const savedUser = await User.findOne({ email: 'admin@visitrack.com' });
    if (savedUser) {
      console.log('✅ User verified in database');
    } else {
      console.log('❌ User not found in database after creation');
    }

    // List all users in the collection
    const allUsers = await User.find({});
    console.log(`📊 Total users in collection: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    
    // Provide helpful error messages
    if (error.name === 'MongoServerSelectionError') {
      console.error('💡 Make sure MongoDB is running on your system');
      console.error('💡 Check your MONGODB_URI in .env.local file');
    } else if (error.name === 'ValidationError') {
      console.error('💡 Validation error - check the user data format');
    } else if (error.code === 11000) {
      console.error('💡 Duplicate key error - user might already exist');
    }
    
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }
}

// Run the script
createAdminUser(); 