import mongoose, { Document } from 'mongoose';

// Delete the model if it exists to prevent schema conflicts
if (mongoose.models.BadgeTemplate) {
  delete mongoose.models.BadgeTemplate;
}

export interface IBadgeTemplate extends Document {
  name: string;
  eventId: mongoose.Types.ObjectId;
  size: {
    width: number;
    height: number;
    unit: string;
  };
  orientation: 'portrait' | 'landscape';
  title: {
    enabled: boolean;
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    position: { x: number; y: number };
  };
  subtitle: {
    enabled: boolean;
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    position: { x: number; y: number };
  };
  additionalInfo: {
    enabled: boolean;
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    position: { x: number; y: number };
  };
  badge: {
    cloudinaryUrl?: string;
    cloudinaryPublicId?: string;
    imageData?: string;
  };
  qrCode: {
    enabled: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
  };
  background?: {
    cloudinaryUrl?: string;
    cloudinaryPublicId?: string;
  };
  showQRCode: boolean;
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
  size: {
    width: {
      type: Number,
      required: true,
      min: 1,
    },
    height: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      enum: ['mm', 'inches'],
      default: 'mm',
    },
  },
  orientation: {
    type: String,
    enum: ['portrait', 'landscape'],
    default: 'portrait',
  },
  title: {
    type: {
      enabled: {
        type: Boolean,
        default: true,
      },
      text: {
        type: String,
        required: true,
      },
      fontSize: {
        type: Number,
        default: 24,
      },
      fontFamily: {
        type: String,
        default: 'Arial',
      },
      color: {
        type: String,
        default: '#000000',
      },
      position: {
        x: {
          type: Number,
          default: 0.5,
        },
        y: {
          type: Number,
          default: 0.5,
        },
      },
    },
    required: true,
  },
  subtitle: {
    type: {
      enabled: {
        type: Boolean,
        default: true,
      },
      text: {
        type: String,
        required: true,
      },
      fontSize: {
        type: Number,
        default: 18,
      },
      fontFamily: {
        type: String,
        default: 'Arial',
      },
      color: {
        type: String,
        default: '#666666',
      },
      position: {
        x: {
          type: Number,
          default: 0.5,
        },
        y: {
          type: Number,
          default: 0.7,
        },
      },
    },
    required: true,
  },
  additionalInfo: {
    type: {
      enabled: {
        type: Boolean,
        default: true,
      },
      text: {
        type: String,
        default: '',
      },
      fontSize: {
        type: Number,
        default: 14,
      },
      fontFamily: {
        type: String,
        default: 'Arial',
      },
      color: {
        type: String,
        default: '#333333',
      },
      position: {
        x: {
          type: Number,
          default: 0.5,
        },
        y: {
          type: Number,
          default: 0.85,
        },
      },
    },
    required: true,
  },
  badge: {
    type: {
      cloudinaryUrl: String,
      cloudinaryPublicId: String,
      imageData: String
    },
    default: {}
  },
  logo: {
    type: {
      enabled: {
        type: Boolean,
        default: false,
      },
      position: {
        x: {
          type: Number,
          default: 0.5,
        },
        y: {
          type: Number,
          default: 0.2,
        },
      },
      size: {
        width: {
          type: Number,
          default: 1,
        },
        height: {
          type: Number,
          default: 1,
        },
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
    required: false,
  },
  photo: {
    type: {
      enabled: {
        type: Boolean,
        default: true,
      },
      position: {
        x: {
          type: Number,
          default: 0.2,
        },
        y: {
          type: Number,
          default: 0.5,
        },
      },
      size: {
        width: {
          type: Number,
          default: 1,
        },
        height: {
          type: Number,
          default: 1.25,
        },
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
    required: false,
  },
  qrCode: {
    type: {
      enabled: {
        type: Boolean,
        default: true,
      },
      position: {
        x: {
          type: Number,
          default: 0.8,
        },
        y: {
          type: Number,
          default: 0.5,
        },
      },
      size: {
        width: {
          type: Number,
          default: 1,
        },
        height: {
          type: Number,
          default: 1,
        },
      },
    },
    required: false,
  },
  background: {
    type: {
      cloudinaryUrl: {
        type: String,
        default: '',
      },
      cloudinaryPublicId: {
        type: String,
        default: '',
      },
    },
    default: {},
  },
  showQRCode: {
    type: Boolean,
    default: true,
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
    
    // Delete logo from Cloudinary if exists
    if (template.logo.cloudinaryPublicId) {
      // TODO: Implement Cloudinary deletion
      // await cloudinary.uploader.destroy(template.logo.cloudinaryPublicId);
    }
    
    // Delete photo from Cloudinary if exists
    if (template.photo.cloudinaryPublicId) {
      // TODO: Implement Cloudinary deletion
      // await cloudinary.uploader.destroy(template.photo.cloudinaryPublicId);
    }
    
    // Delete background from Cloudinary if exists
    if (template.background?.cloudinaryPublicId) {
      // TODO: Implement Cloudinary deletion
      // await cloudinary.uploader.destroy(template.background.cloudinaryPublicId);
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Export a fresh model instance
const BadgeTemplate = mongoose.model<IBadgeTemplate>('BadgeTemplate', badgeTemplateSchema);
export default BadgeTemplate; 