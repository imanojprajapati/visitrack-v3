'use client'
import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal, message, Alert, Card, Descriptions } from 'antd';
import { CameraOutlined } from '@ant-design/icons';

const QR_SCANNER_ID = 'qr-reader';

const ScanByCamera: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState<any | null>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const scannerRef = useRef<any>(null);

  // Cleanup scanner on unmount or modal close
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  // Initialize QR scanner when modal opens
  useEffect(() => {
    if (!showScanner) return;
    let cancelled = false;

    const initializeScanner = async () => {
      try {
        setError(null);
        setIsProcessingScan(false);
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        const scanner = new Html5QrcodeScanner(
          QR_SCANNER_ID,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            disableFlip: false,
          },
          false
        );

        scanner.render(
          async (decodedText: string) => {
            if (!isProcessingScan && !cancelled) {
              setIsProcessingScan(true);
              await handleQrCodeScan(decodedText);
            }
          },
          (scanError: any) => {
            if (
              !/notfoundexception|no qr code found|no multiformat readers were able to detect the code|no qr code detected|no barcode or no qr code detected/i.test(
                String(scanError)
              )
            ) {
              setError(String(scanError));
            }
          }
        );

        scannerRef.current = scanner;
      } catch (err: any) {
        setError(err.message || 'Failed to initialize QR scanner');
      }
    };

    initializeScanner();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [showScanner]);

  // Handle QR code scan
  const handleQrCodeScan = async (qrData: string) => {
    try {
      setError(null);
      const { alreadyCheckedIn, visitor } = await checkInVisitorByQr(qrData, messageApi);
      setVisitorInfo(visitor);
      setAlreadyCheckedIn(alreadyCheckedIn);
      setShowScanner(false);
    } catch (err: any) {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {contextHolder}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4 w-full max-w-md"
        />
      )}
      {!visitorInfo && (
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
          Start Scanner
        </Button>
      )}
      <Modal
        title="QR Code Scanner"
        open={showScanner}
        onCancel={() => {
          setShowScanner(false);
          setIsProcessingScan(false);
        }}
        footer={null}
        width={400}
        centered
        destroyOnClose
      >
        <div className="flex flex-col items-center">
          <div className="w-full aspect-square bg-black rounded-lg overflow-hidden mb-4 relative">
            <div id={QR_SCANNER_ID} className="w-full h-full"></div>
            {isProcessingScan && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Processing scan...</p>
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 text-center mb-2">
            Position the QR code within the frame to scan
          </p>
          <p className="text-xs text-gray-500 text-center">
            {isProcessingScan ? 'Processing previous scan...' : 'Ready to scan'}
          </p>
        </div>
      </Modal>
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
              setShowScanner(true);
              setVisitorInfo(null);
              setError(null);
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

export default ScanByCamera; 