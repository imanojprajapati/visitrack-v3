import mongoose, { Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  formId: mongoose.Types.ObjectId;
  status: 'draft' | 'published' | 'cancelled';
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
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled'],
    default: 'draft'
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

export default mongoose.models.Event || mongoose.model<IEvent>('Event', eventSchema); 