const mongoose = require('mongoose');
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
    console.log('✅ Loaded environment variables from .env.local');
  } else {
    console.log('⚠️  No .env.local file found, using default values');
  }
}

// Load environment variables
loadEnvFile();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/visitrack';

console.log('🔗 MongoDB URI:', MONGODB_URI);

async function testDatabaseConnection() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Test the connection
    const db = mongoose.connection;
    console.log('📊 Database name:', db.name);
    console.log('🌐 Database host:', db.host);
    console.log('🔌 Database port:', db.port);
    
    // List all collections
    console.log('\n📁 Collections in database:');
    const collections = await db.db.listCollections().toArray();
    if (collections.length === 0) {
      console.log('  No collections found');
    } else {
      collections.forEach(collection => {
        console.log(`  - ${collection.name}`);
      });
    }
    
    // Check if users collection exists
    const usersCollection = collections.find(c => c.name === 'users');
    if (usersCollection) {
      console.log('\n👥 Users collection found!');
      
      // Count documents in users collection
      const userCount = await db.db.collection('users').countDocuments();
      console.log(`📊 Total users: ${userCount}`);
      
      if (userCount > 0) {
        console.log('\n👤 Users in database:');
        const users = await db.db.collection('users').find({}).toArray();
        users.forEach(user => {
          console.log(`  - ${user.email} (${user.role}) - Created: ${user.createdAt}`);
        });
      } else {
        console.log('❌ No users found in the collection');
      }
    } else {
      console.log('❌ Users collection not found');
    }
    
    // Test creating a simple document
    console.log('\n🧪 Testing document creation...');
    const testCollection = db.db.collection('test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    console.log('✅ Test document created successfully');
    
    // Clean up test document
    await testCollection.deleteOne({ test: true });
    console.log('✅ Test document cleaned up');
    
  } catch (error) {
    console.error('❌ Error testing database connection:', error);
    
    // Provide helpful error messages
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Troubleshooting tips:');
      console.error('1. Make sure MongoDB is running on your system');
      console.error('2. Check if MongoDB is installed and started');
      console.error('3. Verify your MONGODB_URI in .env.local file');
      console.error('4. Try running: mongod --version');
    } else if (error.name === 'MongoNetworkError') {
      console.error('\n💡 Network error - check your connection string');
    }
    
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }
}

// Run the test
testDatabaseConnection(); 