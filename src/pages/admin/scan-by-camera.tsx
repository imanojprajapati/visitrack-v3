'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Modal, message, Alert, Card, Descriptions, Space, Select } from 'antd';
import { CameraOutlined, LoadingOutlined } from '@ant-design/icons';

interface CameraDevice {
  id: string;
  label: string;
}

const ScanByCamera: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState<any | null>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
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
      const { Html5Qrcode } = await import('html5-qrcode');
      const devices = await Html5Qrcode.getCameras();
      console.log('Available cameras:', devices);
      
      if (devices && devices.length) {
        setCameras(devices);
        // Select the back camera by default if available
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        const defaultCamera = backCamera ? backCamera.id : devices[0].id;
        setSelectedCamera(defaultCamera);
        console.log('Selected camera:', defaultCamera);
      } else {
        throw new Error('No cameras found on this device.');
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Unable to access device cameras. Please ensure camera permissions are granted.');
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient && showScanner && cameras.length === 0) {
      getCameras();
    }
  }, [isClient, showScanner, cameras.length, getCameras]);

  // Start QR scanner
  const startScanning = async () => {
    if (!isClient || !selectedCamera) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('Starting scanner with camera:', selectedCamera);

      // Check for secure context
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error('Camera access requires a secure connection (HTTPS) or localhost');
      }

      // Import and create scanner
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

      console.log('Scanner config:', config);

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
      console.log('Scanner started successfully');
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError(err instanceof Error ? err.message : 'Failed to start QR scanner');
      setLoading(false);
      setIsScanning(false);
    }
  };

  // Stop QR scanner
  const stopScanning = async () => {
    try {
      console.log('Stopping scanner...');
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
      setIsScanning(false);
      setIsProcessingScan(false);
      console.log('Scanner stopped');
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  // Handle camera change
  const handleCameraChange = (cameraId: string) => {
    setSelectedCamera(cameraId);
    if (isScanning) {
      stopScanning().then(() => {
        // Small delay to ensure cleanup is complete
        setTimeout(startScanning, 500);
      });
    }
  };

  // Handle QR code scan
  const handleQrCodeScan = async (qrData: string) => {
    try {
      console.log('Processing QR data:', qrData);
      setError(null);
      
      // Stop scanner first to prevent multiple scans
      await stopScanning();
      
      const { alreadyCheckedIn, visitor } = await checkInVisitorByQr(qrData, messageApi);
      setVisitorInfo(visitor);
      setAlreadyCheckedIn(alreadyCheckedIn);
      setShowScanner(false);
    } catch (err: any) {
      console.error('Error processing QR scan:', err);
      setError(err.message || 'Failed to process QR code');
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
        messageApi.error('Invalid visitor ID format. Please scan a valid QR code.');
        throw new Error('Invalid visitor ID format. Please scan a valid QR code.');
      }

      messageApi.loading('Checking visitor status...', 0);

      // Check if visitor has already been scanned
      const scanCheckResponse = await fetch(`/api/qrscans/check-visitor?visitorId=${visitorId}`);
      if (!scanCheckResponse.ok) {
        messageApi.destroy();
        messageApi.error('Failed to check visitor scan status');
        throw new Error('Failed to check visitor scan status');
      }
      
      const scanCheckData = await safeJson(scanCheckResponse);
      if (scanCheckData.exists) {
        messageApi.destroy();
        const existingScan = scanCheckData.scan;
        const scanTime = new Date(existingScan.scanTime).toLocaleString('en-GB', {
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
        
        messageApi.warning('Visitor has already been checked in');
        Modal.warning({
          title: 'Visitor Already Checked In',
          content: (
            <div>
              <p><strong>Name:</strong> {existingScan.name}</p>
              <p><strong>Company:</strong> {existingScan.company}</p>
              <p><strong>Event:</strong> {existingScan.eventName}</p>
              <p><strong>Entry Type:</strong> {existingScan.entryType}</p>
              <p><strong>Check-in Time:</strong> {scanTime}</p>
              <p className="mt-2 text-orange-600">This visitor has already been checked in!</p>
            </div>
          ),
          okText: 'OK',
        });
        return { alreadyCheckedIn: true, visitor: existingScan };
      }

      // Fetch visitor details
      messageApi.destroy();
      messageApi.loading('Fetching visitor details...', 0);
      
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
        messageApi.error(errorMessage);
        throw new Error(errorMessage);
      }

      const responseData = await safeJson(response);
      const visitorData = responseData.visitor || responseData;

      if (visitorData.status === 'Visited') {
        messageApi.destroy();
        messageApi.warning('Visitor has already been checked in');
        return { alreadyCheckedIn: true, visitor: visitorData };
      }

      // Create scan entry
      messageApi.destroy();
      messageApi.loading('Recording check-in...', 0);
      
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
        messageApi.error('Failed to record scan data');
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
        
        messageApi.error('Failed to update visitor status');
        throw new Error(errorData.message || 'Failed to update visitor status');
      }

      messageApi.destroy();
      messageApi.success(`Visitor ${visitorData.name} checked in successfully`);
      return { alreadyCheckedIn: false, visitor: { ...visitorData, ...scanData } };
    } catch (error: any) {
      messageApi.destroy();
      messageApi.error(error.message || 'Failed to process QR code');
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <LoadingOutlined style={{ fontSize: '24px' }} />
          <p className="mt-2">Loading scanner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {contextHolder}
      
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
          className="mb-4 w-full max-w-md"
        />
      )}

      {/* Error Display */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4 w-full max-w-md"
          closable
          onClose={() => setError(null)}
        />
      )}

      {/* Start Scanner Button */}
      {!visitorInfo && !showScanner && (
        <Button
          type="primary"
          size="large"
          icon={<CameraOutlined />}
          onClick={() => {
            setShowScanner(true);
            setError(null);
            setVisitorInfo(null);
            setAlreadyCheckedIn(false);
          }}
        >
          Start QR Scanner
        </Button>
      )}

      {/* Scanner Modal */}
      <Modal
        title="QR Code Scanner"
        open={showScanner}
        onCancel={() => {
          stopScanning();
          setShowScanner(false);
        }}
        footer={null}
        width={500}
        centered
        destroyOnClose
      >
        <div className="flex flex-col items-center space-y-4">
          {/* Camera Selection */}
          {cameras.length > 0 && (
            <Space direction="vertical" style={{ width: '100%' }}>
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
            </Space>
          )}

          {/* Scanner Controls */}
          {!isScanning ? (
            <Button
              type="primary"
              icon={loading ? <LoadingOutlined /> : <CameraOutlined />}
              size="large"
              onClick={startScanning}
              disabled={loading || !selectedCamera}
              block
            >
              {loading ? 'Initializing Camera...' : 'Start Scanning'}
            </Button>
          ) : (
            <Button 
              type="primary" 
              danger 
              onClick={stopScanning}
              block
              disabled={isProcessingScan}
            >
              Stop Scanner
            </Button>
          )}

          {/* Scanner Container */}
          <div className="w-full aspect-square bg-black rounded-lg overflow-hidden relative">
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

          {/* Instructions */}
          <div className="text-center text-sm text-gray-600">
            <p className="mb-1">Position the QR code within the frame to scan</p>
            <p className="text-xs">
              {isProcessingScan ? 'Processing previous scan...' : 
               isScanning ? 'Ready to scan' : 'Click "Start Scanning" to begin'}
            </p>
          </div>
        </div>
      </Modal>

      {/* Visitor Info Display */}
      {visitorInfo && (
        <div className="mt-6 w-full max-w-md">
          <Card
            title={alreadyCheckedIn ? 'Visitor Already Checked In' : 'Visitor Checked In Successfully'}
            bordered={true}
            className="mb-4"
            headStyle={{ 
              backgroundColor: alreadyCheckedIn ? '#fff7e6' : '#f6ffed',
              color: alreadyCheckedIn ? '#d46b08' : '#389e0d'
            }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Name">{visitorInfo.name}</Descriptions.Item>
              <Descriptions.Item label="Company">{visitorInfo.company}</Descriptions.Item>
              <Descriptions.Item label="Event">{visitorInfo.eventName}</Descriptions.Item>
              <Descriptions.Item label="Status">{visitorInfo.status}</Descriptions.Item>
              <Descriptions.Item label="Visitor ID">
                {visitorInfo.visitorId || visitorInfo._id}
              </Descriptions.Item>
              {visitorInfo.scanTime && (
                <Descriptions.Item label="Check-in Time">
                  {new Date(visitorInfo.scanTime).toLocaleString('en-GB', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
          
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              block
              onClick={() => {
                setShowScanner(true);
                setVisitorInfo(null);
                setError(null);
                setAlreadyCheckedIn(false);
              }}
            >
              Scan Another Code
            </Button>
            <Button
              block
              onClick={() => {
                setVisitorInfo(null);
                setAlreadyCheckedIn(false);
                setError(null);
              }}
            >
              Clear Results
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default ScanByCamera; 