import mongoose, { Document } from 'mongoose';

export interface IRegistration extends Document {
  eventId: mongoose.Types.ObjectId;
  formId: mongoose.Types.ObjectId;
  formData: Record<string, any>;
  status: 'registered' | 'checked_in' | 'checked_out' | 'cancelled' | 'visited';
  checkInTime?: Date;
  checkOutTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const registrationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true
  },
  formData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['registered', 'checked_in', 'checked_out', 'cancelled', 'visited'],
    default: 'registered'
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for common queries
registrationSchema.index({ eventId: 1, status: 1 });
registrationSchema.index({ createdAt: -1 });

// Update the updatedAt timestamp before saving
registrationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Registration || mongoose.model<IRegistration>('Registration', registrationSchema); 