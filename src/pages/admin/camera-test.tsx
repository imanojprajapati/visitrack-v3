import { useEffect, useState } from 'react';
import { Button, Alert, Typography, Space } from 'antd';
import Head from 'next/head';

const { Title, Text } = Typography;

interface CameraInfo {
  isSecure?: boolean;
  hasGetUserMedia?: boolean;
  isMobile?: boolean;
  permissionState?: string;
  cameraSettings?: any;
  cameras?: any[];
}

const CameraTestPage: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [cameraInfo, setCameraInfo] = useState<CameraInfo>({});
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
    console.log(`[Camera Test] ${result}`);
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  const runCameraTests = async () => {
    setTestResults([]);
    setError(null);
    
    try {
      addTestResult('Starting camera tests...');
      
      // Test 1: Check if we're in a secure context
      const isSecure = window.isSecureContext;
      addTestResult(`Secure context: ${isSecure}`);
      setCameraInfo((prev: CameraInfo) => ({ ...prev, isSecure }));
      
      if (!isSecure) {
        setError('Not in secure context - camera access requires HTTPS');
        return;
      }

      // Test 2: Check if getUserMedia is supported
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      addTestResult(`getUserMedia supported: ${hasGetUserMedia}`);
      setCameraInfo((prev: CameraInfo) => ({ ...prev, hasGetUserMedia }));
      
      if (!hasGetUserMedia) {
        setError('getUserMedia not supported in this browser');
        return;
      }

      // Test 3: Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      addTestResult(`Mobile device: ${isMobile}`);
      setCameraInfo((prev: CameraInfo) => ({ ...prev, isMobile }));

      // Test 4: Check permissions API
      let permissionState = 'unknown';
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          permissionState = permission.state;
          addTestResult(`Camera permission state: ${permissionState}`);
        } catch (err) {
          addTestResult(`Permission API error: ${err}`);
        }
      } else {
        addTestResult('Permissions API not supported');
      }
      setCameraInfo((prev: CameraInfo) => ({ ...prev, permissionState }));

      // Test 5: Try to get camera stream
      try {
        addTestResult('Requesting camera stream...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        const tracks = stream.getVideoTracks();
        addTestResult(`Camera stream obtained. Tracks: ${tracks.length}`);
        
        if (tracks.length > 0) {
          const track = tracks[0];
          const settings = track.getSettings();
          addTestResult(`Camera settings: ${JSON.stringify(settings)}`);
          setCameraInfo((prev: CameraInfo) => ({ ...prev, cameraSettings: settings }));
        }
        
        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
        addTestResult('Camera stream stopped');
        
      } catch (streamError) {
        addTestResult(`Camera stream error: ${streamError}`);
        setError(`Camera access failed: ${streamError}`);
      }

      // Test 6: Try to import html5-qrcode
      try {
        addTestResult('Testing html5-qrcode import...');
        const { Html5Qrcode } = await import('html5-qrcode');
        addTestResult('html5-qrcode imported successfully');
        
        // Test 7: Try to get cameras
        try {
          const devices = await Html5Qrcode.getCameras();
          addTestResult(`Found ${devices?.length || 0} cameras`);
          if (devices && devices.length > 0) {
            devices.forEach((device: any, index: number) => {
              addTestResult(`Camera ${index + 1}: ${device.label || device.id}`);
            });
          }
          setCameraInfo((prev: CameraInfo) => ({ ...prev, cameras: devices }));
        } catch (cameraError) {
          addTestResult(`Get cameras error: ${cameraError}`);
        }
        
      } catch (importError) {
        addTestResult(`html5-qrcode import error: ${importError}`);
        setError(`Failed to import html5-qrcode: ${importError}`);
      }

      addTestResult('Camera tests completed');
      
    } catch (error) {
      addTestResult(`Test error: ${error}`);
      setError(`Test failed: ${error}`);
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Camera Test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
      </Head>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          <Title level={2} className="text-center mb-6">Camera Test Page</Title>
          
          <Space direction="vertical" className="w-full mb-6">
            <Button type="primary" onClick={runCameraTests} size="large" block>
              Run Camera Tests
            </Button>
            
            {error && (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
              />
            )}
          </Space>

          <div className="mb-6">
            <Title level={4}>Camera Information</Title>
            <div className="bg-gray-100 p-4 rounded">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(cameraInfo, null, 2)}
              </pre>
            </div>
          </div>

          <div>
            <Title level={4}>Test Results</Title>
            <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <Text type="secondary">No tests run yet. Click "Run Camera Tests" to start.</Text>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CameraTestPage; 