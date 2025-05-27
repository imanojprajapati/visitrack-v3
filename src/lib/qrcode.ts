import QRCode from 'qrcode';
import { QRCodeSVG } from 'qrcode.react';
import React from 'react';

// Common interface for QR code data
export interface QRCodeData {
  visitorId: string;
  eventId: string;
  registrationId?: string;
  name?: string;
  company?: string;
  eventName?: string;
}

// Props interface for QRCodeComponent
interface QRCodeComponentProps {
  data: QRCodeData;
  size?: number;
}

// Helper function to create a compact string from the data
export function createCompactData(data: QRCodeData): string {
  // Create an ultra-compact format: i{visitorId}e{eventId}r{registrationId}
  // Only include essential fields to minimize data size
  return `i${data.visitorId}e${data.eventId}${data.registrationId ? `r${data.registrationId}` : ''}`;
}

// Helper function to parse compact QR data
export function parseCompactQRData(data: string): QRCodeData | null {
  try {
    const result: any = {};
    let currentKey = '';
    let currentValue = '';
    
    // Parse the compact format
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      if (char === 'i' || char === 'e' || char === 'r') {
        if (currentKey) {
          result[currentKey] = currentValue;
        }
        currentKey = char;
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last key-value pair
    if (currentKey) {
      result[currentKey] = currentValue;
    }

    // Map the keys to their full names
    return {
      visitorId: result['i'] || '',
      eventId: result['e'] || '',
      registrationId: result['r'],
    };
  } catch (error) {
    console.error('Error parsing QR data:', error);
    return null;
  }
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

// React component for QR code generation (for client-side)
export const QRCodeComponent: React.FC<QRCodeComponentProps> = ({ data, size = QR_OPTIONS.width }) => {
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