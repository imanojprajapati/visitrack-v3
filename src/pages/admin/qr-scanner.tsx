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

const { Text } = Typography;

interface VisitorData extends QRCodeData {
  name: string;
  company: string;
  designation: string;
  eventName: string;
  endDate: string;
}

interface ScannedVisitor extends VisitorData {
  key: string;
  scanTime: string;
}

const QRScanner = () => {
  const [form] = Form.useForm<VisitorData>();
  const [scanResult, setScanResult] = useState<VisitorData | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [scannedVisitors, setScannedVisitors] = useState<ScannedVisitor[]>([]);
  const [visitorStatus, setVisitorStatus] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraError(true);
      message.error('Error accessing camera. Please check your camera permissions or try manual entry.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (showScanner) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showScanner, startCamera, stopCamera]);

  const handleError = (err: string | DOMException) => {
    console.error(err);
    setCameraError(true);
    message.error('Error accessing camera. Please check your camera permissions or try manual entry.');
  };

  const checkVisitorStatus = (visitorId: string): boolean => {
    return scannedVisitors.some(v => v.visitorId === visitorId);
  };

  const processVisitorData = (data: string) => {
    try {
      // Try parsing as compact format first
      const qrData = parseCompactQRData(data);
      
      if (!qrData) {
        throw new Error('Invalid QR code format');
      }

      // Create visitor data with default values for optional fields
      const visitorData: VisitorData = {
        ...qrData,
        name: qrData.name || 'Unknown',
        company: qrData.company || 'Unknown',
        designation: 'Visitor',
        eventName: qrData.eventName || 'Unknown Event',
        endDate: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        }).replace(/\//g, '-')
      };

      const hasVisited = checkVisitorStatus(visitorData.visitorId);
      setVisitorStatus(hasVisited);
      setScanResult(visitorData);
      setShowScanner(false);
      
      if (!hasVisited) {
        setShowPreview(true);
        // Add to scanned visitors list
        setScannedVisitors([...scannedVisitors, {
          key: Date.now().toString(),
          ...visitorData,
          scanTime: new Date().toLocaleString(),
        }]);
        message.success('New visitor registered successfully!');
      } else {
        message.warning('Visitor has already been registered!');
      }
    } catch (error) {
      message.error('Invalid QR Code format');
    }
  };

  const capture = useCallback(() => {
    if (videoRef.current) {
      // TODO: Implement QR code scanning using jsQR library
      message.info('QR code scanning simulation - implement actual scanning logic');
    }
  }, []);

  const handleManualEntry = (values: VisitorData) => {
    // Convert form values to QR code data format
    const qrData: QRCodeData = {
      visitorId: values.visitorId,
      eventId: values.eventId,
      name: values.name,
      company: values.company,
      eventName: values.eventName
    };
    processVisitorData(JSON.stringify(qrData));
    setShowManualEntry(false);
    form.resetFields();
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
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
    },
    {
      title: 'Scan Time',
      dataIndex: 'scanTime',
      key: 'scanTime',
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="green">Registered</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
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
            stopCamera();
          }}
          footer={[
            <Button key="scan" type="primary" onClick={capture} disabled={cameraError}>
              Scan QR Code
            </Button>
          ]}
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
              <div className="relative w-full max-w-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="absolute inset-0 border-2 border-dashed border-blue-500 pointer-events-none" />
              </div>
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
              rules={[{ required: true, message: 'Please input visitor ID!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="eventId"
              label="Event ID"
              rules={[{ required: true, message: 'Please input event ID!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please input name!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="company"
              label="Company"
              rules={[{ required: true, message: 'Please input company!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="eventName"
              label="Event Name"
              rules={[{ required: true, message: 'Please input event name!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
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
