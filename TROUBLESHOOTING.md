# Troubleshooting Guide

## Authentication System Issues

### Issue: Users Collection Empty After `npm run create-admin`

#### **Step 1: Check MongoDB Connection**

First, test if MongoDB is running and accessible:

```bash
npm run test-db
```

This will show you:
- ✅ If MongoDB is running
- 📊 Database connection details
- 📁 Existing collections
- 👥 Users in the database

#### **Step 2: Create Environment File**

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/visitrack

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Email Configuration (for OTP and notifications)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
```

#### **Step 3: Install MongoDB (if not installed)**

**Windows:**
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Install and start MongoDB service
3. Or use MongoDB Atlas (cloud version)

**macOS:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install mongodb
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### **Step 4: Verify MongoDB is Running**

```bash
# Check if MongoDB is running
mongod --version

# Connect to MongoDB shell
mongosh
# or
mongo
```

#### **Step 5: Run Create Admin Script**

```bash
npm run create-admin
```

**Expected Output:**
```
✅ Connected to MongoDB successfully
📊 Database name: visitrack
🌐 Database host: localhost
🔌 Database port: 27017
📁 Existing collections: []
✅ Admin user created successfully!
📧 Email: admin@visitrack.com
🔑 Password: Admin123!
👤 Role: admin
✅ User verified in database
📊 Total users in collection: 1
  - admin@visitrack.com (admin)
```

#### **Step 6: Common Error Solutions**

**Error: "MongoServerSelectionError"**
- MongoDB is not running
- Wrong connection string
- Network issues

**Solution:**
```bash
# Start MongoDB service
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
# Or start MongoDB manually
mongod
```

**Error: "ECONNREFUSED"**
- MongoDB not running on default port (27017)
- Firewall blocking connection

**Solution:**
```bash
# Check if port 27017 is in use
netstat -an | grep 27017
# Or
lsof -i :27017
```

**Error: "Authentication failed"**
- Wrong database credentials
- Database doesn't exist

**Solution:**
```bash
# Connect to MongoDB and create database
mongosh
use visitrack
db.createUser({
  user: "admin",
  pwd: "password",
  roles: ["readWrite"]
})
```

### Issue: Authentication Context Errors

**Error: "useAuth must be used within AuthProvider"**

**Solution:**
1. Make sure you're on an admin page (`/admin/*`)
2. Check that `AuthProvider` is properly wrapped in `_app.tsx`
3. Verify the component is using the correct import

### Issue: Login Not Working

**Check these points:**
1. ✅ Admin user exists in database
2. ✅ Correct email/password
3. ✅ MongoDB connection working
4. ✅ JWT_SECRET is set in `.env.local`

**Test login with:**
- Email: `admin@visitrack.com`
- Password: `Admin123!`

### Issue: Database Connection in Development

**For local development:**
```env
MONGODB_URI=mongodb://localhost:27017/visitrack
```

**For MongoDB Atlas (cloud):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/visitrack?retryWrites=true&w=majority
```

## Debugging Commands

### Check Database Status
```bash
npm run test-db
```

### Create Admin User
```bash
npm run create-admin
```

### Check MongoDB Service Status
```bash
# Linux
sudo systemctl status mongod

# macOS
brew services list | grep mongodb

# Windows
sc query MongoDB
```

### Connect to MongoDB Shell
```bash
mongosh visitrack
# or
mongo visitrack
```

### List All Collections
```javascript
show collections
```

### Find All Users
```javascript
db.users.find()
```

### Find Specific User
```javascript
db.users.findOne({email: "admin@visitrack.com"})
```

## Environment Variables Checklist

Make sure your `.env.local` file has:

- ✅ `MONGODB_URI` - MongoDB connection string
- ✅ `JWT_SECRET` - Secret key for JWT tokens
- ✅ `JWT_EXPIRES_IN` - Token expiration (default: 7d)
- ✅ `REFRESH_TOKEN_EXPIRES_IN` - Refresh token expiration (default: 30d)
- ✅ `GMAIL_USER` - Email for sending OTPs (optional)
- ✅ `GMAIL_APP_PASSWORD` - Email password (optional)
- ✅ `NEXTAUTH_URL` - Your app URL (default: http://localhost:3000)

## Common Issues and Solutions

### 1. MongoDB Not Starting
```bash
# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Check permissions
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown mongodb:mongodb /tmp/mongodb-27017.sock
```

### 2. Port Already in Use
```bash
# Find process using port 27017
sudo lsof -i :27017

# Kill the process
sudo kill -9 <PID>
```

### 3. Permission Denied
```bash
# Fix MongoDB data directory permissions
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chmod 755 /var/lib/mongodb
```

### 4. Database Lock
```bash
# Remove lock file
sudo rm /var/lib/mongodb/mongod.lock

# Repair database
mongod --repair
```

## Still Having Issues?

1. **Check the logs** from `npm run test-db`
2. **Verify MongoDB installation** with `mongod --version`
3. **Test connection** manually with `mongosh`
4. **Check environment variables** are loaded correctly
5. **Restart MongoDB service** and try again

If you're still experiencing issues, please share:
- The exact error message
- Output from `npm run test-db`
- Your MongoDB version
- Your operating system 