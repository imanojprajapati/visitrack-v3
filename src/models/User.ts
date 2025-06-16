import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'staff';
  name: string;
  isActive: boolean;
  lastLogin?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    validate: {
      validator: function(v: string) {
        // At least 6 characters, 1 uppercase, 1 lowercase, 1 number
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(v);
      },
      message: 'Password must be at least 6 characters with 1 uppercase, 1 lowercase, and 1 number'
    }
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff'],
    required: true,
    default: 'staff'
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Create indexes for common queries
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

// Static method to create user with validation
userSchema.statics.createUser = async function(userData: Partial<IUser>) {
  const existingUser = await this.findOne({ email: userData.email!.toLowerCase() });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  return this.create(userData);
};

// Delete the model if it exists to prevent schema conflicts
if (mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model<IUser>('User', userSchema); 