import QRCode from 'qrcode';
import { QRCodeData } from './qrcode';

// Helper function to create a compact string from the data
function createCompactData(data: QRCodeData): string {
  // Just return the visitor ID as is
  return data.visitorId;
}

// Common QR code options for consistent generation
const QR_OPTIONS = {
  errorCorrectionLevel: 'L' as const,
  margin: 1,
  width: 180,
  color: {
    dark: '#000000',
    light: '#ffffff'
  }
};

// Generate QR code as data URL (for server-side)
export async function generateQRCode(data: QRCodeData): Promise<string> {
  try {
    const qrData = createCompactData(data);
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: QR_OPTIONS.errorCorrectionLevel,
      margin: QR_OPTIONS.margin,
      width: QR_OPTIONS.width,
      color: QR_OPTIONS.color
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
} 