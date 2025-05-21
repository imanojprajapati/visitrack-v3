import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dghizdjio',
  api_key: '221918581878115',
  api_secret: 'mXHD2jRujLsDEkIlFgLjllpITIc',
  secure: true
});

export const uploadToCloudinary = async (file: File | Blob): Promise<string> => {
  try {
    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64String = Buffer.from(buffer).toString('base64');
    const dataURI = `data:${file.type};base64,${base64String}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'visitrack', // Optional: organize uploads in a folder
      resource_type: 'auto', // Automatically detect the resource type
    });

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

// Helper function to extract public_id from Cloudinary URL
export const getPublicIdFromUrl = (url: string): string => {
  const matches = url.match(/\/v\d+\/([^/]+)\./);
  return matches ? matches[1] : '';
}; 