import mongoose from 'mongoose';

// Import all models
import '../models/Visitor';
import '../models/Event';
import '../models/QRScan';
import '../models/Registration';
import '../models/Form';
import '../models/Entry';

// Function to register all models
export function registerModels() {
  // Models are automatically registered when imported
  // This function exists to ensure models are loaded
  const registeredModels = mongoose.modelNames();
  console.log('Registered models:', registeredModels);
} 