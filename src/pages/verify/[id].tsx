import React, { useState, useEffect } from 'react';
import { parseCompactQRData, QRCodeData } from '../../lib/qrcode';

const VerifyVisitor: React.FC = () => {
  const [qrCode, setQrCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const verifyVisitor = async (data: string) => {
    try {
      setIsVerifying(true);
      setError(null);

      let visitorData: QRCodeData | null = null;
      try {
        visitorData = parseCompactQRData(data);
        if (!visitorData) {
          throw new Error('Invalid QR code format');
        }
      } catch (error) {
        console.error('Error parsing QR code:', error);
        throw new Error('Invalid QR code format');
      }

      const response = await fetch(`/api/visitors/verify/${visitorData.visitorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: visitorData.eventId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Verification failed');
      }

      const result = await response.json();
      setVerificationResult(result);
      setShowResult(true);
    } catch (error) {
      console.error('Verification error:', error);
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default VerifyVisitor; 