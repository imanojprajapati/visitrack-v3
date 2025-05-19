import React, { useState, useRef, useCallback } from 'react';
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
import dynamic from 'next/dynamic';
import { QRCodeSVG } from 'qrcode.react';
import AdminLayout from './layout';

const { Text } = Typography;

// Dynamically import Webcam to avoid SSR issues
const Webcam = dynamic(() => import('react-webcam'), {
  ssr: false
});

const QRScanner = () => {
  const [form] = Form.useForm();
  const [scanResult, setScanResult] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [scannedVisitors, setScannedVisitors] = useState([]);
  const [visitorStatus, setVisitorStatus] = useState(null);
  const [cameraError, setCameraError] = useState(false);
  const badgeRef = useRef(null);
  const webcamRef = useRef(null);

  const videoConstraints = {
    facingMode: "environment",
    width: 1280,
    height: 720
  };

  const handleError = (err: any) => {
    console.error(err);
    setCameraError(true);
    message.error('Error accessing camera. Please check your camera permissions or try manual entry.');
  };

  const checkVisitorStatus = (visitorId: string) => {
    // TODO: Implement API call to check visitor status
    const hasVisited = scannedVisitors.some((v: any) => v.visitorId === visitorId);
    return hasVisited;
  };

  const processVisitorData = (data: string) => {
    try {
      const visitorData = JSON.parse(data);
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
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // TODO: Implement QR code scanning using jsQR library
      // This needs to be done in a Web Worker or using a different library for Next.js
      message.info('QR code scanning simulation - implement actual scanning logic');
    }
  }, []);

  const handleManualEntry = (values: any) => {
    const visitorData = {
      visitorId: values.visitorId,
      name: values.name,
      company: values.company,
      designation: values.designation,
      eventName: values.eventName,
      endDate: values.endDate,
    };
    processVisitorData(JSON.stringify(visitorData));
    setShowManualEntry(false);
    form.resetFields();
  };

  const handlePrint = async (visitor: any) => {
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
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                onUserMediaError={handleError}
                className="w-full max-w-2xl"
              />
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
              name="designation"
              label="Designation"
              rules={[{ required: true, message: 'Please input designation!' }]}
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
            <Form.Item
              name="endDate"
              label="Valid Until"
              rules={[{ required: true, message: 'Please select end date!' }]}
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
            <Button key="print" type="primary" onClick={() => handlePrint(scanResult)}>
              Print Badge
            </Button>
          ]}
          width={400}
        >
          <div ref={badgeRef} className="w-[300px] p-5 border rounded-lg mx-auto text-center">
            <h2 className="mb-2">{scanResult.eventName}</h2>
            <Divider />
            <QRCodeSVG
              value={JSON.stringify(scanResult)}
              size={200}
              className="mx-auto my-2"
            />
            <Divider />
            <h3 className="my-2">{scanResult.name}</h3>
            <p className="my-1">{scanResult.company}</p>
            <p className="my-1">{scanResult.designation}</p>
            <Divider />
            <p className="my-1">Valid until: {scanResult.endDate}</p>
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
