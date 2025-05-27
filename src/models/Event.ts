import mongoose, { Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  location: string;
  venue?: string;
  startDate: Date;
  endDate: Date;
  time: string;
  endTime: string;
  category?: string;
  organizer?: string;
  formId?: mongoose.Types.ObjectId;
  status: 'draft' | 'published' | 'cancelled' | 'upcoming';
  capacity: number;
  visitors: number;
  banner?: string;
  registrationDeadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  venue: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true,
    trim: true
  },
  endTime: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  organizer: {
    type: String,
    trim: true,
    default: 'Admin'
  },
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'upcoming'],
    default: 'draft'
  },
  capacity: {
    type: Number,
    required: true,
    default: 100,
    min: 1,
    validate: {
      validator: function(v: number) {
        return v > 0;
      },
      message: 'Capacity must be greater than 0'
    }
  },
  visitors: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: function(v: number) {
        return v >= 0;
      },
      message: 'Visitor count cannot be negative'
    }
  },
  banner: {
    type: String,
    trim: true
  },
  registrationDeadline: {
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
eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ createdAt: -1 });

// Update the updatedAt timestamp before saving
eventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Ensure visitors count is initialized to 0 for new events
eventSchema.pre('save', function(next) {
  if (this.isNew) {
    this.visitors = 0;
  }
  next();
});

export default mongoose.models.Event || mongoose.model<IEvent>('Event', eventSchema); 