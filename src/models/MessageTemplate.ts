import mongoose, { Document, Schema } from 'mongoose';

export interface IMessageTemplate extends Document {
  name: string;
  subject: string;
  message: string;
  variables: string[];
  createdBy?: string; // Optional: to track which admin user created it
  createdAt: Date;
  updatedAt: Date;
}

const messageTemplateSchema = new Schema<IMessageTemplate>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  variables: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret._id = ret._id.toString();
      ret.createdAt = ret.createdAt.toISOString();
      ret.updatedAt = ret.updatedAt.toISOString();
      return ret;
    }
  }
});

// Create indexes
messageTemplateSchema.index({ name: 1 });
messageTemplateSchema.index({ createdBy: 1 });
messageTemplateSchema.index({ createdAt: -1 });

// Delete existing model if it exists to prevent schema conflicts
if (mongoose.models.MessageTemplate) {
  delete mongoose.models.MessageTemplate;
}

const MessageTemplate = mongoose.model<IMessageTemplate>('MessageTemplate', messageTemplateSchema);

export default MessageTemplate; 