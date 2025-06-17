'use client'
import React, { useEffect, useState, useRef } from 'react';
import { Alert, Button, Spin, Typography, Modal, message, Card, Descriptions } from 'antd';

const { Text } = Typography;

const MinimalQRScanner: React.FC<{
  onScanSuccess: (result: string) => void;
  onScanError: (error: string) => void;
  isActive: boolean;
}> = ({ onScanSuccess, onScanError, isActive }) => {
  const [isClient, setIsClient] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const html5QrCodeRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !isActive || initializedRef.current) return;
    initializedRef.current = true;
    const initializeScanner = async () => {
      try {
        setIsInitializing(true);
        if (!window.isSecureContext) {
          setError('Camera access requires HTTPS.');
          onScanError('Camera access requires HTTPS.');
          return;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Camera access is not supported in this browser.');
          onScanError('Camera access is not supported in this browser.');
          return;
        }
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (permError) {
          setError('Camera permission denied.');
          onScanError('Camera permission denied.');
          return;
        }
        let Html5Qrcode;
        try {
          Html5Qrcode = (await import('html5-qrcode')).Html5Qrcode;
        } catch (importErr) {
          setError('Failed to load QR code scanner library.');
          onScanError('Failed to load QR code scanner library.');
          return;
        }
        let devices;
        try {
          devices = await Html5Qrcode.getCameras();
        } catch (camErr) {
          setError('Unable to access camera devices.');
          onScanError('Unable to access camera devices.');
          return;
        }
        if (!devices || devices.length === 0) {
          setError('No cameras found on this device.');
          onScanError('No cameras found on this device.');
          return;
        }
        setCameras(devices);
        setSelectedCamera(devices[0].id);
      } catch (err) {
        setError('Failed to initialize camera.');
        onScanError('Failed to initialize camera.');
      } finally {
        setIsInitializing(false);
      }
    };
    initializeScanner();
    return () => {
      initializedRef.current = false;
    };
  }, [isClient, isActive, onScanError]);

  useEffect(() => {
    if (!isClient || !selectedCamera || isInitializing || !isActive) return;
    let stopped = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode('qr-reader-scan-by-camera');
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
            const normalized = errorMessage.toLowerCase();
            if (
              !normalized.includes('notfoundexception') &&
              !normalized.includes('no qr code found') &&
              !normalized.includes('no multiformat readers were able to detect the code') &&
              !normalized.includes('no qr code detected') &&
              !normalized.includes('no barcode or no qr code detected')
            ) {
              setError(errorMessage);
              onScanError(errorMessage);
            }
          }
        );
      } catch (err) {
        setError('Failed to start QR scanner.');
        onScanError('Failed to start QR scanner.');
      }
    })();
    return () => {
      stopped = true;
      if (html5QrCodeRef.current) {
        (async () => {
          try {
            await html5QrCodeRef.current.stop();
            await html5QrCodeRef.current.clear();
          } catch {}
          html5QrCodeRef.current = null;
        })();
      }
    };
  }, [selectedCamera, isClient, onScanSuccess, onScanError, isInitializing, isActive]);

  if (!isClient || !isActive) {
    return null;
  }
  if (isInitializing) {
    return <Spin size="large" />;
  }
  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 250, height: 250, background: '#000' }}>
      <div id="qr-reader-scan-by-camera" style={{ width: 250, height: 250 }} />
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
    setIsScanning(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {contextHolder}
      {errorDebounce && <Alert message="Error" description={errorDebounce} type="error" showIcon style={{ marginBottom: 16 }} />}
      {!isScanning && !visitorInfo && (
        <Button type="primary" size="large" onClick={() => { setIsScanning(true); setError(null); setErrorDebounce(null); setVisitorInfo(null); setAlreadyCheckedIn(false); }} loading={loading}>
          Start Scanning
        </Button>
      )}
      {isScanning && (
        <MinimalQRScanner
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          isActive={isScanning}
        />
      )}
      {visitorInfo && (
        <div style={{ marginTop: 24, textAlign: 'center', maxWidth: 400 }}>
          <Card title={alreadyCheckedIn ? 'Visitor Already Checked In' : 'Visitor Checked In'} bordered={true} style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Name">{visitorInfo.name}</Descriptions.Item>
              <Descriptions.Item label="Company">{visitorInfo.company}</Descriptions.Item>
              <Descriptions.Item label="Event">{visitorInfo.eventName}</Descriptions.Item>
              <Descriptions.Item label="Status">{visitorInfo.status}</Descriptions.Item>
              <Descriptions.Item label="Visitor ID">{visitorInfo.visitorId || visitorInfo._id}</Descriptions.Item>
              {visitorInfo.scanTime && <Descriptions.Item label="Scan Time">{new Date(visitorInfo.scanTime).toLocaleString('en-GB')}</Descriptions.Item>}
            </Descriptions>
          </Card>
          <Button type="primary" onClick={() => { setIsScanning(true); setVisitorInfo(null); setError(null); setErrorDebounce(null); setAlreadyCheckedIn(false); }}>
            Scan Another Code
          </Button>
        </div>
      )}
    </div>
  );
};

export default MinimalScanByCameraPage; 