import { useEffect, useState } from 'react';
import { message, Alert, Typography, Space, Modal, Button, Spin } from 'antd';
import Head from 'next/head';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const { Title, Text } = Typography;

// Auto-starting QR Scanner component
const AutoQRScannerComponent = dynamic(() => import('../../components/AutoQRScanner'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <Spin size="large" />
      <Text className="ml-2">Loading scanner...</Text>
    </div>
  )
});

const ScanByCameraPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleScanSuccess = (result: string) => {
    setLastResult(result);
    setShowResult(true);
    message.success('QR code scanned!');
  };

  const handleScanError = (error: string) => {
    setError(error);
  };

  const handleContinue = () => {
    setShowResult(false);
    setLastResult(null);
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#4f46e5] to-[#6366f1] p-2">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-4 flex flex-col items-center">
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
            <Text className="ml-2">Loading...</Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Scan by Camera</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
      </Head>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#4f46e5] to-[#6366f1] p-2">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-4 flex flex-col items-center">
          <Image src="/images/logo.png" alt="Visitrack Logo" width={160} height={40} className="mb-2" />
          <Title level={3} className="text-center w-full mb-2 text-[#4f46e5]">Scan by Camera</Title>
          <Text type="secondary" className="block text-center mb-4">
            Position the QR code within the frame. Scanning will restart after you close the result.
          </Text>
          
          {/* Security context warning */}
          {typeof window !== 'undefined' && !window.isSecureContext && (
            <Alert
              message="Security Warning"
              description="Camera access requires HTTPS. Please use HTTPS or localhost for full functionality."
              type="warning"
              showIcon
              className="mb-4 w-full"
            />
          )}

          {/* Mobile device info */}
          {typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
            <Alert
              message="Mobile Device"
              description="You're using a mobile device. Make sure to allow camera permissions when prompted."
              type="info"
              showIcon
              className="mb-4 w-full"
            />
          )}

          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              className="mb-4 w-full"
              closable
              onClose={() => setError(null)}
            />
          )}

          <AutoQRScannerComponent
            onScanSuccess={handleScanSuccess}
            onScanError={handleScanError}
          />
        </div>
        
        <Modal
          open={showResult}
          onCancel={handleContinue}
          footer={[
            <Button key="continue" type="primary" onClick={handleContinue}>
              Continue Scanning
            </Button>
          ]}
          centered
        >
          <div className="text-center">
            <Title level={4} className="mb-2 text-[#4f46e5]">Scan Result</Title>
            <div className="bg-gray-100 rounded p-3 break-all text-base text-gray-800 mb-2">
              {lastResult}
            </div>
            <Text type="secondary">Show this code to the event staff or use it as needed.</Text>
          </div>
        </Modal>
      </div>
    </>
  );
};

// Export the page with dynamic import to avoid SSR issues
export default dynamic(() => Promise.resolve(ScanByCameraPage), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#4f46e5] to-[#6366f1] p-2">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-4 flex flex-col items-center">
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
          <div className="ml-2">Loading scanner...</div>
        </div>
      </div>
    </div>
  )
}); 