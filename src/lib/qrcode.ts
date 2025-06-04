import QRCode from 'qrcode';
import { QRCodeSVG } from 'qrcode.react';
import React from 'react';

// Common interface for QR code data
export interface QRCodeData {
  visitorId: string;  // Only visitor ID is required now
}

// Common QR code options for consistent generation
const QR_OPTIONS = {
  errorCorrectionLevel: 'H' as const,
  margin: 1,
  width: 180,
  color: {
    dark: '#000000',
    light: '#ffffff'
  }
};

// Helper function to create a compact string from the data
export function createCompactData(data: QRCodeData): string {
  // Just return the visitor ID as is - no JSON wrapping needed
  return data.visitorId;
}

// Helper function to parse compact QR data
export function parseCompactQRData(data: string): QRCodeData | null {
  try {
    // First try to parse as JSON (for backward compatibility)
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        const visitorId = parsed.visitor_id || parsed.visitorId;
        if (visitorId && /^[0-9a-fA-F]{24}$/.test(visitorId)) {
          return { visitorId };
        }
      }
    } catch (e) {
      // Not JSON, continue to direct ID check
    }

    // Check if the string itself is a valid MongoDB ID
    if (/^[0-9a-fA-F]{24}$/.test(data)) {
      return { visitorId: data };
    }

    // If no valid ID found, return null
    return null;
  } catch (error) {
    console.error('Error parsing QR data:', error);
    return null;
  }
}

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

// React component for QR code generation (for client-side)
export const QRCodeComponent: React.FC<{
  data: QRCodeData;
  size?: number;
}> = ({ data, size = QR_OPTIONS.width }) => {
  const qrData = createCompactData(data);
  return React.createElement(QRCodeSVG, {
    value: qrData,
    size: size,
    level: QR_OPTIONS.errorCorrectionLevel,
    bgColor: QR_OPTIONS.color.light,
    fgColor: QR_OPTIONS.color.dark,
    includeMargin: false
  });
};

// Generate visitor URL for QR code
export function generateVisitorURL(visitorId: string, baseUrl: string = 'http://192.168.29.163:3000'): string {
  return `${baseUrl}/visitor/${visitorId}`;
}

// Generate verification URL for QR code
export function generateVerificationURL(templateId: string, baseUrl: string = 'http://192.168.29.163:3000'): string {
  return `${baseUrl}/verify/${templateId}`;
} 