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
    required: true,
    validate: {
      validator: function(v: Date) {
        return v instanceof Date && !isNaN(v.getTime());
      },
      message: 'Start date must be a valid date'
    }
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(v: Date) {
        return v instanceof Date && !isNaN(v.getTime());
      },
      message: 'End date must be a valid date'
    }
  },
  time: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Time must be in HH:MM format'
    }
  },
  endTime: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
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
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret._id = ret._id.toString();
      if (ret.formId) ret.formId = ret.formId.toString();
      if (ret.startDate) ret.startDate = ret.startDate.toISOString();
      if (ret.endDate) ret.endDate = ret.endDate.toISOString();
      if (ret.registrationDeadline) ret.registrationDeadline = ret.registrationDeadline.toISOString();
      if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
      if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
      return ret;
    }
  }
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

// Validate dates
eventSchema.pre('save', function(next) {
  // Ensure dates are valid
  if (!(this.startDate instanceof Date) || isNaN(this.startDate.getTime())) {
    next(new Error('Invalid start date'));
    return;
  }
  if (!(this.endDate instanceof Date) || isNaN(this.endDate.getTime())) {
    next(new Error('Invalid end date'));
    return;
  }
  if (this.registrationDeadline && (!(this.registrationDeadline instanceof Date) || isNaN(this.registrationDeadline.getTime()))) {
    next(new Error('Invalid registration deadline'));
    return;
  }

  // Ensure end date is after start date
  if (this.endDate < this.startDate) {
    next(new Error('End date must be after start date'));
    return;
  }

  // Ensure registration deadline is before start date if set
  if (this.registrationDeadline && this.registrationDeadline > this.startDate) {
    next(new Error('Registration deadline must be before start date'));
    return;
  }

  next();
});

export default mongoose.models.Event || mongoose.model<IEvent>('Event', eventSchema); 