"use client"
import React, { useEffect, useState, useRef } from 'react';
import { Alert, Button, Spin, Typography } from 'antd';

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

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !isActive) return;
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
  }, [isClient, isActive, onScanError]);

  useEffect(() => {
    if (!isClient || !selectedCamera || isInitializing || !isActive) return;
    let stopped = false;
    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode('qr-reader');
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
            // Only log errors that are not continuous scanning errors
            if (!errorMessage.includes('NotFoundException') && !errorMessage.includes('No QR code found')) {
              setError(errorMessage);
              onScanError(errorMessage);
            }
          }
        );
      } catch (err) {
        setError('Failed to start QR scanner.');
        onScanError('Failed to start QR scanner.');
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
    return <Spin size="large" />;
  }
  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }
  return <div id="qr-reader" style={{ width: 250, height: 250, background: '#000' }} />;
};

const MinimalScanByCameraPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleScanSuccess = (result: string) => {
    setLastResult(result);
    setIsScanning(false);
  };
  const handleScanError = (err: string) => {
    setError(err);
    setIsScanning(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      {!isScanning && !lastResult && (
        <Button type="primary" size="large" onClick={() => { setIsScanning(true); setError(null); setLastResult(null); }}>
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
      {lastResult && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Alert message="Scan Result" description={lastResult} type="success" showIcon style={{ marginBottom: 16 }} />
          <Button type="primary" onClick={() => { setIsScanning(true); setLastResult(null); setError(null); }}>
            Scan Another Code
          </Button>
        </div>
      )}
    </div>
  );
};

export default MinimalScanByCameraPage; 