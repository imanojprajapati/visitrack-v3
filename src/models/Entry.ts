import mongoose from 'mongoose';

export interface IEntry extends mongoose.Document {
  visitorId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  entryTime: Date;
  createdAt: Date;
}

const entrySchema = new mongoose.Schema<IEntry>({
  visitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  entryTime: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for common queries
entrySchema.index({ visitorId: 1, entryTime: -1 });
entrySchema.index({ eventId: 1, entryTime: -1 });

// Delete the model if it exists to prevent schema conflicts
if (mongoose.models.Entry) {
  delete mongoose.models.Entry;
}

export default mongoose.model<IEntry>('Entry', entrySchema); 