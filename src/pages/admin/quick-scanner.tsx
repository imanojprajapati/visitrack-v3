'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button, message, Alert, Card, Space, Select, Typography } from 'antd';
import { 
  CameraOutlined, 
  LoadingOutlined, 
  QrcodeOutlined, 
  StopOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import AdminLayout from './layout';

const { Title, Text } = Typography;

interface CameraDevice {
  id: string;
  label: string;
}



const QuickScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const html5QrCodeRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get available cameras
  const getCameras = useCallback(async () => {
    if (!isClient) return;
    
    try {
      console.log('Getting cameras...');
      
      // First request permission to access cameras
      try {
        await navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
          stream.getTracks().forEach(track => track.stop());
        });
      } catch (permError) {
        console.warn('Permission request failed:', permError);
        throw new Error('Camera permission required. Please allow camera access and refresh the page.');
      }

      const { Html5Qrcode } = await import('html5-qrcode');
      const devices = await Html5Qrcode.getCameras();
      console.log('Available cameras:', devices);
      
      if (devices && devices.length) {
        setCameras(devices);
        // Select the back camera by default if available
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment') ||
          device.label.toLowerCase().includes('0')
        );
        const defaultCamera = backCamera ? backCamera.id : devices[0].id;
        setSelectedCamera(defaultCamera);
        console.log('Selected camera:', defaultCamera);
        messageApi.success(`📷 Found ${devices.length} camera(s). Ready to scan!`, 2);
      } else {
        throw new Error('No cameras found on this device.');
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unable to access device cameras.';
      setError(errorMsg);
      messageApi.error(`❌ ${errorMsg}`);
    }
  }, [isClient, messageApi]);

  useEffect(() => {
    if (isClient && cameras.length === 0) {
      getCameras();
    }
  }, [isClient, cameras.length, getCameras]);

  // Start QR scanner
  const startScanning = async () => {
    if (!isClient || !selectedCamera) {
      messageApi.error('❌ Camera not selected or client not ready');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('Starting continuous scanner with camera:', selectedCamera);
      messageApi.loading('Initializing camera...', 2);

      // Check for secure context
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error('Camera access requires a secure connection (HTTPS) or localhost. Please use https:// or localhost');
      }

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported by this browser');
      }

      // Request camera permission first
      try {
        console.log('Requesting camera permission...');
        await navigator.mediaDevices.getUserMedia({ 
          video: { deviceId: selectedCamera } 
        }).then(stream => {
          // Stop the stream immediately, we just needed permission
          stream.getTracks().forEach(track => track.stop());
          console.log('Camera permission granted');
        });
      } catch (permissionError) {
        console.error('Camera permission error:', permissionError);
        throw new Error('Camera permission denied. Please allow camera access and try again.');
      }

      // Wait a moment for any cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if QR reader element exists
      const qrReaderElement = document.getElementById('qr-reader');
      if (!qrReaderElement) {
        throw new Error('QR reader element not found in DOM');
      }

      // Clear any existing content
      qrReaderElement.innerHTML = '';

      // Import and create scanner
      console.log('Importing HTML5-QRCode library...');
      const { Html5Qrcode } = await import('html5-qrcode');
      
      console.log('Creating scanner instance...');
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;

      // Mobile-optimized configuration
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const config = {
        fps: isMobile ? 5 : 8,
        qrbox: { 
          width: isMobile ? 180 : 220, 
          height: isMobile ? 180 : 220 
        },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: "environment", // Use back camera
          deviceId: selectedCamera
        }
      };

      console.log('Scanner config:', config);
      console.log('Starting scanner with camera ID:', selectedCamera);

      await scanner.start(
        selectedCamera,
        config,
        async (decodedText: string) => {
          console.log('QR code detected:', decodedText);
          if (!isProcessingScan) {
            setIsProcessingScan(true);
            await handleQrCodeScan(decodedText);
          }
        },
        (errorMessage: string) => {
          // Only log errors that are not continuous scanning errors
          if (!errorMessage.includes('NotFoundException') && 
              !errorMessage.includes('No QR code found') &&
              !errorMessage.includes('No MultiFormat Readers')) {
            console.debug('QR scan error:', errorMessage);
          }
        }
      );

      setIsScanning(true);
      setLoading(false);
      messageApi.destroy();
      messageApi.success('🎯 Quick Scanner started! Ready to scan QR codes continuously.', 3);
      console.log('Continuous scanner started successfully');
    } catch (err) {
      console.error('Error starting scanner:', err);
      let errorMsg = 'Failed to start QR scanner';
      
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === 'string') {
        errorMsg = err;
      }

      // Provide specific error messages for common issues
      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        errorMsg = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
      } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('DeviceNotFoundError')) {
        errorMsg = 'Camera not found. Please check if your camera is connected and not being used by another application.';
      } else if (errorMsg.includes('NotReadableError') || errorMsg.includes('TrackStartError')) {
        errorMsg = 'Camera is busy or being used by another application. Please close other camera apps and try again.';
      } else if (errorMsg.includes('OverconstrainedError')) {
        errorMsg = 'Camera configuration not supported. Try selecting a different camera.';
      } else if (errorMsg.includes('secure context') || errorMsg.includes('HTTPS')) {
        errorMsg = 'Camera requires HTTPS or localhost. Please use https:// or run on localhost.';
      }

      setError(errorMsg);
      messageApi.destroy();
      messageApi.error(`❌ ${errorMsg}`);
      setLoading(false);
      setIsScanning(false);
      
      // Cleanup on error
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().catch(console.error);
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }
    }
  };

  // Stop QR scanner
  const stopScanning = async () => {
    try {
      console.log('Stopping continuous scanner...');
      messageApi.loading('Stopping scanner...', 1);
      
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
      setIsScanning(false);
      setIsProcessingScan(false);
      messageApi.destroy();
      messageApi.info('🛑 Scanner stopped. Click "Start Quick Scanning" to resume.', 2);
      console.log('Continuous scanner stopped');
    } catch (err) {
      console.error('Error stopping scanner:', err);
      messageApi.destroy();
      messageApi.error('❌ Error stopping scanner');
    }
  };

  // Handle camera change
  const handleCameraChange = (cameraId: string) => {
    setSelectedCamera(cameraId);
    if (isScanning) {
      messageApi.info('📷 Switching camera...', 1);
      stopScanning().then(() => {
        // Small delay to ensure cleanup is complete
        setTimeout(startScanning, 500);
      });
    }
  };

  // Handle QR code scan - continuous mode
  const handleQrCodeScan = async (qrData: string) => {
    try {
      console.log('Processing QR data in continuous mode:', qrData);
      
      const { alreadyCheckedIn, visitor } = await checkInVisitorByQr(qrData, messageApi);
      
      if (alreadyCheckedIn) {
        messageApi.warning(`⚠️ ${visitor.name} already visited! Continue scanning...`, 3);
      } else {
        messageApi.success(`✅ ${visitor.name} checked in successfully! Ready for next scan...`, 3);
      }
      
      // Don't stop scanning - continue for next QR code
      console.log('Scan processed, continuing to next scan...');
    } catch (err: any) {
      console.error('Error processing QR scan:', err);
      messageApi.error(`❌ ${err.message || 'Failed to process QR code'}. Continue scanning...`, 3);
    } finally {
      setIsProcessingScan(false);
    }
  };

  // Helper for safe JSON parsing
  async function safeJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  const checkInVisitorByQr = async (qrData: string, messageApi: any) => {
    try {
      const visitorId = qrData.trim();
      if (!visitorId) throw new Error('Invalid QR code data');
      
      const objectIdPattern = /^[0-9a-fA-F]{24}$/;
      if (!objectIdPattern.test(visitorId)) {
        throw new Error('Invalid visitor ID format. Please scan a valid QR code.');
      }

      messageApi.loading('🔍 Checking visitor status...', 1);

      // Check if visitor has already been scanned
      const scanCheckResponse = await fetch(`/api/qrscans/check-visitor?visitorId=${visitorId}`);
      if (!scanCheckResponse.ok) {
        messageApi.destroy();
        throw new Error('Failed to check visitor scan status');
      }
      
      const scanCheckData = await safeJson(scanCheckResponse);
      if (scanCheckData.exists) {
        messageApi.destroy();
        const existingScan = scanCheckData.scan;
        const scanTime = new Date(existingScan.scanTime).toLocaleString('en-GB', {
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit',
        });
        
        return { 
          alreadyCheckedIn: true, 
          visitor: { 
            ...existingScan,
            displayTime: scanTime
          } 
        };
      }

      // Fetch visitor details
      messageApi.destroy();
      messageApi.loading('📋 Fetching visitor details...', 1);
      
      const response = await fetch(`/api/visitors/${visitorId}`);
      if (!response.ok) {
        messageApi.destroy();
        let errorMessage = 'Visitor not found.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          if (response.status === 500) errorMessage = 'Server error occurred while fetching visitor data.';
          else if (response.status === 404) errorMessage = 'Visitor not found with the provided ID.';
        }
        throw new Error(errorMessage);
      }

      const responseData = await safeJson(response);
      const visitorData = responseData.visitor || responseData;

      if (visitorData.status === 'Visited') {
        messageApi.destroy();
        return { alreadyCheckedIn: true, visitor: visitorData };
      }

      // Create scan entry
      messageApi.destroy();
      messageApi.loading('📝 Recording check-in...', 1);
      
      const scanData = {
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

      // Record scan data first
      const scanResponse = await fetch('/api/qrscans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scanData),
      });

      if (!scanResponse.ok) {
        messageApi.destroy();
        const errorData = await safeJson(scanResponse);
        throw new Error(errorData.message || 'Failed to record scan data');
      }

      // Update visitor status
      const updateResponse = await fetch(`/api/visitors/${visitorId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Visited', 
          checkInTime: new Date().toISOString() 
        }),
      });

      if (!updateResponse.ok) {
        messageApi.destroy();
        const errorData = await safeJson(updateResponse);
        
        // Attempt to mark scan as failed
        try {
          await fetch(`/api/qrscans/${scanData.visitorId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              status: 'failed', 
              error: 'Failed to update visitor status' 
            }),
          });
        } catch (patchError) {
          console.error('Failed to update scan status:', patchError);
        }
        
        throw new Error(errorData.message || 'Failed to update visitor status');
      }

      messageApi.destroy();
      return { alreadyCheckedIn: false, visitor: { ...visitorData, ...scanData } };
    } catch (error: any) {
      messageApi.destroy();
      throw error;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error);
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    };
  }, []);

  if (!isClient) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center">
            <LoadingOutlined style={{ fontSize: '24px' }} />
            <p className="mt-2">Loading Quick Scanner...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        {contextHolder}
        
        {/* Header */}
        <div className="text-center mb-8">
          <Title level={2} className="flex items-center justify-center gap-2">
            <QrcodeOutlined />
            Quick Scanner
          </Title>
          <Text type="secondary">
            Continuous QR code scanning for quick visitor check-ins
          </Text>
        </div>

        {/* Security Warning */}
        {typeof window !== 'undefined' && !window.isSecureContext && (
          <Alert
            message="Security Warning"
            description={
              <div>
                <p>Camera access is restricted because this page is not served over HTTPS.</p>
                <p>Please try one of the following:</p>
                <ul>
                  <li>Access using localhost:3000 (recommended)</li>
                  <li>Enable "Insecure origins treated as secure" in chrome://flags and add this site</li>
                </ul>
              </div>
            }
            type="warning"
            showIcon
            className="mb-6 w-full max-w-2xl"
          />
        )}



        {/* Error Display */}
        {error && (
          <Alert
            message="Scanner Error"
            description={error}
            type="error"
            showIcon
            className="mb-6 w-full max-w-2xl"
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* Main Control Panel */}
        <Card className="w-full max-w-2xl mb-6">
          <div className="flex flex-col items-center space-y-4">
            {/* Camera Selection */}
            {cameras.length > 0 && (
              <div className="w-full">
                <Text strong className="block mb-2">Camera Selection:</Text>
                <Select
                  value={selectedCamera}
                  onChange={handleCameraChange}
                  style={{ width: '100%' }}
                  placeholder="Select camera"
                  disabled={isScanning || loading}
                  options={cameras.map(camera => ({
                    label: camera.label || `Camera ${camera.id}`,
                    value: camera.id
                  }))}
                />
              </div>
            )}

            {/* Scanner Control Button */}
            {!isScanning ? (
              <Button
                type="primary"
                size="large"
                icon={loading ? <LoadingOutlined /> : <PlayCircleOutlined />}
                onClick={startScanning}
                disabled={loading || !selectedCamera}
                className="w-full h-16 text-lg"
              >
                {loading ? 'Initializing Camera...' : 'Start Quick Scanning'}
              </Button>
            ) : (
              <Button 
                type="primary" 
                danger
                size="large"
                icon={<StopOutlined />}
                onClick={stopScanning}
                disabled={loading}
                className="w-full h-16 text-lg"
              >
                Stop Scanner
              </Button>
            )}

            {/* QR Scanner Display */}
            <div className="w-full">
              {isScanning && (
                <div className="mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <Text strong className="text-green-700">Scanner Active</Text>
                    </div>
                    <Text type="secondary" className="text-sm">
                      {isProcessingScan 
                        ? 'Processing scan...' 
                        : 'Ready to scan QR codes continuously'
                      }
                    </Text>
                  </div>
                  
                  {/* Scanner Container */}
                  <div className="w-full aspect-square bg-black rounded-lg overflow-hidden relative max-w-md mx-auto">
                    <div id="qr-reader" className="w-full h-full"></div>
                    {isProcessingScan && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                          <p>Processing scan...</p>
                        </div>
                      </div>
                                         )}
                   </div>
                   
                   {/* Scanner Instructions */}
                   <div className="text-center mt-4">
                     <Text type="secondary" className="text-sm">
                       Position QR codes within the camera view to scan automatically
                     </Text>
                   </div>
                 </div>
               )}
              
              {!isScanning && !loading && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <Text type="secondary">
                    Click "Start Quick Scanning" to begin continuous scanning
                  </Text>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="w-full max-w-2xl mb-4">
          <Title level={4}>How to Use Quick Scanner:</Title>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Click "Start Quick Scanning" to activate continuous scanning mode</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Point your camera at visitor QR codes to automatically check them in</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>All check-in results and messages will appear as toast notifications</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>Scanner stays active - no need to restart between scans</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">5</span>
              <span>Already visited visitors will show warning messages but scanning continues</span>
            </div>
          </div>
        </Card>

        {/* Troubleshooting */}
        <Card className="w-full max-w-2xl">
          <Title level={4}>Troubleshooting:</Title>
          <div className="space-y-3 text-sm">
            <div>
              <Text strong className="text-red-600">❌ "Camera permission denied"</Text>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li>Click the camera icon in your browser's address bar and allow camera access</li>
                <li>Refresh the page after granting permission</li>
                <li>Check if another app is using the camera</li>
              </ul>
            </div>
            <div>
              <Text strong className="text-red-600">❌ "Camera requires HTTPS"</Text>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li>Use https:// instead of http:// in the URL</li>
                <li>Or access via localhost (e.g., localhost:3000)</li>
              </ul>
            </div>
            <div>
              <Text strong className="text-red-600">❌ "Camera is busy"</Text>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li>Close other camera apps (Zoom, Skype, etc.)</li>
                <li>Close other browser tabs using the camera</li>
                <li>Restart your browser</li>
              </ul>
            </div>
            <div>
              <Text strong className="text-red-600">❌ "No cameras found"</Text>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li>Check if your camera is properly connected</li>
                <li>Try a different browser (Chrome, Firefox, Safari)</li>
                <li>Restart your device if necessary</li>
              </ul>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200 mt-4">
              <Text strong className="text-green-700">💡 Best Practices:</Text>
              <ul className="mt-1 ml-4 list-disc space-y-1 text-green-700">
                <li>Use Chrome or Firefox for best compatibility</li>
                <li>Ensure good lighting for better QR code scanning</li>
                <li>Hold QR codes steady within the camera frame</li>
                <li>Use the back camera for better scanning (if available)</li>
              </ul>
            </div>
          </div>
        </Card>


      </div>
    </AdminLayout>
  );
};

export default QuickScanner; 