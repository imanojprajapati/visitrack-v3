import mongoose, { Document, Model } from 'mongoose';
import { EventForm } from '../types/form';

interface IFormField {
  id: string;
  type: 'text' | 'email' | 'number' | 'tel' | 'date' | 'select' | 'textarea';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface IForm extends Document, Omit<EventForm, 'id'> {
  _id: string;
}

const formFieldSchema = new mongoose.Schema<IFormField>({
  id: String,
  type: {
    type: String,
    enum: ['text', 'email', 'number', 'tel', 'date', 'select', 'textarea'],
    required: true
  },
  label: {
    type: String,
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  placeholder: String,
  options: [String],
  validation: {
    min: Number,
    max: Number,
    pattern: String
  }
});

const formSchema = new mongoose.Schema<IForm>({
  eventId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  fields: [formFieldSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
formSchema.pre('save', function(this: IForm, next: () => void) {
  this.updatedAt = new Date();
  next();
});

const Form: Model<IForm> = mongoose.models.Form || mongoose.model<IForm>('Form', formSchema);
export default Form; 