import mongoose from 'mongoose';

export interface IQRScan {
  visitorId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  registrationId: mongoose.Types.ObjectId;
  name: string;
  company: string;
  eventName: string;
  scanTime: Date;
  entryType: 'scan' | 'manual';
  status: string;
  scannedBy?: string; // Optional: ID of the admin who scanned
  location?: string;  // Optional: Location where scan happened
  deviceInfo?: string; // Optional: Device used for scanning
  notes?: string;     // Optional: Any additional notes
}

const qrScanSchema = new mongoose.Schema<IQRScan>({
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
  registrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  eventName: {
    type: String,
    required: true
  },
  scanTime: {
    type: Date,
    default: Date.now
  },
  entryType: {
    type: String,
    enum: ['scan', 'manual'],
    required: true
  },
  status: {
    type: String,
    required: true
  },
  scannedBy: String,
  location: String,
  deviceInfo: String,
  notes: String
}, {
  timestamps: true
});

// Create indexes for common queries
qrScanSchema.index({ visitorId: 1, eventId: 1 });
qrScanSchema.index({ scanTime: -1 });
qrScanSchema.index({ entryType: 1 });

export default mongoose.models.QRScan || mongoose.model<IQRScan>('QRScan', qrScanSchema); 