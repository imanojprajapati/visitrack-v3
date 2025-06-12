import mongoose, { Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  location: string;
  venue?: string;
  startDate: string;
  endDate: string;
  time: string;
  endTime: string;
  category?: string;
  organizer?: string;
  formId?: mongoose.Types.ObjectId;
  status: 'draft' | 'published' | 'cancelled' | 'upcoming';
  capacity: number;
  visitors: number;
  banner?: string;
  registrationDeadline?: string;
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
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/.test(v);
      },
      message: 'Start date must be in DD-MM-YYYY format'
    }
  },
  endDate: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/.test(v);
      },
      message: 'End date must be in DD-MM-YYYY format'
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
    type: String
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
  // Ensure dates are valid DD-MM-YYYY format
  const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/;
  
  if (!dateRegex.test(this.startDate)) {
    next(new Error('Invalid start date format. Expected DD-MM-YYYY'));
    return;
  }
  if (!dateRegex.test(this.endDate)) {
    next(new Error('Invalid end date format. Expected DD-MM-YYYY'));
    return;
  }
  if (this.registrationDeadline && !dateRegex.test(this.registrationDeadline)) {
    next(new Error('Invalid registration deadline format. Expected DD-MM-YYYY'));
    return;
  }

  // Parse dates for comparison
  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const startDate = parseDate(this.startDate);
  const endDate = parseDate(this.endDate);

  // Ensure end date is after or equal to start date
  if (endDate < startDate) {
    next(new Error('End date must be after or equal to start date'));
    return;
  }

  // Ensure registration deadline is before start date if set
  if (this.registrationDeadline) {
    const regDeadline = parseDate(this.registrationDeadline);
    if (regDeadline > startDate) {
      next(new Error('Registration deadline must be before start date'));
      return;
    }
  }

  next();
});

// Delete the model if it exists to prevent schema conflicts
if (mongoose.models.Event) {
  console.log('Deleting cached Event model');
  delete mongoose.models.Event;
}

// Clear any cached schemas
if ((mongoose as any)._modelSchemas && (mongoose as any)._modelSchemas.Event) {
  console.log('Deleting cached Event schema');
  delete (mongoose as any)._modelSchemas.Event;
}

console.log('Creating Event model with schema:', {
  startDateType: eventSchema.paths.startDate.instance,
  endDateType: eventSchema.paths.endDate.instance,
  registrationDeadlineType: eventSchema.paths.registrationDeadline?.instance
});

export default mongoose.model<IEvent>('Event', eventSchema); 