import mongoose, { Document } from 'mongoose';

// Delete the model if it exists to prevent schema conflicts
if (mongoose.models.BadgeTemplate) {
  delete mongoose.models.BadgeTemplate;
}

export interface IBadgeTemplate extends Document {
  name: string;
  eventId: mongoose.Types.ObjectId;
  showQRCode: boolean;
  badge: {
    cloudinaryUrl?: string;
    cloudinaryPublicId?: string;
    imageData?: string;
  };
  qrCode: {
    enabled: boolean;
    cloudinaryUrl?: string;
    cloudinaryPublicId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const badgeTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  showQRCode: {
    type: Boolean,
    default: true,
  },
  badge: {
    type: {
      cloudinaryUrl: String,
      cloudinaryPublicId: String,
      imageData: String
    },
    default: {}
  },
  qrCode: {
    type: {
      enabled: {
        type: Boolean,
        default: true,
      },
      cloudinaryUrl: {
        type: String,
        default: '',
      },
      cloudinaryPublicId: {
        type: String,
        default: '',
      },
    },
    default: () => ({
      enabled: true,
      cloudinaryUrl: '',
      cloudinaryPublicId: '',
    }),
  },
}, {
  timestamps: true,
  strict: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for common queries
badgeTemplateSchema.index({ eventId: 1 });
badgeTemplateSchema.index({ name: 1 });

// Add a method to clean up Cloudinary resources when template is deleted
badgeTemplateSchema.pre('findOneAndDelete', async function(this: mongoose.Query<any, any>, next: mongoose.CallbackWithoutResultAndOptionalError) {
  try {
    const template = await this.model.findOne(this.getQuery()) as IBadgeTemplate;
    if (!template) {
      return next();
    }
    
    // Delete badge from Cloudinary if exists
    if (template.badge?.cloudinaryPublicId) {
      // TODO: Implement Cloudinary deletion
      // await cloudinary.uploader.destroy(template.badge.cloudinaryPublicId);
    }
    
    // Delete QR code from Cloudinary if exists
    if (template.qrCode?.cloudinaryPublicId) {
      // TODO: Implement Cloudinary deletion
      // await cloudinary.uploader.destroy(template.qrCode.cloudinaryPublicId);
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Export a fresh model instance
const BadgeTemplate = mongoose.model<IBadgeTemplate>('BadgeTemplate', badgeTemplateSchema);
export default BadgeTemplate; 