import React, { useEffect, useState, useRef } from 'react';
import { message, Alert, Typography, Space, Modal, Button, Spin, Card } from 'antd';
import Head from 'next/head';
import Image from 'next/image';

const { Title, Text } = Typography;

interface VisitorData {
  _id?: string;
  id?: string;
  visitorId?: string;
  eventId?: string;
  registrationId?: string;
  name: string;
  company: string;
  designation: string;
  email: string;
  phone: string;
  eventName: string;
  status: string;
}

interface QRScan {
  visitorId: string;
  eventId?: string;
  registrationId?: string;
  name?: string;
  company?: string;
  eventName?: string;
  scanTime: string;
  entryType: 'QR' | 'Manual';
  status: 'success' | 'failed' | 'Visited';
  deviceInfo?: string;
  error?: string;
}

// Simple QR Scanner component embedded in the page
const QRScannerComponent: React.FC<{
  onScanSuccess: (result: string) => void;
  onScanError: (error: string) => void;
  isActive: boolean;
}> = ({ onScanSuccess, onScanError, isActive }) => {
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
    if (!isClient || !isActive) return;

    const initializeScanner = async () => {
      try {
        setIsInitializing(true);
        
        // Check if we're in a secure context
        if (!window.isSecureContext) {
          const errorMsg = 'Camera access requires a secure connection (HTTPS). Please use HTTPS or localhost.';
          setError(errorMsg);
          onScanError(errorMsg);
          return;
        }

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const errorMsg = 'Camera access is not supported in this browser.';
          setError(errorMsg);
          onScanError(errorMsg);
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
            onScanError(errorMsg);
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
          onScanError(errorMsg);
        }
      } catch (err) {
        console.error('Error initializing scanner:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize camera';
        setError(errorMsg);
        onScanError(errorMsg);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeScanner();
  }, [isClient, isActive, onScanError]);

  useEffect(() => {
    if (!isClient || !selectedCamera || isInitializing || !isActive) return;

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
        onScanError(errorMsg);
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
  }, [selectedCamera, isClient, onScanSuccess, onScanError, isInitializing, isActive]);

  if (!isClient || !isActive) {
    return null;
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

// ErrorBoundary component for catching render errors
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    // Log error to console
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#4f46e5] to-[#6366f1] p-2">
          <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-4 flex flex-col items-center">
            <Alert
              message="Application Error"
              description={this.state.error?.message || 'A client-side exception has occurred.'}
              type="error"
              showIcon
              className="mb-4 w-full"
            />
            <Button type="primary" onClick={() => window.location.reload()}>Reload Page</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ScanByCameraPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{
    visitorId: string;
    name: string;
    company: string;
    eventName: string;
    status: string;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleScanSuccess = async (qrData: string) => {
    try {
      // Extract visitor ID from QR code
      const visitorId = qrData.trim();
      if (!visitorId) {
        throw new Error('Invalid QR code data');
      }

      // Validate that the visitor ID looks like a valid MongoDB ObjectId
      const objectIdPattern = /^[0-9a-fA-F]{24}$/;
      if (!objectIdPattern.test(visitorId)) {
        throw new Error('Invalid visitor ID format. Please scan a valid QR code.');
      }

      setIsProcessing(true);

      // Show the scanned ID in a popup
      Modal.info({
        title: 'QR Code Scanned',
        content: (
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">Visitor ID:</p>
            <p className="text-2xl font-mono bg-gray-100 p-2 rounded">{visitorId}</p>
            <p className="text-sm text-gray-600 mt-2">Click "Process" to check in this visitor</p>
          </div>
        ),
        okText: 'Process',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            // First check if visitor already exists in qrscans collection
            const scanCheckResponse = await fetch(`/api/qrscans/check-visitor?visitorId=${visitorId}`);
            if (!scanCheckResponse.ok) {
              throw new Error('Failed to check visitor scan status');
            }
            
            const scanCheckData = await scanCheckResponse.json();
            
            if (scanCheckData.exists) {
              // Visitor already exists in qrscans collection
              const existingScan = scanCheckData.scan;
              const scanTime = new Date(existingScan.scanTime).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              
              Modal.warning({
                title: 'Visitor Already Checked In',
                content: (
                  <div className="text-center">
                    <p className="text-lg font-semibold mb-2">{existingScan.name}</p>
                    <p className="text-sm text-gray-600 mb-2">Company: {existingScan.company}</p>
                    <p className="text-sm text-gray-600 mb-2">Event: {existingScan.eventName}</p>
                    <p className="text-sm text-gray-600 mb-2">Entry Type: {existingScan.entryType}</p>
                    <p className="text-sm text-gray-600 mb-2">Check-in Time: {scanTime}</p>
                    <p className="text-sm text-red-600 font-semibold">This visitor has already been checked in!</p>
                  </div>
                ),
                okText: 'OK',
                onOk: () => {
                  setIsProcessing(false);
                  setIsScanning(false);
                }
              });
              return;
            }

            // If visitor doesn't exist in qrscans, proceed with normal check-in process
            // First check if visitor exists in visitors collection
            const response = await fetch(`/api/visitors/${visitorId}`);
            if (!response.ok) {
              let errorMessage = 'Visitor not found.';
              try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
              } catch (parseError) {
                console.error('Failed to parse error response:', parseError);
                if (response.status === 500) {
                  errorMessage = 'Server error occurred while fetching visitor data.';
                } else if (response.status === 404) {
                  errorMessage = 'Visitor not found with the provided ID.';
                }
              }
              throw new Error(errorMessage);
            }
            
            let responseData;
            try {
              responseData = await response.json();
            } catch (parseError) {
              console.error('Failed to parse visitor response:', parseError);
              throw new Error('Invalid response format from server.');
            }
            
            const visitorData = responseData.visitor || responseData; // Handle both response formats

            // Check if visitor is already visited
            if (visitorData.status === 'Visited') {
              message.warning('Visitor has already been checked in');
              setIsProcessing(false);
              setIsScanning(false);
              return;
            }

            // Create scan record
            const scanData: QRScan = {
              visitorId: visitorData._id || visitorData.id || visitorId,
              eventId: visitorData.eventId,
              registrationId: visitorData.registrationId,
              name: visitorData.name,
              company: visitorData.company,
              eventName: visitorData.eventName,
              scanTime: new Date().toISOString(),
              entryType: 'QR',
              status: 'Visited',
              deviceInfo: navigator.userAgent
            };

            // Store scan data
            const scanResponse = await fetch('/api/qrscans', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(scanData),
            });

            if (!scanResponse.ok) {
              const errorData = await scanResponse.json();
              throw new Error(errorData.message || 'Failed to record scan data');
            }

            // Update visitor status to Visited
            const updateResponse = await fetch(`/api/visitors/${visitorId}/check-in`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'Visited',
                checkInTime: new Date().toISOString()
              }),
            });

            if (!updateResponse.ok) {
              const errorData = await updateResponse.json();
              // If visitor update fails, update scan record status
              await fetch(`/api/qrscans/${scanData.visitorId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'failed',
                  error: 'Failed to update visitor status'
                }),
              });
              throw new Error(errorData.message || 'Failed to update visitor status');
            }

            // Set the scan result for display
            setLastScanResult({
              visitorId: visitorData._id || visitorData.id || visitorId,
              name: visitorData.name,
              company: visitorData.company,
              eventName: visitorData.eventName,
              status: 'Visited'
            });

            message.success(`Visitor ${visitorData.name} checked in successfully`);
            setIsScanning(false);
          } catch (error) {
            console.error('Error processing visitor:', error);
            message.error(error instanceof Error ? error.message : 'Failed to process visitor');
          } finally {
            setIsProcessing(false);
          }
        },
        onCancel: () => {
          setIsProcessing(false);
        }
      });
    } catch (error) {
      console.error('Error scanning QR code:', error);
      message.error(error instanceof Error ? error.message : 'Failed to process QR code');
      setIsProcessing(false);
    }
  };

  const handleScanError = (error: string) => {
    setError(error);
  };

  const handleStartScan = () => {
    setIsScanning(true);
    setError(null);
    setLastScanResult(null);
  };

  const handleScanAnother = () => {
    setLastScanResult(null);
    setIsScanning(true);
    setError(null);
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

          {/* Show Scan Button when not scanning */}
          {!isScanning && !lastScanResult && (
            <div className="w-full text-center">
              <Text type="secondary" className="block mb-4">
                Click the button below to start scanning QR codes for visitor check-in.
              </Text>
              <Button 
                type="primary" 
                size="large" 
                onClick={handleStartScan}
                loading={isProcessing}
                className="w-full"
              >
                Start Scanning
              </Button>
            </div>
          )}

          {/* Show QR Scanner when scanning */}
          {isScanning && (
            <>
              <Text type="secondary" className="block text-center mb-4">
                Position the QR code within the frame to scan.
              </Text>
              <QRScannerComponent
                onScanSuccess={handleScanSuccess}
                onScanError={handleScanError}
                isActive={isScanning}
              />
              <Button 
                type="default" 
                onClick={() => setIsScanning(false)}
                className="mt-4"
                disabled={isProcessing}
              >
                Cancel Scanning
              </Button>
            </>
          )}

          {/* Show Scan Result */}
          {lastScanResult && (
            <div className="w-full text-center">
              <Card className="mb-4">
                <div className="text-center">
                  <Title level={4} className="mb-2 text-green-600">✓ Check-in Successful</Title>
                  <div className="space-y-2 text-left">
                    <p><strong>Name:</strong> {lastScanResult.name}</p>
                    <p><strong>Company:</strong> {lastScanResult.company}</p>
                    <p><strong>Event:</strong> {lastScanResult.eventName}</p>
                    <p><strong>Status:</strong> <span className="text-green-600 font-semibold">{lastScanResult.status}</span></p>
                    <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              <Button 
                type="primary" 
                size="large" 
                onClick={handleScanAnother}
                className="w-full"
              >
                Scan Another Code
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Wrap the page in ErrorBoundary
const WrappedScanByCameraPage = () => (
  <ErrorBoundary>
    <ScanByCameraPage />
  </ErrorBoundary>
);

export default WrappedScanByCameraPage; 