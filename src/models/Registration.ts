import mongoose, { Document } from 'mongoose';
import { FormSubmission } from '../types/form';

interface FormFieldData {
  label: string;
  value: any;
}

interface IRegistration extends Document {
  _id: string;
  formId: string;
  eventId: string;
  data: Record<string, FormFieldData>;
  submittedAt: Date;
  __v: number;
}

const formFieldDataSchema = new mongoose.Schema<FormFieldData>({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
});

const registrationSchema = new mongoose.Schema<IRegistration>({
  formId: {
    type: String,
    required: true,
  },
  eventId: {
    type: String,
    required: true,
  },
  data: {
    type: Map,
    of: formFieldDataSchema,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  versionKey: '__v'
});

// Create and export the model
const Registration = mongoose.models.Registration || mongoose.model<IRegistration>('Registration', registrationSchema);

export default Registration; 