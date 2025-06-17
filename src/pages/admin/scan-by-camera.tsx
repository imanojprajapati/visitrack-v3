'use client'
import React, { useEffect, useState, useRef } from 'react';
import { Alert, Button, Spin, Typography, Modal, message, Card, Descriptions, Select, Space } from 'antd';
import { CameraOutlined, LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

// Define the CameraDevice type
interface CameraDevice {
  id: string;
  label: string;
}

const QRScanner: React.FC<{
  onScanSuccess: (result: string) => void;
  onScanError: (error: string) => void;
  isActive: boolean;
}> = ({ onScanSuccess, onScanError, isActive }) => {
  const [isClient, setIsClient] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [containerReady, setContainerReady] = useState(false);
  const html5QrCodeRef = useRef<any>(null);
  const scannerContainerId = 'qr-reader-scan-by-camera';
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure containerReady is set after the parent div is mounted
  useEffect(() => {
    setIsClient(true);
    if (containerRef.current) setContainerReady(true);
  }, []);

  // If the parent container is not ready, set it as soon as it is mounted
  useEffect(() => {
    if (!containerReady && containerRef.current) setContainerReady(true);
  }, [containerReady, containerRef.current]);

  // Cleanup function to properly stop and clear scanner
  const cleanupScanner = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch {}
  };

  // Camera initialization
  useEffect(() => {
    if (!isClient || !isActive || !containerReady) return;
    let cancelled = false;
    const initialize = async () => {
      setIsInitializing(true);
      setError(null);
      setLoading(true);
      await cleanupScanner();
      try {
        if (!window.isSecureContext) throw new Error('Camera access requires HTTPS or localhost.');
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not supported in this browser.');
        const { Html5Qrcode } = await import('html5-qrcode');
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) throw new Error('No cameras found.');
        setCameras(devices);
        setSelectedCamera(devices[0].id);
      } catch (err) {
        setError((err as Error).message);
        onScanError((err as Error).message);
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
          setLoading(false);
        }
      }
    };
    initialize();
    return () => { cancelled = true; };
  }, [isClient, isActive, containerReady]);

  // Start scanner when selectedCamera changes
  useEffect(() => {
    if (!isClient || !isActive || !selectedCamera || !containerReady) return;
    let stopped = false;
    let cancelled = false;
    setIsInitializing(true);
    setError(null);
    const start = async () => {
      await cleanupScanner();
      await new Promise(res => setTimeout(res, 100));
      // Ensure the container exists
      let container = document.getElementById(scannerContainerId);
      if (!container && containerRef.current) {
        container = document.createElement('div');
        container.id = scannerContainerId;
        container.style.width = '100%';
        container.style.height = '100%';
        containerRef.current.appendChild(container);
      }
      if (!container) {
        setError('Failed to create scanner container');
        setIsInitializing(false);
        return;
      }
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = scanner;
        await scanner.start(
          selectedCamera,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            if (!stopped) {
              onScanSuccess(decodedText);
              scanner.stop().catch(() => {});
            }
          },
          (errorMessage: string) => {
            if (
              !/notfoundexception|no qr code found|no multiformat readers were able to detect the code|no qr code detected|no barcode or no qr code detected/i.test(errorMessage)
            ) {
              setError(errorMessage);
              onScanError(errorMessage);
            }
          }
        );
      } catch (err) {
        setError((err as Error).message);
        onScanError((err as Error).message);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };
    start();
    return () => { stopped = true; cancelled = true; cleanupScanner(); };
  }, [selectedCamera, isClient, isActive, containerReady]);

  // Camera change handler
  const handleCameraChange = (cameraId: string) => {
    if (cameraId !== selectedCamera) {
      setIsInitializing(true);
      setSelectedCamera(cameraId);
    }
  };

  if (!isClient || !isActive || !containerReady) return null;
  if (isInitializing || loading) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
        <Text className="mt-2">Initializing camera...</Text>
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
        className="mb-4"
      />
    );
  }
  return (
    <div className="flex flex-col items-center w-full max-w-md">
      {cameras.length > 1 && (
        <Space direction="vertical" className="w-full mb-4">
          <Select
            value={selectedCamera || undefined}
            onChange={handleCameraChange}
            style={{ width: '100%' }}
            options={cameras.map(camera => ({
              label: camera.label || `Camera ${camera.id}`,
              value: camera.id
            }))}
            disabled={isInitializing || loading}
          />
        </Space>
      )}
      <div 
        ref={containerRef}
        style={{ 
          width: '100%',
          maxWidth: '300px',
          aspectRatio: '1',
          background: '#000',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div 
          id={scannerContainerId}
          style={{ 
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0
          }} 
        />
      </div>
    </div>
  );
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

    // Check if visitor has already been scanned
    const scanCheckResponse = await fetch(`/api/qrscans/check-visitor?visitorId=${visitorId}`);
    if (!scanCheckResponse.ok) {
      messageApi.error('Failed to check visitor scan status');
      throw new Error('Failed to check visitor scan status');
    }
    
    const scanCheckData = await safeJson(scanCheckResponse);
    if (scanCheckData.exists) {
      const existingScan = scanCheckData.scan;
      const scanTime = new Date(existingScan.scanTime).toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
      
      messageApi.warning('Visitor has already been checked in');
      Modal.warning({
        title: 'Visitor Already Checked In',
        content: `Name: ${existingScan.name}\nCompany: ${existingScan.company}\nEvent: ${existingScan.eventName}\nEntry Type: ${existingScan.entryType}\nCheck-in Time: ${scanTime}\nThis visitor has already been checked in!`,
        okText: 'OK',
      });
      return { alreadyCheckedIn: true, visitor: existingScan };
    }

    // Fetch visitor details
    const response = await fetch(`/api/visitors/${visitorId}`);
    if (!response.ok) {
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
      messageApi.warning('Visitor has already been checked in');
      return { alreadyCheckedIn: true, visitor: visitorData };
    }

    // Create scan entry
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

    messageApi.loading('Recording entry...');
    
    // Record scan data
    const scanResponse = await fetch('/api/qrscans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scanData),
    });

    if (!scanResponse.ok) {
      const errorData = await safeJson(scanResponse);
      messageApi.error('Failed to record scan data');
      throw new Error(errorData.message || 'Failed to record scan data');
    }

    // Update visitor status
    const updateResponse = await fetch(`/api/visitors/${visitorId}/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Visited', checkInTime: new Date().toISOString() }),
    });

    if (!updateResponse.ok) {
      const errorData = await safeJson(updateResponse);
      // Attempt to mark scan as failed
      await fetch(`/api/qrscans/${scanData.visitorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'failed', error: 'Failed to update visitor status' }),
      });
      messageApi.error('Failed to update visitor status');
      throw new Error(errorData.message || 'Failed to update visitor status');
    }

    messageApi.success(`Visitor ${visitorData.name} checked in successfully`);
    return { alreadyCheckedIn: false, visitor: { ...visitorData, ...scanData } };
  } catch (error: any) {
    messageApi.error(error.message || 'Failed to process QR code');
    throw error;
  }
};

const MinimalScanByCameraPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState<any | null>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [errorDebounce, setErrorDebounce] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setErrorDebounce(error), 100);
      return () => clearTimeout(timeout);
    } else {
      setErrorDebounce(null);
    }
  }, [error]);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      window.onerror = function (msg, url, line, col, err) {
        setError(`Global error: ${msg} at ${url}:${line}:${col} - ${err && err.stack ? err.stack : ''}`);
        return true;
      };
      window.onunhandledrejection = function (event) {
        setError(`Unhandled promise rejection: ${event.reason && event.reason.stack ? event.reason.stack : event.reason}`);
        return true;
      };
      return () => {
        window.onerror = null;
        window.onunhandledrejection = null;
      };
    }
  }, []);

  const handleScanSuccess = async (result: string) => {
    setIsScanning(false);
    setError(null);
    setErrorDebounce(null);
    setLoading(true);
    try {
      const { alreadyCheckedIn, visitor } = await checkInVisitorByQr(result, messageApi);
      setVisitorInfo(visitor);
      setAlreadyCheckedIn(alreadyCheckedIn);
    } catch (err: any) {
      setError(err.message || 'Failed to process QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleScanError = (err: string) => {
    const normalized = err.toLowerCase();
    if (
      !normalized.includes('notfoundexception') &&
      !normalized.includes('no qr code found') &&
      !normalized.includes('no multiformat readers were able to detect the code') &&
      !normalized.includes('no qr code detected') &&
      !normalized.includes('no barcode or no qr code detected')
    ) {
      setError(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {contextHolder}
      
      {errorDebounce && (
        <Alert 
          message="Error" 
          description={errorDebounce} 
          type="error" 
          showIcon 
          className="mb-4 w-full max-w-md" 
        />
      )}

      {!isScanning && !visitorInfo && (
        <Button
          type="primary"
          size="large"
          icon={loading ? <LoadingOutlined /> : <CameraOutlined />}
          onClick={() => {
            setIsScanning(true);
            setError(null);
            setErrorDebounce(null);
            setVisitorInfo(null);
            setAlreadyCheckedIn(false);
          }}
          loading={loading}
        >
          Start Scanning
        </Button>
      )}

      {isScanning && (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          isActive={isScanning}
        />
      )}

      {visitorInfo && (
        <div className="mt-6 w-full max-w-md">
          <Card 
            title={alreadyCheckedIn ? 'Visitor Already Checked In' : 'Visitor Checked In'} 
            bordered={true} 
            className="mb-4"
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Name">{visitorInfo.name}</Descriptions.Item>
              <Descriptions.Item label="Company">{visitorInfo.company}</Descriptions.Item>
              <Descriptions.Item label="Event">{visitorInfo.eventName}</Descriptions.Item>
              <Descriptions.Item label="Status">{visitorInfo.status}</Descriptions.Item>
              <Descriptions.Item label="Visitor ID">{visitorInfo.visitorId || visitorInfo._id}</Descriptions.Item>
              {visitorInfo.scanTime && (
                <Descriptions.Item label="Scan Time">
                  {new Date(visitorInfo.scanTime).toLocaleString('en-GB')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
          
          <Button 
            type="primary" 
            block
            onClick={() => {
              setIsScanning(true);
              setVisitorInfo(null);
              setError(null);
              setErrorDebounce(null);
              setAlreadyCheckedIn(false);
            }}
          >
            Scan Another Code
          </Button>
        </div>
      )}
    </div>
  );
};

export default MinimalScanByCameraPage; 