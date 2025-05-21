import mongoose, { Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  capacity: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming',
  },
}, {
  timestamps: true,
});

// Create the model if it doesn't exist
export default mongoose.models.Event || mongoose.model<IEvent>('Event', eventSchema); 