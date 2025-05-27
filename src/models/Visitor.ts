import mongoose, { Document } from 'mongoose';

export interface IVisitor extends Document {
  registrationId: mongoose.Types.ObjectId;  // Reference to original registration
  eventId: mongoose.Types.ObjectId;        // Reference to event
  formId: mongoose.Types.ObjectId;         // Reference to form
  name: string;                            // Visitor's name
  email: string;                           // Visitor's email
  phone: string;                           // Visitor's phone
  company?: string;                        // Visitor's company
  age?: number;                            // Visitor's age
  qrCode: string;                          // QR code for visitor check-in
  eventName: string;                       // Event name (denormalized for easy querying)
  eventLocation: string;                   // Event location (denormalized)
  eventStartDate: string;                  // Event start date in DD-MM-YY format
  eventEndDate: string;                    // Event end date in DD-MM-YY format
  status: 'registered' | 'checked_in' | 'checked_out' | 'cancelled';
  checkInTime?: string;                    // When visitor checked in (DD-MM-YY HH:mm)
  checkOutTime?: string;                   // When visitor checked out (DD-MM-YY HH:mm)
  additionalData: Record<string, any>;     // Any additional form fields
  createdAt: string;                       // Registration date in DD-MM-YY format
  updatedAt: string;                       // Last update date in DD-MM-YY format
}

// Helper function to format date to DD-MM-YY
const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear() % 100).padStart(2, '0');
  return `${day}-${month}-${year}`;
};

// Helper function to format date to DD-MM-YY HH:mm
const formatDateTime = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear() % 100).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

// Date string validation regex
const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{2}$/;
const dateTimeRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{2} ([01][0-9]|2[0-3]):[0-5][0-9]$/;

// Schema type for date strings that prevents type casting
const dateStringSchemaType = {
  type: String,
  get: (v: string) => v,
  set: (v: any) => {
    if (typeof v === 'string') return v;
    if (v instanceof Date) return formatDate(v);
    return String(v);
  }
};

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
  company: {
    type: String,
    trim: true,
  },
  age: {
    type: Number,
  },
  qrCode: {
    type: String,
    required: true,
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
    ...dateStringSchemaType,
    required: true,
    validate: {
      validator: function(v: string) {
        return dateRegex.test(v);
      },
      message: 'Event start date must be in DD-MM-YY format'
    }
  },
  eventEndDate: {
    ...dateStringSchemaType,
    required: true,
    validate: {
      validator: function(v: string) {
        return dateRegex.test(v);
      },
      message: 'Event end date must be in DD-MM-YY format'
    }
  },
  status: {
    type: String,
    enum: ['registered', 'checked_in', 'checked_out', 'cancelled'],
    default: 'registered',
  },
  checkInTime: {
    ...dateStringSchemaType,
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        return dateTimeRegex.test(v);
      },
      message: 'Check-in time must be in DD-MM-YY HH:mm format'
    }
  },
  checkOutTime: {
    ...dateStringSchemaType,
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        return dateTimeRegex.test(v);
      },
      message: 'Check-out time must be in DD-MM-YY HH:mm format'
    }
  },
  additionalData: {
    type: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    ...dateStringSchemaType,
    required: true,
    validate: {
      validator: function(v: string) {
        return dateRegex.test(v);
      },
      message: 'Created date must be in DD-MM-YY format'
    }
  },
  updatedAt: {
    ...dateStringSchemaType,
    required: true,
    validate: {
      validator: function(v: string) {
        return dateRegex.test(v);
      },
      message: 'Updated date must be in DD-MM-YY format'
    }
  }
}, {
  timestamps: false, // Disable automatic timestamps since we're handling them manually
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Create indexes for common queries
visitorSchema.index({ eventId: 1, status: 1 });
visitorSchema.index({ email: 1 });
visitorSchema.index({ phone: 1 });
visitorSchema.index({ createdAt: -1 });

// Update timestamps before saving
visitorSchema.pre('save', function(next) {
  const now = new Date();
  const formattedDate = formatDate(now);
  
  // Always set updatedAt
  this.updatedAt = formattedDate;
  
  // Set createdAt only for new documents
  if (this.isNew) {
    this.createdAt = formattedDate;
  }
  
  next();
});

// Add pre-validate middleware to ensure updatedAt is set
visitorSchema.pre('validate', function(next) {
  if (!this.updatedAt) {
    this.updatedAt = formatDate(new Date());
  }
  next();
});

// Delete the model if it exists to prevent schema conflicts
if (mongoose.models.Visitor) {
  delete mongoose.models.Visitor;
}

export default mongoose.model<IVisitor>('Visitor', visitorSchema); 