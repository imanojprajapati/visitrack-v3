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

interface IForm extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  title: string;
  fields: IFormField[];
  createdAt: Date;
  updatedAt: Date;
}

const formFieldSchema = new mongoose.Schema<IFormField>({
  id: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(v);
      },
      message: 'Field ID must start with a letter and contain only letters, numbers, and underscores'
    }
  },
  type: {
    type: String,
    enum: ['text', 'email', 'number', 'tel', 'date', 'select', 'textarea'],
    required: true
  },
  label: {
    type: String,
    required: true,
    trim: true,
    minlength: [2, 'Label must be at least 2 characters long'],
    maxlength: [100, 'Label cannot exceed 100 characters']
  },
  required: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    trim: true,
    maxlength: [200, 'Placeholder cannot exceed 200 characters']
  },
  options: {
    type: [String],
    validate: {
      validator: function(v: string[]) {
        if (this.type === 'select') {
          return Array.isArray(v) && v.length > 0;
        }
        return true;
      },
      message: 'Select fields must have at least one option'
    }
  },
  validation: {
    min: {
      type: Number,
      validate: {
        validator: function(this: any, v: number) {
          const type = this.get('type');
          if (type === 'number' || type === 'date') {
            return !isNaN(v);
          }
          if (type === 'text' || type === 'textarea') {
            return Number.isInteger(v) && v >= 0;
          }
          return true;
        },
        message: 'Invalid minimum value for field type'
      }
    },
    max: {
      type: Number,
      validate: {
        validator: function(this: any, v: number) {
          const type = this.get('type');
          if (type === 'number' || type === 'date') {
            return !isNaN(v);
          }
          if (type === 'text' || type === 'textarea') {
            return Number.isInteger(v) && v >= 0;
          }
          return true;
        },
        message: 'Invalid maximum value for field type'
      }
    },
    pattern: {
      type: String,
      validate: {
        validator: function(v: string) {
          try {
            new RegExp(v);
            return true;
          } catch (e) {
            return false;
          }
        },
        message: 'Invalid regular expression pattern'
      }
    }
  }
});

const formSchema = new mongoose.Schema<IForm>({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  fields: {
    type: [formFieldSchema],
    validate: {
      validator: function(v: IFormField[]) {
        // Ensure there are fields
        if (!Array.isArray(v) || v.length === 0) {
          return false;
        }
        // Ensure field IDs are unique
        const ids = new Set(v.map(field => field.id));
        return ids.size === v.length;
      },
      message: 'Form must have at least one field and field IDs must be unique'
    }
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
      ret.eventId = ret.eventId.toString();
      ret.createdAt = ret.createdAt.toISOString();
      ret.updatedAt = ret.updatedAt.toISOString();
      return ret;
    }
  }
});

// Update the updatedAt timestamp before saving
formSchema.pre('save', function(this: IForm, next: () => void) {
  this.updatedAt = new Date();
  next();
});

// Validate min/max values
formSchema.pre('save', function(next) {
  for (const field of this.fields) {
    if (field.validation?.min !== undefined && field.validation?.max !== undefined) {
      if (field.validation.min > field.validation.max) {
        next(new Error(`Minimum value cannot be greater than maximum value for field "${field.label}"`));
        return;
      }
    }
  }
  next();
});

const Form: Model<IForm> = mongoose.models.Form || mongoose.model<IForm>('Form', formSchema);
export default Form; 