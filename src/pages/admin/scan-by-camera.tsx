import { useEffect, useRef, useState } from 'react';
import { message, Alert, Typography, Space, Modal, Button } from 'antd';
import { Html5Qrcode } from 'html5-qrcode';
import Head from 'next/head';
import Image from 'next/image';

const { Title, Text } = Typography;

const ScanByCameraPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);

  // Get available cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      setCameras(devices);
      // Prefer back camera if available
      const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
      setCameraId(backCam ? backCam.id : devices[0]?.id || null);
    }).catch(err => {
      setError('Unable to access device cameras. Please ensure camera permissions are granted.');
    });
  }, []);

  // Start scanning automatically when cameraId is set and not showing result
  useEffect(() => {
    if (!cameraId || showResult) return;
    let stopped = false;
    const startScanner = async () => {
      setError(null);
      setScanning(true);
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;
      try {
        await scanner.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!stopped) {
              setLastResult(decodedText);
              setShowResult(true);
              message.success('QR code scanned!');
              scanner.stop();
            }
          },
          (errorMessage) => {
            // Ignore continuous scan errors
          }
        );
      } catch (err) {
        setError('Failed to start QR scanner. ' + (err instanceof Error ? err.message : ''));
        setScanning(false);
      }
    };
    startScanner();
    return () => {
      stopped = true;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    };
  }, [cameraId, showResult]);

  const handleContinue = () => {
    setShowResult(false);
    setLastResult(null);
  };

  return (
    <>
      <Head>
        <title>Scan by Camera</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#4f46e5] to-[#6366f1] p-2">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-4 flex flex-col items-center">
          <Image src="/images/logo.png" alt="Visitrack Logo" width={160} height={40} className="mb-2" />
          <Title level={3} className="text-center w-full mb-2 text-[#4f46e5]">Scan by Camera</Title>
          <Text type="secondary" className="block text-center mb-4">
            Position the QR code within the frame. Scanning will restart after you close the result.
          </Text>
          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              className="mb-4 w-full"
            />
          )}
          <div className="w-full flex flex-col items-center">
            <div
              id="qr-reader"
              className="w-full max-w-xs aspect-square bg-black rounded-lg overflow-hidden mb-4"
              style={{ minHeight: 250 }}
            />
            {cameras.length > 1 && (
              <Space direction="vertical" className="w-full mb-2">
                <label htmlFor="camera-select" className="text-xs text-gray-500">Switch Camera:</label>
                <select
                  id="camera-select"
                  className="w-full border rounded p-2"
                  value={cameraId || ''}
                  onChange={e => setCameraId(e.target.value)}
                  disabled={!scanning}
                >
                  {cameras.map(cam => (
                    <option key={cam.id} value={cam.id}>{cam.label || cam.id}</option>
                  ))}
                </select>
              </Space>
            )}
          </div>
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

export default ScanByCameraPage; 