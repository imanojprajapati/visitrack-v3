import { useState } from 'react';
import { Card, Typography, message, Result, Button, Space } from 'antd';
import { useRouter } from 'next/router';
import Head from 'next/head';
import QRCodeScanner from '../components/QRCodeScanner';

const { Title, Text } = Typography;

interface VisitorEntry {
  _id: string;
  name: string;
  email: string;
  phone: string;
  eventName: string;
  eventLocation: string;
  entryTime: string;
}

export default function ScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(true);
  const [visitorEntry, setVisitorEntry] = useState<VisitorEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScanSuccess = async (visitorId: string) => {
    try {
      // Make API call to record visitor entry
      const response = await fetch('/api/visitors/entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visitorId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record visitor entry');
      }

      const data = await response.json();
      setVisitorEntry(data);
      setScanning(false);
      message.success('Visitor entry recorded successfully');
    } catch (error) {
      console.error('Error recording visitor entry:', error);
      setError(error instanceof Error ? error.message : 'Failed to record visitor entry');
      message.error('Failed to record visitor entry');
    }
  };

  const handleScanError = (error: string) => {
    console.error('Scan error:', error);
    setError(error);
    message.error('Failed to scan QR code');
  };

  const handleReset = () => {
    setScanning(true);
    setVisitorEntry(null);
    setError(null);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <Card>
            <Result
              status="error"
              title="Scan Failed"
              subTitle={error}
              extra={[
                <Button key="retry" type="primary" onClick={handleReset}>
                  Try Again
                </Button>
              ]}
            />
          </Card>
        </div>
      </div>
    );
  }

  if (visitorEntry) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <Card>
            <Result
              status="success"
              title="Entry Recorded"
              subTitle="Visitor entry has been recorded successfully"
              extra={[
                <Button key="scan-again" type="primary" onClick={handleReset}>
                  Scan Another
                </Button>
              ]}
            />
            <div className="mt-8">
              <Title level={4}>Visitor Details</Title>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text><strong>Name:</strong> {visitorEntry.name}</Text>
                <Text><strong>Email:</strong> {visitorEntry.email}</Text>
                <Text><strong>Phone:</strong> {visitorEntry.phone}</Text>
                <Text><strong>Event:</strong> {visitorEntry.eventName}</Text>
                <Text><strong>Location:</strong> {visitorEntry.eventLocation}</Text>
                <Text><strong>Entry Time:</strong> {new Date(visitorEntry.entryTime).toLocaleString()}</Text>
              </Space>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Head>
        <title>Scan QR Code - Visitrack</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4">
        <Card>
          <Title level={2} className="text-center mb-8">
            Scan Visitor QR Code
          </Title>
          <QRCodeScanner
            onScanSuccess={handleScanSuccess}
            onScanError={handleScanError}
          />
        </Card>
      </div>
    </div>
  );
} 