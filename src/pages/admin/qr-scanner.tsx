import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  message,
  Modal,
  Form,
  Input,
  Typography,
  Tag,
  Divider
} from 'antd';
import {
  PrinterOutlined,
  QrcodeOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { QRCodeComponent, parseCompactQRData, type QRCodeData } from '../../lib/qrcode';
import AdminLayout from './layout';
import { useAppContext } from '../../context/AppContext';
import dayjs from 'dayjs';
import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode';

const { Text } = Typography;

interface VisitorData extends QRCodeData {
  name: string;
  company: string;
  designation: string;
  eventName: string;
  endDate: string;
}

interface VisitorEntry {
  _id: string;
  name: string;
  company: string;
  eventName: string;
  status: string;
  scanTime: string;
  entryType: 'scan' | 'manual';
}

const QRScanner = () => {
  const [form] = Form.useForm();
  const [scanResult, setScanResult] = useState<VisitorData | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [scannedVisitors, setScannedVisitors] = useState<VisitorEntry[]>([]);
  const [visitorStatus, setVisitorStatus] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [loading, setLoading] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { messageApi } = useAppContext();

  useEffect(() => {
    if (showScanner) {
      // Initialize QR scanner
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: 250 },
        false
      );

      scannerRef.current.render(
        async (decodedText: string) => {
          try {
            const qrData = JSON.parse(decodedText) as QRCodeData;
            await handleQrCodeScan(qrData);
            if (scannerRef.current) {
              scannerRef.current.clear();
            }
            setShowScanner(false);
          } catch (error) {
            console.error('Error processing QR code:', error);
            messageApi?.error('Invalid QR code format');
          }
        },
        (error: string | Error) => {
          console.error('QR Scan error:', error);
          setCameraError(true);
        }
      );
    } else {
      // Clean up scanner
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [showScanner, messageApi]);

  const checkVisitorStatus = (visitorId: string): boolean => {
    return scannedVisitors.some(v => v._id === visitorId);
  };

  const handleManualEntry = async (values: { visitorId: string; eventId: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/visitors/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process manual entry');
      }

      const data = await response.json();
      setScannedVisitors(prev => [
        {
          _id: data.visitor._id,
          name: data.visitor.name,
          company: data.visitor.company,
          eventName: data.visitor.eventName,
          status: data.visitor.status,
          scanTime: data.visitor.scanTime,
          entryType: 'manual'
        },
        ...prev
      ]);

      form.resetFields();
      setShowManualEntry(false);
      messageApi?.success('Visitor entry processed successfully');
    } catch (error) {
      console.error('Error processing manual entry:', error);
      messageApi?.error(error instanceof Error ? error.message : 'Failed to process manual entry');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (visitor: VisitorData) => {
    if (badgeRef.current) {
      // TODO: Implement badge printing logic
      message.success('Badge printed successfully!');
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
      render: (text: string) => dayjs(text).format('DD/MM/YYYY HH:mm:ss'),
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
            onClick={() => handlePrint(record as unknown as VisitorData)}
          >
            Print Badge
          </Button>
        </Space>
      ),
    },
  ];

  const handleQrCodeScan = async (qrData: QRCodeData) => {
    try {
      const response = await fetch('/api/visitors/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qrData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process QR code');
      }

      const data = await response.json();
      setScannedVisitors(prev => [
        {
          _id: data.visitor._id,
          name: data.visitor.name,
          company: data.visitor.company,
          eventName: data.visitor.eventName,
          status: data.visitor.status,
          scanTime: data.visitor.scanTime,
          entryType: 'scan'
        },
        ...prev
      ]);

      messageApi?.success('QR code scanned successfully');
      setShowScanner(false);
    } catch (error) {
      console.error('Error scanning QR code:', error);
      messageApi?.error(error instanceof Error ? error.message : 'Failed to process QR code');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">QR Scanner</h1>
        
        <Card>
          <div className="mb-4 flex gap-2">
            <Button
              type="primary"
              icon={<QrcodeOutlined />}
              onClick={() => setShowScanner(true)}
            >
              Scan QR Code
            </Button>
            <Button
              icon={<UserAddOutlined />}
              onClick={() => setShowManualEntry(true)}
            >
              Manual Entry
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={scannedVisitors}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
          />
        </Card>

        {/* QR Scanner Modal */}
        <Modal
          title="Scan QR Code"
          open={showScanner}
          onCancel={() => {
            setShowScanner(false);
            setCameraError(false);
            if (scannerRef.current) {
              scannerRef.current.clear();
            }
          }}
          footer={null}
          width={800}
        >
          <div className="w-full flex justify-center">
            {cameraError ? (
              <div className="text-center p-5">
                <CloseCircleOutlined className="text-4xl text-red-500" />
                <Text className="block mt-4 text-base">
                  Camera access error. Please try manual entry or check camera permissions.
                </Text>
              </div>
            ) : (
              <div id="qr-reader" className="w-full max-w-2xl" />
            )}
          </div>
        </Modal>

        {/* Manual Entry Modal */}
        <Modal
          title="Manual Visitor Entry"
          open={showManualEntry}
          onCancel={() => {
            setShowManualEntry(false);
            form.resetFields();
          }}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleManualEntry}
          >
            <Form.Item
              name="visitorId"
              label="Visitor ID"
              rules={[
                { required: true, message: 'Please enter the visitor ID' },
                { pattern: /^[0-9a-fA-F]{24}$/, message: 'Please enter a valid visitor ID' }
              ]}
            >
              <Input placeholder="Enter visitor ID" />
            </Form.Item>

            <Form.Item
              name="eventId"
              label="Event ID"
              rules={[
                { required: true, message: 'Please enter the event ID' },
                { pattern: /^[0-9a-fA-F]{24}$/, message: 'Please enter a valid event ID' }
              ]}
            >
              <Input placeholder="Enter event ID" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Submit
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Badge Preview Modal */}
        <Modal
          title="Badge Preview"
          open={showPreview}
          onCancel={() => setShowPreview(false)}
          footer={[
            <Button key="print" type="primary" onClick={() => handlePrint(scanResult as VisitorData)}>
              Print Badge
            </Button>
          ]}
          width={400}
        >
          <div ref={badgeRef} className="w-[300px] p-5 border rounded-lg mx-auto text-center">
            <h2 className="mb-2">{scanResult?.eventName}</h2>
            <Divider />
            {scanResult && (
              <QRCodeComponent
                data={scanResult}
                size={180}
              />
            )}
            <Divider />
            <h3 className="my-2">{scanResult?.name}</h3>
            <p className="my-1">{scanResult?.company}</p>
            <p className="my-1">{scanResult?.designation}</p>
            <Divider />
            <p className="my-1">Valid until: {scanResult?.endDate}</p>
          </div>
        </Modal>

        {/* Visitor Status Modal */}
        {visitorStatus !== null && (
          <Modal
            title="Visitor Status"
            open={true}
            onCancel={() => setVisitorStatus(null)}
            footer={null}
            width={400}
          >
            <div className="text-center p-5">
              {visitorStatus ? (
                <>
                  <CloseCircleOutlined className="text-4xl text-red-500" />
                  <Text className="block mt-4 text-base">
                    This visitor has already been registered!
                  </Text>
                </>
              ) : (
                <>
                  <CheckCircleOutlined className="text-4xl text-green-500" />
                  <Text className="block mt-4 text-base">
                    New visitor detected! Would you like to print the badge?
                  </Text>
                </>
              )}
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
};

export default QRScanner;
