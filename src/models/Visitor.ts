import mongoose, { Document } from 'mongoose';

export interface IVisitor extends Document {
  registrationId: mongoose.Types.ObjectId;  // Reference to original registration
  eventId: mongoose.Types.ObjectId;        // Reference to event
  formId: mongoose.Types.ObjectId;         // Reference to form
  name: string;                            // Visitor's name
  email: string;                           // Visitor's email
  phone: string;                           // Visitor's phone
  age: number;                             // Visitor's age
  eventName: string;                       // Event name (denormalized for easy querying)
  eventLocation: string;                   // Event location (denormalized)
  eventStartDate: Date;                    // Event start date (denormalized)
  eventEndDate: Date;                      // Event end date (denormalized)
  status: 'registered' | 'checked_in' | 'checked_out' | 'cancelled';
  checkInTime?: Date;                      // When visitor checked in
  checkOutTime?: Date;                     // When visitor checked out
  additionalData: Record<string, any>;     // Any additional form fields
  createdAt: Date;
  updatedAt: Date;
}

const visitorSchema = new mongoose.Schema({
  registrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration',
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  age: {
    type: Number,
  },
  eventName: {
    type: String,
    required: true,
    trim: true,
  },
  eventLocation: {
    type: String,
    required: true,
    trim: true,
  },
  eventStartDate: {
    type: Date,
    required: true,
  },
  eventEndDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['registered', 'checked_in', 'checked_out', 'cancelled'],
    default: 'registered',
  },
  checkInTime: {
    type: Date,
  },
  checkOutTime: {
    type: Date,
  },
  additionalData: {
    type: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Create indexes for common queries
visitorSchema.index({ eventId: 1, status: 1 });
visitorSchema.index({ email: 1 });
visitorSchema.index({ phone: 1 });
visitorSchema.index({ createdAt: -1 });

// Update the updatedAt timestamp before saving
visitorSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Visitor || mongoose.model<IVisitor>('Visitor', visitorSchema); 