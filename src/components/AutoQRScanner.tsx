import { useEffect, useState, useRef } from 'react';
import { Spin, Alert, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface AutoQRScannerProps {
  onScanSuccess: (result: string) => void;
  onScanError?: (error: string) => void;
}

const AutoQRScanner: React.FC<AutoQRScannerProps> = ({ onScanSuccess, onScanError }) => {
  const [isClient, setIsClient] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const initializeScanner = async () => {
      try {
        setIsInitializing(true);
        
        // Check if we're in a secure context
        if (!window.isSecureContext) {
          const errorMsg = 'Camera access requires a secure connection (HTTPS). Please use HTTPS or localhost.';
          setError(errorMsg);
          if (onScanError) onScanError(errorMsg);
          return;
        }

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const errorMsg = 'Camera access is not supported in this browser.';
          setError(errorMsg);
          if (onScanError) onScanError(errorMsg);
          return;
        }

        // Check if we're on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
          // Request camera permissions on mobile
          try {
            await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (permError) {
            const errorMsg = 'Camera permission denied. Please allow camera access and refresh the page.';
            setError(errorMsg);
            if (onScanError) onScanError(errorMsg);
            return;
          }
        }

        // Import and initialize Html5Qrcode
        const { Html5Qrcode } = await import('html5-qrcode');
        const devices = await Html5Qrcode.getCameras();
        
        if (devices && devices.length > 0) {
          setCameras(devices);
          
          // Prefer back camera on mobile
          let cameraId = devices[0].id;
          if (isMobile) {
            const backCam = devices.find((d: any) => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
            );
            if (backCam) {
              cameraId = backCam.id;
            }
          }
          
          setSelectedCamera(cameraId);
        } else {
          const errorMsg = 'No cameras found on this device.';
          setError(errorMsg);
          if (onScanError) onScanError(errorMsg);
        }
      } catch (err) {
        console.error('Error initializing scanner:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize camera';
        setError(errorMsg);
        if (onScanError) onScanError(errorMsg);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeScanner();
  }, [isClient, onScanError]);

  useEffect(() => {
    if (!isClient || !selectedCamera || isInitializing) return;

    let stopped = false;
    const startScanner = async () => {
      try {
        setIsScanning(true);
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = scanner;

        // Mobile-optimized configuration
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        const config = {
          fps: isMobile ? 5 : 10,
          qrbox: { 
            width: isMobile ? 200 : 250, 
            height: isMobile ? 200 : 250 
          },
          aspectRatio: 1.0,
          disableFlip: false,
        };

        await scanner.start(
          selectedCamera,
          config,
          (decodedText: string) => {
            if (!stopped) {
              onScanSuccess(decodedText);
              scanner.stop().catch(console.error);
            }
          },
          (errorMessage: string) => {
            // Only log errors that are not continuous scanning errors
            if (!errorMessage.includes('NotFoundException') && 
                !errorMessage.includes('No QR code found')) {
              console.debug('QR scan error:', errorMessage);
            }
          }
        );
      } catch (err) {
        console.error('Error starting scanner:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to start QR scanner';
        setError(errorMsg);
        if (onScanError) onScanError(errorMsg);
        setIsScanning(false);
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
  }, [selectedCamera, isClient, onScanSuccess, onScanError, isInitializing]);

  if (!isClient) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
        <Text className="ml-2">Loading...</Text>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Spin size="large" />
          <Text className="block mt-2">Initializing camera...</Text>
          <Text type="secondary" className="block text-sm">Please allow camera access if prompted</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        className="mb-4 w-full"
      />
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div
        id="qr-reader"
        className="w-full max-w-xs aspect-square bg-black rounded-lg overflow-hidden mb-4"
        style={{ minHeight: 250 }}
      />
      {cameras.length > 1 && (
        <div className="w-full mb-2">
          <label htmlFor="camera-select" className="text-xs text-gray-500 block mb-1">Switch Camera:</label>
          <select
            id="camera-select"
            className="w-full border rounded p-2"
            value={selectedCamera || ''}
            onChange={e => setSelectedCamera(e.target.value)}
            disabled={isScanning}
          >
            {cameras.map(cam => (
              <option key={cam.id} value={cam.id}>{cam.label || cam.id}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default AutoQRScanner; 