# Authentication System Documentation

## Overview

The Visitrack application now includes a complete authentication system with the following features:

- **User Management**: User registration, login, and role-based access control
- **Security**: Password hashing with bcrypt, JWT tokens, and HTTP-only cookies
- **Persistence**: Automatic token refresh and session management
- **Role-Based Access**: Admin, Manager, and Staff roles with different permissions

## User Roles

### Admin
- Full access to all features
- Can manage users and system settings
- Access to badge management

### Manager
- Access to most features except user management
- Can manage events, visitors, forms, and reports

### Staff
- Limited access for basic operations
- Can scan QR codes and view visitors
- Access to dashboard and basic reports

## Database Schema

### User Model (`src/models/User.ts`)
```typescript
interface IUser {
  email: string;           // Unique email address
  password: string;        // Hashed password
  role: 'admin' | 'manager' | 'staff';
  name: string;           // Full name
  isActive: boolean;      // Account status
  lastLogin?: Date;       // Last login timestamp
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/login`
Login with email and password
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

#### POST `/api/auth/signup`
Register a new user
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "name": "John Doe",
  "role": "staff"
}
```

#### POST `/api/auth/logout`
Logout and clear session

#### GET `/api/auth/me`
Get current user information

#### POST `/api/auth/refresh`
Refresh access token using refresh token

### OTP Endpoints (for visitor registration)
- `POST /api/auth/send-otp` - Send OTP via email
- `POST /api/auth/verify-otp` - Verify OTP

## Security Features

### Password Requirements
- Minimum 6 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

### Token Management
- **Access Token**: 7 days expiration
- **Refresh Token**: 30 days expiration
- **Auto-refresh**: Every 6 hours
- **HTTP-only Cookies**: Secure token storage

### Password Hashing
- Uses bcrypt with salt rounds of 12
- Automatic hashing on user creation/update

## Setup Instructions

### 1. Environment Variables
Add these to your `.env.local` file:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
```

### 2. Create Admin User
Run the setup script to create the initial admin user:
```bash
npm run create-admin
```

This creates a default admin user:
- Email: `admin@visitrack.com`
- Password: `Admin123!`
- Role: `admin`

### 3. Install Dependencies
```bash
npm install bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken
```

## Usage Examples

### Frontend Authentication
```typescript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleLogin = async () => {
    const result = await login('user@example.com', 'password');
    if (result.success) {
      console.log('Login successful');
    }
  };

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return <div>Welcome, {user?.name}!</div>;
};
```

### Protected API Routes
```typescript
import { withAuth, withRole } from '../lib/authMiddleware';

export default withRole(['admin', 'manager'])(async (req, res) => {
  // Only admin and manager can access this endpoint
  res.json({ message: 'Protected data' });
});
```

## Middleware

### Authentication Middleware
- `withAuth`: Protects routes requiring authentication
- `withRole`: Protects routes based on user roles

### Usage
```typescript
// Require authentication
export default withAuth(async (req, res) => {
  // req.user contains user information
});

// Require specific roles
export default withRole(['admin'])(async (req, res) => {
  // Only admins can access
});
```

## Error Handling

The authentication system includes comprehensive error handling:

- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid credentials/token)
- **403**: Forbidden (insufficient permissions)
- **409**: Conflict (user already exists)
- **500**: Internal Server Error

## Security Best Practices

1. **Never store passwords in plain text**
2. **Use HTTPS in production**
3. **Set secure JWT secret**
4. **Implement rate limiting**
5. **Log authentication events**
6. **Regular security audits**

## Troubleshooting

### Common Issues

1. **"Invalid email or password"**
   - Check if user exists in database
   - Verify password meets requirements

2. **"Token expired"**
   - Refresh token automatically
   - Re-login if refresh fails

3. **"Insufficient permissions"**
   - Check user role
   - Verify route protection

### Debug Mode
Set `NODE_ENV=development` to see detailed error messages in API responses.

## Migration from Old System

The new authentication system replaces the mock authentication. Update your components:

```typescript
// Old
const { username, userrole, userlogin } = useAuth();

// New
const { user, isAuthenticated, login } = useAuth();
```

## Future Enhancements

- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] Social login integration
- [ ] Session management dashboard
- [ ] Audit logging
- [ ] Account lockout after failed attempts 