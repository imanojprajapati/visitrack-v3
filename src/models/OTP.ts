import mongoose, { Document } from 'mongoose';

export interface IOTP extends Document {
  email: string;
  otp: string;
  expires: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  expires: {
    type: Date,
    required: true,
    index: true
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Document will be automatically deleted after 10 minutes
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for common queries
otpSchema.index({ email: 1, createdAt: -1 });

// Update the updatedAt timestamp before saving
otpSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.OTP || mongoose.model<IOTP>('OTP', otpSchema); 