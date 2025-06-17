import { useEffect, useRef, useState } from 'react';
import { message, Alert, Typography, Space, Modal, Button, Spin } from 'antd';
import Head from 'next/head';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const { Title, Text } = Typography;

// Client-side only QR Scanner component with mobile optimization
const QRScannerComponent: React.FC<{
  onScanSuccess: (result: string) => void;
  onError: (error: string) => void;
  onCameraChange: (cameras: { id: string; label: string }[]) => void;
}> = ({ onScanSuccess, onError, onCameraChange }) => {
  const [isClient, setIsClient] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const html5QrCodeRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
    console.log(`[QR Scanner Debug] ${info}`);
  };

  useEffect(() => {
    setIsClient(true);
    addDebugInfo('Component mounted');
  }, []);

  // Check camera permissions
  const checkCameraPermissions = async () => {
    try {
      addDebugInfo('Checking camera permissions...');
      if (!navigator.permissions) {
        addDebugInfo('Permissions API not supported');
        return 'unknown';
      }
      
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setPermissionStatus(permission.state);
      addDebugInfo(`Permission state: ${permission.state}`);
      
      permission.onchange = () => {
        setPermissionStatus(permission.state);
        addDebugInfo(`Permission changed to: ${permission.state}`);
      };
      
      return permission.state;
    } catch (error) {
      addDebugInfo(`Permission check error: ${error}`);
      console.log('Permission API not supported, will request directly');
      return 'unknown';
    }
  };

  // Request camera permissions explicitly
  const requestCameraPermissions = async () => {
    try {
      addDebugInfo('Requesting camera permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      addDebugInfo('Camera permission granted');
      return true;
    } catch (error) {
      console.error('Camera permission error:', error);
      setPermissionStatus('denied');
      addDebugInfo(`Camera permission denied: ${error}`);
      return false;
    }
  };

  useEffect(() => {
    if (!isClient) return;

    const initializeCameras = async () => {
      try {
        setIsInitializing(true);
        addDebugInfo('Starting camera initialization...');
        
        // Check if we're in a secure context (required for camera access)
        if (!window.isSecureContext) {
          addDebugInfo('Not in secure context');
          onError('Camera access requires a secure connection (HTTPS). Please use HTTPS or localhost.');
          return;
        }
        addDebugInfo('Secure context confirmed');

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          addDebugInfo('getUserMedia not supported');
          onError('Camera access is not supported in this browser.');
          return;
        }
        addDebugInfo('getUserMedia supported');

        // Check if we're on a mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        addDebugInfo(`Mobile device detected: ${isMobile}`);
        
        if (isMobile) {
          // Check and request camera permissions
          const permissionState = await checkCameraPermissions();
          
          if (permissionState === 'denied') {
            onError('Camera permission denied. Please enable camera access in your browser settings and refresh the page.');
            return;
          }
          
          if (permissionState === 'prompt' || permissionState === 'unknown') {
            const hasPermission = await requestCameraPermissions();
            if (!hasPermission) {
              onError('Camera permission denied. Please allow camera access and refresh the page.');
              return;
            }
          }
        }

        // Dynamically import Html5Qrcode only on client side
        addDebugInfo('Importing Html5Qrcode...');
        const { Html5Qrcode } = await import('html5-qrcode');
        addDebugInfo('Html5Qrcode imported successfully');
        
        const devices = await Html5Qrcode.getCameras();
        addDebugInfo(`Found ${devices?.length || 0} cameras`);
        
        if (devices && devices.length > 0) {
          setCameras(devices);
          
          // On mobile, prefer back camera; on desktop, use first available
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          let cameraId = devices[0].id;
          
          if (isMobile) {
            const backCam = devices.find((d: any) => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
            );
            if (backCam) {
              cameraId = backCam.id;
              addDebugInfo(`Selected back camera: ${backCam.label}`);
            } else {
              addDebugInfo('No back camera found, using first available');
            }
          }
          
          setSelectedCamera(cameraId);
          onCameraChange(devices);
          addDebugInfo(`Camera selected: ${cameraId}`);
        } else {
          addDebugInfo('No cameras found');
          onError('No cameras found on this device.');
        }
      } catch (err) {
        console.error('Error initializing cameras:', err);
        addDebugInfo(`Camera initialization error: ${err}`);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
          onError('Camera permission denied. Please allow camera access and refresh the page.');
        } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('No cameras')) {
          onError('No cameras found on this device.');
        } else if (errorMessage.includes('NotSupportedError')) {
          onError('Camera access is not supported in this browser.');
        } else {
          onError('Unable to access device cameras. Please ensure camera permissions are granted.');
        }
      } finally {
        setIsInitializing(false);
        addDebugInfo('Camera initialization completed');
      }
    };

    initializeCameras();
  }, [isClient, onError, onCameraChange]);

  useEffect(() => {
    if (!isClient || !selectedCamera || isInitializing) return;

    let stopped = false;
    const startScanner = async () => {
      try {
        setIsScanning(true);
        addDebugInfo('Starting QR scanner...');
        
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = scanner;

        // Mobile-optimized configuration
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        addDebugInfo(`Configuring scanner for mobile: ${isMobile}`);
        
        const config = {
          fps: isMobile ? 5 : 10, // Lower FPS on mobile for better performance
          qrbox: { 
            width: isMobile ? 200 : 250, 
            height: isMobile ? 200 : 250 
          },
          aspectRatio: 1.0,
          disableFlip: false,
          // Mobile-specific settings
          ...(isMobile && {
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            }
          })
        };

        addDebugInfo(`Scanner config: ${JSON.stringify(config)}`);

        await scanner.start(
          selectedCamera,
          config,
          (decodedText: string) => {
            if (!stopped) {
              addDebugInfo(`QR Code detected: ${decodedText}`);
              onScanSuccess(decodedText);
              scanner.stop().catch(console.error);
            }
          },
          (errorMessage: string) => {
            // Only log errors that are not continuous scanning errors
            if (!errorMessage.includes('NotFoundException') && 
                !errorMessage.includes('No QR code found')) {
              addDebugInfo(`QR scan error: ${errorMessage}`);
            }
          }
        );
        
        addDebugInfo('QR scanner started successfully');
      } catch (err) {
        console.error('Error starting scanner:', err);
        addDebugInfo(`Scanner start error: ${err}`);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
          onError('Camera permission denied. Please allow camera access and try again.');
        } else if (errorMessage.includes('NotFoundError')) {
          onError('Camera not found. Please check your camera connection.');
        } else if (errorMessage.includes('NotSupportedError')) {
          onError('Camera access is not supported in this browser.');
        } else {
          onError('Failed to start QR scanner. ' + errorMessage);
        }
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      stopped = true;
      addDebugInfo('Stopping scanner...');
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    };
  }, [selectedCamera, isClient, onScanSuccess, onError, isInitializing]);

  const handleCameraChange = (cameraId: string) => {
    addDebugInfo(`Switching to camera: ${cameraId}`);
    setSelectedCamera(cameraId);
  };

  if (!isClient) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
        <Text className="ml-2">Initializing camera...</Text>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Spin size="large" />
          <Text className="block mt-2">Initializing camera...</Text>
          <Text type="secondary" className="block text-sm">
            {permissionStatus === 'prompt' ? 'Please allow camera access when prompted' : 'Setting up scanner...'}
          </Text>
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
            <div className="mt-4 text-left text-xs bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
              <strong>Debug Info:</strong>
              {debugInfo.slice(-5).map((info, index) => (
                <div key={index} className="text-gray-600">{info}</div>
              ))}
            </div>
          )}
        </div>
      </div>
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
        <Space direction="vertical" className="w-full mb-2">
          <label htmlFor="camera-select" className="text-xs text-gray-500">Switch Camera:</label>
          <select
            id="camera-select"
            className="w-full border rounded p-2"
            value={selectedCamera || ''}
            onChange={e => handleCameraChange(e.target.value)}
            disabled={isScanning}
          >
            {cameras.map(cam => (
              <option key={cam.id} value={cam.id}>{cam.label || cam.id}</option>
            ))}
          </select>
        </Space>
      )}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
        <div className="w-full mt-4 text-left text-xs bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
          <strong>Debug Info:</strong>
          {debugInfo.slice(-10).map((info, index) => (
            <div key={index} className="text-gray-600">{info}</div>
          ))}
        </div>
      )}
    </div>
  );
};

const ScanByCameraPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
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

  const handleCameraChange = (cameras: { id: string; label: string }[]) => {
    setCameras(cameras);
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

          <QRScannerComponent
            onScanSuccess={handleScanSuccess}
            onError={handleScanError}
            onCameraChange={handleCameraChange}
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