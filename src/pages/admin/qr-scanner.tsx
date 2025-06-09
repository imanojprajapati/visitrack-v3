import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Space, Table, Tag, Modal, message } from 'antd';
import { QrReader } from 'react-qr-reader';
import { PrinterOutlined, QrcodeOutlined } from '@ant-design/icons';
import AdminLayout from './layout';
import dayjs from 'dayjs';

interface VisitorEntry {
  visitorId: string;
  name: string;
  company: string;
  designation: string;
  email: string;
  phone: string;
  eventName: string;
  status: string;
  scanTime: string;
  entryType: string;
}

interface VisitorData {
  visitorId: string;
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
  scanTime: string;
  entryType: 'qr' | 'manual';
  status: 'success' | 'failed';
  error?: string;
}

const QRScanner: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedVisitors, setScannedVisitors] = useState<VisitorEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const badgeRef = useRef<HTMLDivElement>(null);
  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualVisitorId, setManualVisitorId] = useState('');

  // Fetch scanned visitors on component mount
  useEffect(() => {
    const fetchScannedVisitors = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/qrscans');
        if (!response.ok) {
          throw new Error('Failed to fetch scanned visitors');
        }
        const data = await response.json();
        // Map scanTime to a readable format if needed
        const visitors = data.map((scan: any) => ({
          key: scan._id,
          name: scan.name,
          company: scan.company,
          eventName: scan.eventName,
          status: scan.status,
          scanTime: scan.scanTime?.$date?.$numberLong
            ? Number(scan.scanTime.$date.$numberLong)
            : scan.scanTime,
          entryType: scan.entryType,
        }));
        setScannedVisitors(visitors);
      } catch (error) {
        console.error('Error fetching scanned visitors:', error);
        messageApi.error('Failed to load scanned visitors');
      } finally {
        setLoading(false);
      }
    };
    fetchScannedVisitors();
  }, [messageApi]);

  const handleQrCodeScan = async (qrData: string) => {
    try {
      // Extract visitor ID from QR code
      const visitorId = qrData.trim();
      if (!visitorId) {
        throw new Error('Invalid QR code data');
      }

      // Show the scanned ID in a popup
      Modal.info({
        title: 'QR Code Scanned',
        content: (
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">Visitor ID:</p>
            <p className="text-2xl font-mono bg-gray-100 p-2 rounded">{visitorId}</p>
          </div>
        ),
        okText: 'Process',
        onOk: async () => {
          try {
            setLoading(true);
            // First check if visitor exists
            const response = await fetch(`/api/visitors/${visitorId}`);
            if (!response.ok) {
              throw new Error('Visitor not found');
            }
            const visitorData = await response.json();

            // Create scan record
            const scanData = {
              visitorId: visitorData.visitorId,
              scanTime: new Date().toISOString(),
              entryType: 'qr',
              status: 'success'
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
              throw new Error('Failed to record scan data');
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
              // If visitor update fails, update scan record status
              await fetch(`/api/qrscans/${visitorId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'failed',
                  error: 'Failed to update visitor status'
                }),
              });
              throw new Error('Failed to update visitor status');
            }

            // Add to scanned visitors list with updated status
            const newEntry: VisitorEntry = {
              ...visitorData,
              scanTime: scanData.scanTime,
              entryType: scanData.entryType,
              status: 'Visited'
            };

            setScannedVisitors(prev => [newEntry, ...prev]);
            messageApi.success('Visitor checked in successfully');
            setShowScanner(false);
          } catch (error) {
            console.error('Error processing visitor:', error);
            messageApi.error(error instanceof Error ? error.message : 'Failed to process visitor');
          } finally {
            setLoading(false);
          }
        }
      });
    } catch (error) {
      console.error('Error scanning QR code:', error);
      messageApi.error(error instanceof Error ? error.message : 'Failed to process QR code');
    }
  };

  const processQRData = async (visitorData: VisitorData) => {
    try {
      // First, create a QR scan record
      const scanData: QRScan = {
        visitorId: visitorData.visitorId,
        scanTime: new Date().toISOString(),
        entryType: 'qr',
        status: 'success'
      };

      // Store scan data in qrscans collection
      const scanResponse = await fetch('/api/qrscans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scanData),
      });

      if (!scanResponse.ok) {
        throw new Error('Failed to record scan data');
      }

      // Update visitor status to Visited
      const updateResponse = await fetch(`/api/visitors/${visitorData.visitorId}/check-in`, {
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
        throw new Error('Failed to update visitor status');
      }

      // Add to scanned visitors list
      const newEntry: VisitorEntry = {
        ...visitorData,
        scanTime: scanData.scanTime,
        entryType: scanData.entryType,
        status: 'Visited'
      };

      setScannedVisitors(prev => [newEntry, ...prev]);
      messageApi.success('Visitor checked in successfully');
    } catch (error) {
      console.error('Error processing QR data:', error);
      messageApi.error(error instanceof Error ? error.message : 'Failed to process visitor data');
      throw error;
    }
  };

  const handlePrint = async (visitor: VisitorEntry) => {
    if (badgeRef.current) {
      // TODO: Implement badge printing logic
      message.success('Badge printed successfully!');
    }
  };

  // Manual entry handler
  const handleManualEntry = async () => {
    if (!manualVisitorId.trim()) {
      messageApi.error('Please enter a visitor ID');
      return;
    }
    try {
      setLoading(true);
      // 1. Update visitor status to 'Visited'
      const updateRes = await fetch(`/api/visitors/${manualVisitorId.trim()}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Visited', checkInTime: new Date().toISOString() }),
      });
      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.message || 'Failed to update visitor status.');
      }

      // 2. Fetch visitor data
      const visitorRes = await fetch(`/api/visitors/${manualVisitorId.trim()}`);
      if (!visitorRes.ok) {
        const err = await visitorRes.json();
        throw new Error(err.message || 'Visitor not found.');
      }
      const visitorData = await visitorRes.json();

      // 3. Add record to qrscans collection
      const now = new Date().toISOString();
      const scanRes = await fetch('/api/qrscans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: visitorData._id,
          eventId: visitorData.eventId,
          registrationId: visitorData.registrationId,
          name: visitorData.name,
          company: visitorData.company,
          eventName: visitorData.eventName,
          eventDate: visitorData.eventDate,
          scanTime: now,
          entryType: 'manual',
          status: 'Visited',
          deviceInfo: navigator.userAgent,
          createdAt: now,
          updatedAt: now,
        }),
      });
      if (!scanRes.ok) {
        const err = await scanRes.json();
        throw new Error(err.message || 'Failed to insert scan record.');
      }
      message.success('Manual entry recorded successfully.');
      setManualVisitorId('');
      setShowManualEntry(false);
      // Optionally, re-fetch scanned visitors to update the table.
      // fetchScannedVisitors();
    } catch (error) {
      console.error('Error recording manual entry:', error);
      messageApi.error(error instanceof Error ? error.message : 'Failed to record manual entry.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: 'Event',
      dataIndex: 'eventName',
      key: 'eventName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Visited' ? 'green' : 'blue'}>{status}</Tag>
      ),
    },
    {
      title: 'Entry Time',
      dataIndex: 'scanTime',
      key: 'scanTime',
      render: (scanTime: string | number | Date) => {
        try {
          if (!scanTime) return '-';
          const dateObj = new Date(scanTime);
          if (isNaN(dateObj.getTime())) return '-';
          return dateObj.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
        } catch (error) {
          return '-';
        }
      },
    },
    {
      title: 'Entry Type',
      dataIndex: 'entryType',
      key: 'entryType',
      render: (text: string) => (
        <Tag color={text === 'manual' ? 'orange' : 'purple'}>
          {text.charAt(0).toUpperCase() + text.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: VisitorEntry) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => handlePrint(record)}
          >
            Print Badge
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      {contextHolder}
      <div className="p-4 sm:p-6">
        <Card
          title={<h1 className="text-xl sm:text-2xl font-bold">QR Scanner</h1>}
          extra={
            <Space>
              <Button
                type="primary"
                icon={<QrcodeOutlined />}
                onClick={() => setShowScanner(true)}
              >
                Start Scanner
              </Button>
              <Button
                onClick={() => setShowManualEntry(true)}
              >
                Manual Entry
              </Button>
            </Space>
          }
        >
          {/* Scanner Modal */}
          <Modal
            title="QR Code Scanner"
            open={showScanner}
            onCancel={() => setShowScanner(false)}
            footer={null}
            width={400}
            centered
          >
            <div className="flex flex-col items-center">
              <div className="w-full aspect-square bg-black rounded-lg overflow-hidden mb-4">
                <QrReader
                  constraints={{ facingMode: 'environment' }}
                  onResult={(result, error) => {
                    if (result?.getText()) {
                      handleQrCodeScan(result.getText());
                    }
                    if (error) {
                      console.error('QR Scan error:', error);
                    }
                  }}
                  className="w-full h-full"
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Position the QR code within the frame to scan
              </p>
            </div>
          </Modal>

          {/* Manual Entry Modal */}
          <Modal
            title="Manual Visitor ID Entry"
            open={showManualEntry}
            onOk={handleManualEntry}
            onCancel={() => setShowManualEntry(false)}
            okText="Process"
            confirmLoading={loading}
          >
            <input
              type="text"
              value={manualVisitorId}
              onChange={e => setManualVisitorId(e.target.value)}
              placeholder="Enter Visitor ID"
              className="ant-input w-full"
              autoFocus
            />
          </Modal>

          {/* Scanned Visitors Table */}
          <Table
            dataSource={scannedVisitors}
            columns={columns}
            rowKey="key"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} visitors`,
            }}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      </div>
    </AdminLayout>
  );
};

export default QRScanner;