import mongoose, { Document } from 'mongoose';

export interface ICenter extends Document {
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  createdAt: Date;
  updatedAt: Date;
}

const centerSchema = new mongoose.Schema<ICenter>({
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
    unique: true,
    index: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: true,
  collection: 'centerdb' // Explicitly set collection name
});

// Create compound index for email uniqueness
centerSchema.index({ email: 1 }, { unique: true });

// Create indexes for common queries
centerSchema.index({ company: 1 });
centerSchema.index({ city: 1 });
centerSchema.index({ state: 1 });
centerSchema.index({ country: 1 });

// Pre-save middleware to ensure email is lowercase
centerSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Static method to find center by email
centerSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find or create center
centerSchema.statics.findOrCreate = async function(centerData: Partial<ICenter>) {
  const existingCenter = await this.findOne({ email: centerData.email!.toLowerCase() });
  if (existingCenter) {
    return existingCenter;
  }
  return this.create(centerData);
};

const Center = mongoose.models.Center || mongoose.model<ICenter>('Center', centerSchema);

export default Center; 