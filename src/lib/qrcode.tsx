import { QRCodeSVG } from 'qrcode.react';
import React from 'react';

export interface QRCodeData {
  visitorId: string;
  eventId: string;
  registrationId: string;
  name?: string;
  company?: string;
  eventName?: string;
}

// Create an ultra-compact format: i{visitorId}e{eventId}r{registrationId}
export const createCompactData = (data: QRCodeData): string => {
  const { visitorId, eventId, registrationId } = data;
  return `i${visitorId}e${eventId}r${registrationId}`;
};

// Parse the compact format back into QRCodeData
export const parseCompactQRData = (data: string): QRCodeData => {
  try {
    // Try to parse the compact format first
    const visitorIdMatch = data.match(/i([^e]+)/);
    const eventIdMatch = data.match(/e([^r]+)/);
    const registrationIdMatch = data.match(/r(.+)/);

    if (!visitorIdMatch || !eventIdMatch || !registrationIdMatch) {
      throw new Error('Invalid QR code format');
    }

    return {
      visitorId: visitorIdMatch[1],
      eventId: eventIdMatch[1],
      registrationId: registrationIdMatch[1]
    };
  } catch (error) {
    // If compact format fails, try parsing as JSON
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && parsed.visitorId) {
        return parsed as QRCodeData;
      }
    } catch (e) {
      // If both formats fail, throw the original error
      throw error;
    }
    throw new Error('Invalid QR code data format');
  }
};

// Common QR code options for consistent generation
const QR_OPTIONS = {
  level: 'L' as const, // Lowest error correction level to reduce data size
  margin: 0,
  width: 180,
  bgColor: '#ffffff',
  fgColor: '#000000'
};

// React component for client-side QR code generation
interface QRCodeComponentProps {
  data: QRCodeData;
  size?: number;
}

export const QRCodeComponent: React.FC<QRCodeComponentProps> = ({ data, size = QR_OPTIONS.width }) => {
  const compactData = createCompactData(data);
  
  return React.createElement(QRCodeSVG, {
    value: compactData,
    size: size,
    level: QR_OPTIONS.level,
    bgColor: QR_OPTIONS.bgColor,
    fgColor: QR_OPTIONS.fgColor,
    includeMargin: false
  });
};

// Helper function to generate verification URL
export const generateVerificationURL = (visitorId: string): string => {
  return `/verify/${visitorId}`;
}; 