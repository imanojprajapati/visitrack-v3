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
  Divider,
  Spin,
  Upload
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import {
  PrinterOutlined,
  QrcodeOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  UploadOutlined,
  CameraOutlined
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { parseCompactQRData } from '../../lib/qrcode';
import AdminLayout from './layout';
import { useAppContext } from '../../context/AppContext';
import dayjs from 'dayjs';
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats, Html5QrcodeResult } from 'html5-qrcode';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { Text } = Typography;
const { Dragger } = Upload;

// Add configuration for image scanning
const IMAGE_CONFIG = {
  maxImageSize: 1024 * 1024 * 2, // 2MB
  acceptedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxDimension: 2000 // pixels
};

// Define interfaces
interface VisitorEntry {
  _id: string;
  name: string;
  company: string;
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
  endDate?: string;
}

interface ManualEntryFormData {
  visitorId: string;
}

// Function to fetch visitor details
const fetchVisitorDetails = async (visitorId: string) => {
  try {
    console.log('Fetching visitor details:', { visitorId });
    const response = await fetch(`/api/visitors/${visitorId}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
      console.error('Error response from API:', { status: response.status, data: errorData });
      
      switch (response.status) {
        case 400:
          throw new Error(errorData.message || 'Invalid visitor ID');
        case 404:
          throw new Error(errorData.message || 'Visitor not found');
        case 503:
          throw new Error('Database connection error. Please try again later.');
        default:
          throw new Error(errorData.message || 'Failed to fetch visitor details');
      }
    }

    const data = await response.json();
    console.log('Visitor details received:', data);
    return data.visitor;
  } catch (error) {
    console.error('Error in fetchVisitorDetails:', error);
    throw error;
  }
};

// Function to register visitor entry
const registerVisitorEntry = async (visitorId: string) => {
  try {
    console.log('Registering visitor entry:', { visitorId });
    const response = await fetch('/api/visitors/register-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
      console.error('Error registering entry:', { status: response.status, data: errorData });
      throw new Error(errorData.message || 'Failed to register visitor entry');
    }

    const data = await response.json();
    console.log('Entry registration successful:', data);
    return data;
  } catch (error) {
    console.error('Error in registerVisitorEntry:', error);
    throw error;
  }
};

const QRScanner: React.FC = () => {
  const [form] = Form.useForm<ManualEntryFormData>();
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
  const [imageScanning, setImageScanning] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const html5QrCode = useRef<Html5Qrcode | null>(null);

  // Function to fetch QR scans
  const fetchQRScans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/qr-scans');
      if (!response.ok) {
        throw new Error('Failed to fetch QR scans');
      }
      const data = await response.json();
      setScannedVisitors(data.scans.map((scan: any) => ({
        _id: scan._id,
        name: scan.name,
        company: scan.company,
        eventName: scan.eventName,
        status: scan.status,
        scanTime: scan.scanTime,
        entryType: scan.entryType
      })));
    } catch (error) {
      console.error('Error fetching QR scans:', error);
      messageApi?.error('Failed to load QR scan data');
    } finally {
      setLoading(false);
    }
  };

  // Function to process QR data
  const processQRData = async (visitorId: string) => {
    try {
      console.log('Processing QR data:', visitorId);
      
      if (!visitorId) {
        throw new Error('No valid visitor ID found in QR code');
      }

      // Validate visitor ID format
      if (!/^[a-f0-9]{24}$/i.test(visitorId)) {
        throw new Error('Invalid visitor ID format');
      }

      // Register the entry using the scan endpoint
      const response = await fetch('/api/visitors/register-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process entry');
      }

      const result = await response.json();
      console.log('Entry processed successfully:', result);

      // Update the scans list
      await fetchQRScans();

      // Show success message
      messageApi?.success('Visitor entry processed successfully');

      return true;
    } catch (error) {
      console.error('Error processing QR data:', error);
      messageApi?.error({
        content: error instanceof Error ? error.message : 'Failed to process QR code data',
        duration: 5
      });
      return false;
    }
  };

  // Helper function to extract visitor ID from QR code data
  const extractVisitorId = (qrCodeData: string): string => {
    try {
      // The QR code contains just the visitor ID
      const visitorId = qrCodeData.trim();
      if (!/^[a-f0-9]{24}$/i.test(visitorId)) {
        throw new Error('Invalid visitor ID format in QR code');
      }
      return visitorId;
    } catch (error) {
      console.error('Error extracting visitor ID:', error);
      throw new Error('Invalid QR code format');
    }
  };

  // Load QR scan data when component mounts
  useEffect(() => {
    fetchQRScans();
  }, []);

  // Function to validate image before scanning
  const validateImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check file size
      if (file.size > IMAGE_CONFIG.maxImageSize) {
        messageApi?.error('Image size should be less than 2MB');
        resolve(false);
        return;
      }

      // Check file type
      if (!IMAGE_CONFIG.acceptedFormats.includes(file.type)) {
        messageApi?.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
        resolve(false);
        return;
      }

      // Check image dimensions
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width > IMAGE_CONFIG.maxDimension || img.height > IMAGE_CONFIG.maxDimension) {
          messageApi?.error(`Image dimensions should be less than ${IMAGE_CONFIG.maxDimension}x${IMAGE_CONFIG.maxDimension} pixels`);
          resolve(false);
          return;
        }
        resolve(true);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        messageApi?.error('Failed to load image. Please try another file.');
        resolve(false);
      };
    });
  };

  // Function to handle image scan
  const handleImageScan = async (file: File) => {
    try {
      // Validate image first
      const isValid = await validateImage(file);
      if (!isValid) {
        return;
      }

      setImageScanning(true);
      messageApi?.loading('Scanning QR code from image...');
      
      // Clean up previous instance if exists
      if (html5QrCode.current) {
        await html5QrCode.current.clear();
      }

      // Create new instance with more formats and configurations
      html5QrCode.current = new Html5Qrcode("qr-reader-image", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.CODE_128
        ],
        verbose: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });

      console.log("Starting image scan for file:", file.name);

      const qrCodeMessage = await html5QrCode.current.scanFile(file, true);
      console.log("Raw QR Code scan result:", qrCodeMessage);

      // Try to extract visitor ID from the QR code
      const visitorId = extractVisitorId(qrCodeMessage);
      console.log("Extracted visitor ID:", visitorId);

      // Process the visitor ID
      await processQRData(visitorId);
      setUploadedFiles([]);

    } catch (error) {
      console.error('Error scanning image:', error);
      
      let errorMessage = 'Failed to scan QR code from image.';
      
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        if (errorText.includes('no multiformat readers were able to detect the code')) {
          errorMessage = 'No QR code found. Please ensure the image is clear and contains a valid QR code.';
        } else if (errorText.includes('no valid ids found')) {
          errorMessage = 'QR code found but no valid visitor ID detected. Please ensure this is a visitor QR code.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      messageApi?.error({
        content: errorMessage,
        duration: 5
      });
    } finally {
      setImageScanning(false);
      if (html5QrCode.current) {
        await html5QrCode.current.clear();
      }
    }
  };

  // Upload props configuration with improved validation
  const uploadProps: UploadProps = {
    accept: IMAGE_CONFIG.acceptedFormats.join(','),
    beforeUpload: (file) => {
      handleImageScan(file);
      return false; // Prevent actual upload
    },
    fileList: uploadedFiles,
    maxCount: 1,
    onRemove: () => {
      setUploadedFiles([]);
      return true;
    },
    showUploadList: false // Hide the upload list for cleaner UI
  };

  useEffect(() => {
    if (showScanner) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdgePercentage = 0.7;
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return {
              width: qrboxSize,
              height: qrboxSize
            };
          },
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.CODE_128
          ],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 1,
          videoConstraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: { ideal: "environment" }
          }
        },
        false
      );

      scannerRef.current.render(
        async (decodedText: string) => {
          console.log('Camera scan result:', decodedText);
          try {
            // Extract visitor ID from QR code
            const visitorId = extractVisitorId(decodedText);
            
            // Process the visitor ID
            await processQRData(visitorId);
            
            if (scannerRef.current) {
              scannerRef.current.clear();
            }
            setShowScanner(false);
          } catch (error) {
            console.error('Error processing camera scan:', error);
            messageApi?.error({
              content: error instanceof Error ? error.message : 'Failed to process QR code',
              duration: 5
            });
          }
        },
        (error) => {
          // Only log scanning errors, don't show to user unless it's a critical error
          console.error('QR scan error:', error);
          if (!error.toString().includes('NotFoundException')) {
            messageApi?.error('Failed to scan QR code. Please try again or use image upload.');
          }
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [showScanner, messageApi, form]);

  const checkVisitorStatus = (visitorId: string): boolean => {
    return scannedVisitors.some(v => v._id === visitorId);
  };

  // Function to handle manual entry
  const handleManualEntry = async (values: ManualEntryFormData) => {
    try {
      setLoading(true);
      
      // Call the manual entry API endpoint
      const response = await fetch('/api/visitors/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: values.visitorId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process manual entry');
      }

      // Refresh the scans list
      await fetchQRScans();
      
      setShowManualEntry(false);
      form.resetFields();
      messageApi?.success('Manual entry processed successfully');
    } catch (error) {
      console.error('Error processing manual entry:', error);
      messageApi?.error({
        content: error instanceof Error ? error.message : 'Failed to process manual entry',
        duration: 5
      });
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
      render: (scanTime: string) => {
        try {
          if (!scanTime) return '-';
          return dayjs(scanTime).format('DD/MM/YYYY HH:mm:ss');
        } catch (error) {
          console.error('Error formatting date:', error);
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
            onClick={() => handlePrint(record as unknown as VisitorData)}
          >
            Print Badge
          </Button>
        </Space>
      ),
    },
  ];

  // Function to handle QR code scan
  const handleQrCodeScan = async (qrData: string) => {
    try {
      // Extract visitor ID from QR code
      const visitorId = extractVisitorId(qrData);
      await processQRData(visitorId);
      setShowScanner(false);
    } catch (error) {
      console.error('Error scanning QR code:', error);
      messageApi?.error(error instanceof Error ? error.message : 'Failed to process QR code');
    }
  };

  // Function to handle badge preview
  const handlePreview = (visitor: VisitorData) => {
    setScanResult(visitor);
    setShowPreview(true);
  };

  // Badge preview component
  const BadgePreview: React.FC<{ visitor: VisitorData }> = ({ visitor }) => (
    <div ref={badgeRef} className="w-[300px] p-5 border rounded-lg mx-auto text-center">
      <h2 className="mb-2">{visitor.eventName}</h2>
      <Divider />
      <div className="qr-code-container">
        <QRCodeSVG
          value={visitor.visitorId}
          size={180}
          level="H"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>
      <Divider />
      <h3 className="my-2">{visitor.name}</h3>
      <p className="my-1">{visitor.company}</p>
      <p className="my-1">{visitor.designation}</p>
      <Divider />
      <p className="my-1">Valid until: {visitor.endDate}</p>
    </div>
  );

  // Preview modal component
  const PreviewModal: React.FC<{ visitor: VisitorData | null }> = ({ visitor }) => (
    <Modal
      title="Badge Preview"
      open={visitor !== null}
      onCancel={() => setScanResult(null)}
      footer={[
        <Button key="print" type="primary" onClick={() => visitor && handlePrint(visitor)}>
          Print Badge
        </Button>
      ]}
      width={400}
    >
      {visitor && <BadgePreview visitor={visitor} />}
    </Modal>
  );

  // Visitor status modal
  useEffect(() => {
    if (scanResult) {
      setVisitorStatus(checkVisitorStatus(scanResult.visitorId));
    } else {
      setVisitorStatus(null);
    }
  }, [scanResult, checkVisitorStatus]);

  // Manual Entry Modal
  const ManualEntryModal: React.FC<{
    visible: boolean;
    onCancel: () => void;
    form: FormInstance<ManualEntryFormData>;
    loading: boolean;
    onFinish: (values: ManualEntryFormData) => Promise<void>;
  }> = ({ visible, onCancel, form, loading, onFinish }) => (
    <Modal
      title="Manual Visitor Entry"
      open={visible}
      onCancel={onCancel}
      footer={null}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item
          name="visitorId"
          label="Visitor ID"
          rules={[
            { required: true, message: 'Please enter the visitor ID' },
            { pattern: /^[0-9a-fA-F]{24}$/, message: 'Please enter a valid visitor ID (24 characters, hexadecimal)' }
          ]}
          help="24-character hexadecimal ID from the QR code"
        >
          <Input.TextArea
            placeholder="Enter visitor ID from QR code"
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Submit Entry
            </Button>
            <Button onClick={onCancel}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">QR Scanner</h1>
        
        <Card>
          <div className="mb-4 flex gap-2">
            <Button
              type="primary"
              icon={<CameraOutlined />}
              onClick={() => setShowScanner(true)}
            >
              Camera Scanner
            </Button>
            <Button
              icon={<UserAddOutlined />}
              onClick={() => setShowManualEntry(true)}
            >
              Manual Entry
            </Button>
          </div>

          {/* Hidden div for image scanning */}
          <div id="qr-reader-image" style={{ display: 'none' }}></div>

          <Table
            columns={columns}
            dataSource={scannedVisitors}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
            loading={loading}
          />
        </Card>

        {/* QR Scanner Modal with improved UI */}
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
          footer={[
            <Upload key="upload" {...uploadProps}>
              <Button icon={<UploadOutlined />}>
                Upload QR Image
              </Button>
            </Upload>,
            <Button key="manual" onClick={() => {
              setShowScanner(false);
              setShowManualEntry(true);
            }}>
              Enter Manually
            </Button>
          ]}
          width={800}
        >
          <div className="w-full flex flex-col items-center">
            {cameraError ? (
              <div className="text-center p-5">
                <CloseCircleOutlined className="text-4xl text-red-500" />
                <Text className="block mt-4 text-base">
                  Camera access error. Please try uploading an image or check camera permissions.
                </Text>
                <div className="mt-4 space-y-2">
                  <Text className="block">Troubleshooting tips:</Text>
                  <ul className="list-disc list-inside text-left">
                    <li>Allow camera access in your browser settings</li>
                    <li>Make sure your camera is not being used by another application</li>
                    <li>Try using a different browser (Chrome or Edge recommended)</li>
                    <li>Ensure you're using HTTPS</li>
                    <li>If on mobile, try using the rear camera</li>
                    <li>You can also try uploading a QR code image instead</li>
                  </ul>
                </div>
                <Space className="mt-4">
                  <Button 
                    onClick={() => {
                      setCameraError(false);
                      if (scannerRef.current) {
                        scannerRef.current.clear();
                        scannerRef.current.render(
                          (decodedText) => handleQrCodeScan(decodedText),
                          (error) => {
                            console.error('QR Scan error:', error);
                            setCameraError(true);
                          }
                        );
                      }
                    }}
                  >
                    Try Again
                  </Button>
                  <Upload {...uploadProps}>
                    <Button type="primary" icon={<UploadOutlined />}>
                      Upload QR Image
                    </Button>
                  </Upload>
                </Space>
              </div>
            ) : (
              <>
                <div id="qr-reader" className="w-full max-w-2xl" />
                <div className="mt-6 text-center space-y-4">
                  <Text className="block text-gray-500">
                    Position the QR code within the frame to scan
                  </Text>
                  <div className="space-y-2">
                    <Text className="block text-sm text-gray-400">Tips for better scanning:</Text>
                    <ul className="list-disc list-inside text-sm text-gray-400 text-left">
                      <li>Hold the QR code steady and parallel to the camera</li>
                      <li>Ensure good lighting conditions</li>
                      <li>Keep the QR code within the scanning frame</li>
                      <li>Make sure the QR code is not damaged or blurry</li>
                      <li>Try adjusting the distance between the camera and QR code</li>
                      <li>If scanning doesn't work, try uploading the QR code image</li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* Manual Entry Modal */}
        <ManualEntryModal
          visible={showManualEntry}
          onCancel={() => {
            setShowManualEntry(false);
            form.resetFields();
          }}
          form={form}
          loading={loading}
          onFinish={handleManualEntry}
        />

        {/* Preview Modal */}
        <PreviewModal visitor={scanResult} />

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
