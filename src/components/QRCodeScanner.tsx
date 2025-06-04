import { useEffect, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button, message, Alert, Select, Space } from 'antd';
import { CameraOutlined, LoadingOutlined } from '@ant-design/icons';

interface QRCodeScannerProps {
  onScanSuccess: (visitorId: string) => void;
  onScanError?: (error: string) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScanSuccess, onScanError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        setCameras(devices);
        // Select the back camera by default if available
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        setSelectedCamera(backCamera ? backCamera.id : devices[0].id);
      } else {
        throw new Error('No cameras found on this device.');
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Unable to access device cameras. Please ensure camera permissions are granted.');
    }
  }, []);

  useEffect(() => {
    getCameras();
    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [getCameras]);

  const startScanning = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedCamera) {
        throw new Error('Please select a camera');
      }

      const scanner = new Html5Qrcode('qr-reader');
      setHtml5QrCode(scanner);

      await scanner.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanSuccess(decodedText, scanner);
        },
        (errorMessage) => {
          // Ignore the continuous scanning errors
          console.debug('QR scan error:', errorMessage);
        }
      );

      setIsScanning(true);
      setLoading(false);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError(err instanceof Error ? err.message : 'Failed to start QR scanner');
      setLoading(false);
      if (onScanError) {
        onScanError(err instanceof Error ? err.message : 'Failed to start QR scanner');
      }
    }
  };

  const handleScanSuccess = async (decodedText: string, scanner: Html5Qrcode) => {
    try {
      await scanner.stop();
      setIsScanning(false);
      onScanSuccess(decodedText);
    } catch (err) {
      console.error('Error handling scan success:', err);
      if (onScanError) {
        onScanError('Error processing scan result');
      }
    }
  };

  const stopScanning = async () => {
    try {
      if (html5QrCode) {
        await html5QrCode.stop();
        setHtml5QrCode(null);
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  const handleCameraChange = (cameraId: string) => {
    setSelectedCamera(cameraId);
    if (isScanning) {
      stopScanning().then(() => startScanning());
    }
  };

  return (
    <div className="qr-scanner-container">
      {!window.isSecureContext && (
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
          className="mb-4"
        />
      )}

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
          closable
          onClose={() => setError(null)}
        />
      )}

      <div className="scanner-controls space-y-4">
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

          {!isScanning ? (
            <Button
              type="primary"
              icon={loading ? <LoadingOutlined /> : <CameraOutlined />}
              size="large"
              onClick={startScanning}
              disabled={loading || !selectedCamera}
              block
            >
              {loading ? 'Initializing Camera...' : 'Start QR Code Scanner'}
            </Button>
          ) : (
            <Button 
              type="primary" 
              danger 
              onClick={stopScanning}
              block
            >
              Stop Scanner
            </Button>
          )}
        </Space>

        <div 
          id="qr-reader" 
          style={{ 
            width: '100%', 
            maxWidth: '600px', 
            margin: '20px auto',
            background: '#f0f0f0',
            padding: '20px',
            borderRadius: '8px',
            minHeight: isScanning ? '300px' : '0'
          }} 
        />
      </div>
    </div>
  );
};

export default QRCodeScanner; 