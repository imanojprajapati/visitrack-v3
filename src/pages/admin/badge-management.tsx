import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Upload,
  Switch,
  Row,
  Col,
  Divider,
  message,
  Modal,
  Radio,
  InputNumber,
  Typography,
  Table,
  Tag,
  Drawer,
  Descriptions,
  Image,
  Spin
} from 'antd';
import {
  UploadOutlined,
  SaveOutlined,
  PrinterOutlined,
  EyeOutlined,
  DeleteOutlined,
  PlusOutlined,
  EditOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import AdminLayout from './layout';
import { useRouter } from 'next/router';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import type { UploadProps } from 'antd';
import { v2 as cloudinary } from 'cloudinary';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ReactDOM from 'react-dom/client';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dghizdjio',
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

interface Event {
  _id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
}

interface BadgeTemplate {
  _id?: string;
  name: string;
  eventId: string;
  size: {
    width: number;
    height: number;
    unit: string;
  };
  orientation: 'portrait' | 'landscape';
  title: {
    enabled: boolean;
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    position: { x: number; y: number };
  };
  subtitle: {
    enabled: boolean;
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    position: { x: number; y: number };
  };
  additionalInfo: {
    enabled: boolean;
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    position: { x: number; y: number };
  };
  badge: {
    cloudinaryUrl?: string;
    cloudinaryPublicId?: string;
    imageData?: string;
  };
  qrCode: {
    enabled: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
    cloudinaryUrl?: string;
  };
  showQRCode: boolean;
}

const BadgeManagement: React.FC = () => {
  const [form] = Form.useForm<BadgeTemplate>();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [logoFile, setLogoFile] = useState<UploadFile | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<UploadFile | null>(null);
  const router = useRouter();
  const [previewDrawerVisible, setPreviewDrawerVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BadgeTemplate | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  const [template, setTemplate] = useState<BadgeTemplate>({
    name: '',
    eventId: '',
    size: {
      width: 3.375,
      height: 2.125,
      unit: 'inches'
    },
    orientation: 'portrait',
    title: {
      enabled: true,
      text: 'Visitor Badge',
      fontSize: 24,
      fontFamily: 'Arial',
      color: '#000000',
      position: { x: 0.5, y: 0.5 }
    },
    subtitle: {
      enabled: true,
      text: 'Event Name',
      fontSize: 18,
      fontFamily: 'Arial',
      color: '#666666',
      position: { x: 0.5, y: 0.7 }
    },
    additionalInfo: {
      enabled: true,
      text: 'Additional information will appear here',
      fontSize: 14,
      fontFamily: 'Arial',
      color: '#333333',
      position: { x: 0.5, y: 0.85 }
    },
    badge: {
      cloudinaryUrl: undefined,
      cloudinaryPublicId: undefined,
      imageData: undefined
    },
    qrCode: {
      enabled: true,
      position: { x: 0.8, y: 0.5 },
      size: { width: 1, height: 1 }
    },
    showQRCode: true
  });

  useEffect(() => {
    fetchEvents();
    fetchTemplates();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      message.error('Failed to load events');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/badge-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      message.error('Failed to load templates');
    }
  };

  const handleBadgeUpload = async (file: File): Promise<string> => {
    try {
      // First convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result); // Keep the full data URL
        };
        reader.onerror = error => reject(error);
      });

      // Upload to our server endpoint
      const response = await fetch('/api/upload/badge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload badge');
      }

      const data = await response.json();

      // Update template with badge data
      setTemplate(prev => ({
        ...prev,
        badge: {
          cloudinaryUrl: data.url,
          cloudinaryPublicId: data.publicId,
          imageData: base64
        }
      }));

      message.success('Badge uploaded successfully');
      return data.url;
    } catch (error) {
      console.error('Error uploading badge:', error);
      message.error(error instanceof Error ? error.message : 'Failed to upload badge');
      throw error;
    }
  };

  const handleBadgeUploadRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    if (file instanceof File) {
      try {
        // Validate file type
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
          throw new Error('You can only upload image files!');
        }

        // Validate file size (2MB limit)
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
          throw new Error('Image must be smaller than 2MB!');
        }

        const url = await handleBadgeUpload(file);
        onSuccess?.(url);
      } catch (error) {
        console.error('Error in upload request:', error);
        onError?.(error as Error);
      }
    } else {
      onError?.(new Error('Invalid file type'));
    }
  };

  // Update the upload component
  const uploadProps: UploadProps = {
    accept: 'image/*',
    showUploadList: false,
    customRequest: handleBadgeUploadRequest,
    beforeUpload: (file: RcFile) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('You can only upload image files!');
        return Upload.LIST_IGNORE;
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('Image must be smaller than 2MB!');
        return Upload.LIST_IGNORE;
      }
      return true;
    }
  };

  const handleSaveTemplate = async (values: BadgeTemplate) => {
    try {
      setLoading(true);
      
      // Convert dimensions to mm if needed
      const templateData = {
        ...values,
        size: {
          ...values.size,
          width: values.size.unit === 'inches' ? values.size.width * 25.4 : values.size.width,
          height: values.size.unit === 'inches' ? values.size.height * 25.4 : values.size.height,
          unit: 'mm'
        },
        // Ensure badge data is included
        badge: template.badge?.cloudinaryUrl ? {
          cloudinaryUrl: template.badge.cloudinaryUrl,
          cloudinaryPublicId: template.badge.cloudinaryPublicId
        } : undefined,
        // Set default values for optional fields
        qrCode: {
          enabled: values.showQRCode || false,
          position: { x: 0.8, y: 0.5 },
          size: { width: 1, height: 1 }
        }
      };

      const response = await fetch('/api/badge-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save template');
      }
      
      message.success('Template saved successfully');
      fetchTemplates();
      form.resetFields();
      setTemplate({
        name: '',
        eventId: '',
        size: {
          width: 3.375,
          height: 2.125,
          unit: 'inches'
        },
        orientation: 'portrait',
        title: {
          enabled: true,
          text: 'Visitor Badge',
          fontSize: 24,
          fontFamily: 'Arial',
          color: '#000000',
          position: { x: 0.5, y: 0.5 }
        },
        subtitle: {
          enabled: true,
          text: 'Event Name',
          fontSize: 18,
          fontFamily: 'Arial',
          color: '#666666',
          position: { x: 0.5, y: 0.7 }
        },
        additionalInfo: {
          enabled: true,
          text: 'Additional information will appear here',
          fontSize: 14,
          fontFamily: 'Arial',
          color: '#333333',
          position: { x: 0.5, y: 0.85 }
        },
        badge: {
          cloudinaryUrl: undefined,
          cloudinaryPublicId: undefined,
          imageData: undefined
        },
        qrCode: {
          enabled: true,
          position: { x: 0.8, y: 0.5 },
          size: { width: 1, height: 1 }
        },
        showQRCode: true
      });
    } catch (error) {
      console.error('Error saving template:', error);
      message.error(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  // Update the generateAndUploadQRCode function
  const generateAndUploadQRCode = async (templateId: string, eventId: string) => {
    try {
      setIsGeneratingQR(true);
      
      // Get event details
      const event = events.find(e => e._id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Create a temporary div to render QR code
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '1000px';
      tempDiv.style.height = '1000px';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.background = '#ffffff';
      tempDiv.style.display = 'flex';
      tempDiv.style.justifyContent = 'center';
      tempDiv.style.alignItems = 'center';
      document.body.appendChild(tempDiv);

      // Render QR code using ReactDOM
      const qrCodeComponent = document.createElement('div');
      qrCodeComponent.id = 'qr-code-container';
      qrCodeComponent.style.display = 'flex';
      qrCodeComponent.style.justifyContent = 'center';
      qrCodeComponent.style.alignItems = 'center';
      qrCodeComponent.style.width = '100%';
      qrCodeComponent.style.height = '100%';
      tempDiv.appendChild(qrCodeComponent);

      // Use ReactDOM to render the QR code with specific IP address
      const root = ReactDOM.createRoot(qrCodeComponent);
      root.render(
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: '100%',
          height: '100%'
        }}>
          <QRCodeSVG
            value={`http://192.168.29.163:3000/verify/${templateId}`}
            size={1000}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
            includeMargin={true}
          />
        </div>
      );

      // Wait for the QR code to render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Convert QR code to image using html2canvas
      const canvas = await html2canvas(qrCodeComponent, {
        background: '#ffffff',
        logging: false,
        useCORS: true,
        width: 1000, // Increased size for better quality
        height: 1000
      });

      // Create a new canvas for the final size with high quality
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = 500;
      finalCanvas.height = 500;
      const ctx = finalCanvas.getContext('2d');
      if (ctx) {
        // Enable high-quality image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Draw the larger canvas onto the smaller one with high quality
        ctx.drawImage(canvas, 0, 0, 1000, 1000, 0, 0, 500, 500);
      }

      // Convert canvas to base64
      const imageData = finalCanvas.toDataURL('image/png', 1.0);

      // Upload to Cloudinary through our API
      const response = await fetch('/api/upload/qr-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image: imageData,
          templateId,
          eventId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload QR code');
      }

      const data = await response.json();

      // Update template with QR code URL
      const updateResponse = await fetch(`/api/badge-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrCode: {
            enabled: true,
            cloudinaryUrl: data.url,
            cloudinaryPublicId: data.publicId,
            position: { x: 0.8, y: 0.5 },
            size: { width: 1, height: 1 }
          }
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update template with QR code');
      }

      // Cleanup
      root.unmount();
      document.body.removeChild(tempDiv);
      return data.url;
    } catch (error) {
      console.error('Error generating QR code:', error);
      message.error(error instanceof Error ? error.message : 'Failed to generate QR code');
      throw error;
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Update the handlePreview function
  const handlePreview = async (template: BadgeTemplate) => {
    try {
      setSelectedTemplate(template);
      setIsGeneratingQR(true);
      
      // Always generate a new QR code when previewing
      const qrUrl = await generateAndUploadQRCode(template._id!, template.eventId);
      
      // Update template with QR code URL
      const updatedTemplate = {
        ...template,
        qrCode: {
          ...template.qrCode,
          cloudinaryUrl: qrUrl
        }
      };
      setSelectedTemplate(updatedTemplate);
      setPreviewDrawerVisible(true);
    } catch (error) {
      console.error('Error in preview:', error);
      message.error('Failed to generate preview');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Update the handlePrint function
  const handlePrint = async () => {
    if (!selectedTemplate) return;

    try {
      message.loading('Preparing badge for print...', 0);
      
      // Generate QR code if not exists
      if (!selectedTemplate.qrCode?.cloudinaryUrl) {
        await generateAndUploadQRCode(selectedTemplate._id!, selectedTemplate.eventId);
      }

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        message.error('Please allow popups to print the badge');
        return;
      }

      // Get event details
      const event = events.find(e => e._id === selectedTemplate.eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Create print content with proper styling
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Badge Print Preview</title>
            <style>
              @page {
                size: ${selectedTemplate.orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape'};
                margin: 0;
              }
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #ffffff;
              }
              .badge-container {
                width: ${selectedTemplate.size.width}${selectedTemplate.size.unit};
                height: ${selectedTemplate.size.height}${selectedTemplate.size.unit};
                background: white;
                position: relative;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                padding: 20px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              .badge-content {
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              .badge-header {
                text-align: center;
                margin-bottom: 20px;
              }
              .badge-body {
                flex: 1;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 20px 0;
              }
              .badge-info {
                flex: 1;
                padding-right: 20px;
              }
              .badge-qr {
                width: 150px;
                height: 150px;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              .badge-qr img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
              }
              .badge-footer {
                text-align: center;
                font-size: 12px;
                color: #666;
                margin-top: 20px;
              }
              @media print {
                body {
                  background: white;
                  padding: 0;
                }
                .badge-container {
                  box-shadow: none;
                  border: 1px solid #ddd;
                }
              }
            </style>
          </head>
          <body>
            <div class="badge-container">
              <div class="badge-content">
                ${selectedTemplate.badge?.cloudinaryUrl ? `
                  <div class="badge-header">
                    <img 
                      src="${selectedTemplate.badge.cloudinaryUrl}" 
                      alt="Badge" 
                      style="max-width: 100%; max-height: 200px; object-fit: contain;"
                    />
                  </div>
                ` : ''}
                <div class="badge-body">
                  <div class="badge-info">
                    ${selectedTemplate.title?.enabled ? `
                      <h1 style="
                        font-size: ${selectedTemplate.title.fontSize}px;
                        font-family: ${selectedTemplate.title.fontFamily};
                        color: ${selectedTemplate.title.color};
                        margin: 0 0 10px 0;
                      ">${selectedTemplate.title.text}</h1>
                    ` : ''}
                    ${selectedTemplate.subtitle?.enabled ? `
                      <h2 style="
                        font-size: ${selectedTemplate.subtitle.fontSize}px;
                        font-family: ${selectedTemplate.subtitle.fontFamily};
                        color: ${selectedTemplate.subtitle.color};
                        margin: 0 0 10px 0;
                      ">${selectedTemplate.subtitle.text}</h2>
                    ` : ''}
                    ${selectedTemplate.additionalInfo?.enabled ? `
                      <div style="
                        font-size: ${selectedTemplate.additionalInfo.fontSize}px;
                        font-family: ${selectedTemplate.additionalInfo.fontFamily};
                        color: ${selectedTemplate.additionalInfo.color};
                      ">${selectedTemplate.additionalInfo.text}</div>
                    ` : ''}
                  </div>
                  ${selectedTemplate.qrCode?.enabled && selectedTemplate.qrCode.cloudinaryUrl ? `
                    <div class="badge-qr">
                      <img src="${selectedTemplate.qrCode.cloudinaryUrl}" alt="QR Code" />
                    </div>
                  ` : ''}
                </div>
                <div class="badge-footer">
                  <div>${event.title}</div>
                  <div>${event.location}</div>
                  <div>${new Date(event.startDate).toLocaleDateString()}</div>
                  <div>Generated on ${new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                  window.onafterprint = function() {
                    window.close();
                  };
                }, 1000);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      message.destroy();
    } catch (error) {
      console.error('Error printing badge:', error);
      message.error('Failed to generate print preview');
      message.destroy();
    }
  };

  // Update the table columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: BadgeTemplate) => (
        <Space>
          <span>{text}</span>
          {record.badge?.cloudinaryUrl && (
            <Image
              src={record.badge.cloudinaryUrl}
              alt="Badge"
              width={24}
              height={24}
              style={{ objectFit: 'contain' }}
            />
          )}
        </Space>
      ),
    },
    {
      title: 'Event',
      dataIndex: 'eventId',
      key: 'event',
      render: (eventId: string) => {
        const event = events.find(e => e._id === eventId);
        return event ? event.title : 'N/A';
      },
    },
    {
      title: 'Size',
      key: 'size',
      render: (text: string, record: BadgeTemplate) => (
        `${record.size.width} x ${record.size.height} ${record.size.unit}`
      ),
    },
    {
      title: 'Orientation',
      dataIndex: 'orientation',
      key: 'orientation',
      render: (orientation: string) => (
        <Tag color={orientation === 'portrait' ? 'blue' : 'green'}>
          {orientation.charAt(0).toUpperCase() + orientation.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: string, record: BadgeTemplate) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
            title="Preview"
          />
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue(record);
              setSelectedTemplate(record);
            }}
            title="Edit"
          />
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={async () => {
              try {
                const response = await fetch(`/api/badge-templates/${record._id}`, {
                  method: 'DELETE',
                });
                if (!response.ok) throw new Error('Failed to delete template');
                message.success('Template deleted successfully');
                fetchTemplates();
              } catch (error) {
                console.error('Error deleting template:', error);
                message.error('Failed to delete template');
              }
            }}
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        <Card 
          title={
            <Space>
              <Title level={4} style={{ margin: 0 }}>Badge Template Management</Title>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  form.resetFields();
                  setSelectedTemplate(null);
                }}
              >
                New Template
              </Button>
            </Space>
          }
          className="mb-6"
          extra={
            <Space>
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                onClick={() => form.submit()}
                loading={loading}
              >
                Save Template
              </Button>
              <Button onClick={() => form.resetFields()}>Reset</Button>
            </Space>
          }
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveTemplate}
            initialValues={template}
          >
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="eventId"
                  label="Select Event"
                  rules={[{ required: true, message: 'Please select an event' }]}
                >
                  <Select
                    placeholder="Select an event"
                    onChange={(value) => setSelectedEvent(value)}
                  >
                    {events.map(event => (
                      <Option key={event._id} value={event._id}>
                        {event.title}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="name"
                  label="Template Name"
                  rules={[{ required: true, message: 'Please enter template name' }]}
                >
                  <Input placeholder="Enter template name" />
                </Form.Item>

                <Form.Item
                  name="orientation"
                  label="Orientation"
                  rules={[{ required: true }]}
                >
                  <Radio.Group>
                    <Radio value="portrait">Portrait</Radio>
                    <Radio value="landscape">Landscape</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label="Badge Size">
                  <Space>
                    <Form.Item
                      name={['size', 'width']}
                      rules={[{ required: true }]}
                      noStyle
                    >
                      <InputNumber min={1} max={20} step={0.125} placeholder="Width" />
                    </Form.Item>
                    <span>x</span>
                    <Form.Item
                      name={['size', 'height']}
                      rules={[{ required: true }]}
                      noStyle
                    >
                      <InputNumber min={1} max={20} step={0.125} placeholder="Height" />
                    </Form.Item>
                    <Form.Item
                      name={['size', 'unit']}
                      noStyle
                    >
                      <Select style={{ width: 100 }}>
                        <Option value="inches">inches</Option>
                        <Option value="mm">mm</Option>
                      </Select>
                    </Form.Item>
                  </Space>
                </Form.Item>

                <Form.Item
                  name={['title', 'text']}
                  label="Badge Title"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Enter badge title" />
                </Form.Item>

                <Form.Item
                  name={['subtitle', 'text']}
                  label="Subtitle"
                >
                  <Input placeholder="Enter subtitle" />
                </Form.Item>

                <Form.Item
                  name={['additionalInfo', 'text']}
                  label="Additional Information"
                >
                  <TextArea
                    placeholder="Enter additional information text"
                    rows={4}
                    maxLength={500}
                    showCount
                  />
                </Form.Item>

                <Form.Item
                  name="showQRCode"
                  label="Show QR Code"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item label="Upload Badge">
                  <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>Upload Badge</Button>
                  </Upload>
                  {template.badge?.cloudinaryUrl && (
                    <div className="mt-2">
                      <Image
                        src={template.badge.cloudinaryUrl}
                        alt="Badge preview"
                        style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
                        preview={true}
                      />
                    </div>
                  )}
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      Save Template
                    </Button>
                    <Button onClick={() => form.resetFields()}>Reset</Button>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card 
          title={
            <Space>
              <Title level={4} style={{ margin: 0 }}>Saved Templates</Title>
              <Tag color="blue">{templates.length} templates</Tag>
            </Space>
          }
          className="mt-6"
        >
          <Table
            columns={columns}
            dataSource={templates}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
          />
        </Card>

        <Drawer
          title={
            <Space>
              <Title level={4} style={{ margin: 0 }}>Template Preview</Title>
              {selectedTemplate && (
                <Space>
                  <Tag color="blue">
                    {events.find(e => e._id === selectedTemplate.eventId)?.title || 'No Event'}
                  </Tag>
                  <Button
                    type="primary"
                    icon={<PrinterOutlined />}
                    onClick={handlePrint}
                    loading={isGeneratingQR}
                  >
                    Print Badge
                  </Button>
                </Space>
              )}
            </Space>
          }
          placement="right"
          width="100%"
          onClose={() => setPreviewDrawerVisible(false)}
          visible={previewDrawerVisible}
          bodyStyle={{ 
            padding: 0,
            background: '#f0f2f5',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh'
          }}
        >
          {selectedTemplate && (
            <div className="preview-container" style={{ 
              width: '210mm', // A4 width
              minHeight: '297mm', // A4 height
              background: 'white',
              margin: '20px auto',
              padding: '20mm',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '30mm'
            }}>
              {/* First Row: Badge Image */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100mm',
                paddingTop: '20mm'
              }}>
                {selectedTemplate.badge?.cloudinaryUrl ? (
                  <div style={{
                    width: `${selectedTemplate.size.width}${selectedTemplate.size.unit}`,
                    height: `${selectedTemplate.size.height}${selectedTemplate.size.unit}`,
                    position: 'relative',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '1px solid #e8e8e8',
                    overflow: 'hidden',
                    background: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Image
                      src={selectedTemplate.badge.cloudinaryUrl}
                      alt="Badge Template"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain'
                      }}
                      preview={false}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: `${selectedTemplate.size.width}${selectedTemplate.size.unit}`,
                    height: `${selectedTemplate.size.height}${selectedTemplate.size.unit}`,
                    background: '#fafafa',
                    border: '1px dashed #d9d9d9',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#999'
                  }}>
                    <Space direction="vertical" align="center">
                      <UploadOutlined style={{ fontSize: '24px' }} />
                      <Text>No Badge Image Uploaded</Text>
                    </Space>
                  </div>
                )}
              </div>

              {/* Second Row: User Input Data */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                minHeight: '80mm'
              }}>
                <Card 
                  style={{ 
                    width: '160mm',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  title={
                    <Title level={4} style={{ margin: 0 }}>
                      Badge Content Preview
                    </Title>
                  }
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10mm' }}>
                    {/* Title Section */}
                    {selectedTemplate.title?.enabled && (
                      <div>
                        <Text strong style={{ display: 'block', marginBottom: '4px' }}>Title</Text>
                        <div style={{
                          fontSize: `${selectedTemplate.title.fontSize}px`,
                          fontFamily: selectedTemplate.title.fontFamily,
                          color: selectedTemplate.title.color,
                          padding: '8px',
                          background: '#fafafa',
                          borderRadius: '4px'
                        }}>
                          {selectedTemplate.title.text}
                        </div>
                      </div>
                    )}

                    {/* Subtitle Section */}
                    {selectedTemplate.subtitle?.enabled && (
                      <div>
                        <Text strong style={{ display: 'block', marginBottom: '4px' }}>Subtitle</Text>
                        <div style={{
                          fontSize: `${selectedTemplate.subtitle.fontSize}px`,
                          fontFamily: selectedTemplate.subtitle.fontFamily,
                          color: selectedTemplate.subtitle.color,
                          padding: '8px',
                          background: '#fafafa',
                          borderRadius: '4px'
                        }}>
                          {selectedTemplate.subtitle.text}
                        </div>
                      </div>
                    )}

                    {/* Additional Info Section */}
                    {selectedTemplate.additionalInfo?.enabled && (
                      <div>
                        <Text strong style={{ display: 'block', marginBottom: '4px' }}>Additional Information</Text>
                        <div style={{
                          fontSize: `${selectedTemplate.additionalInfo.fontSize}px`,
                          fontFamily: selectedTemplate.additionalInfo.fontFamily,
                          color: selectedTemplate.additionalInfo.color,
                          padding: '8px',
                          background: '#fafafa',
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {selectedTemplate.additionalInfo.text}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Third Row: QR Code */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column',
                minHeight: '80mm',
                gap: '10mm'
              }}>
                <Title level={4} style={{ margin: 0 }}>QR Code for Verification</Title>
                {selectedTemplate.qrCode?.enabled && (
                  <div style={{ 
                    background: 'white',
                    padding: '10mm',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '1px solid #e8e8e8',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5mm',
                    width: '70mm',
                    height: '70mm'
                  }}>
                    {isGeneratingQR ? (
                      <div style={{ 
                        width: '50mm',
                        height: '50mm',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: '#999',
                        border: '1px dashed #d9d9d9',
                        borderRadius: '4px'
                      }}>
                        <Spin size="large" />
                        <div style={{ marginTop: '8px' }}>Generating QR Code...</div>
                      </div>
                    ) : selectedTemplate.qrCode.cloudinaryUrl ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%'
                      }}>
                        <Image
                          src={selectedTemplate.qrCode.cloudinaryUrl}
                          alt="QR Code"
                          style={{ 
                            width: '50mm',
                            height: '50mm',
                            objectFit: 'contain'
                          }}
                          preview={false}
                        />
                        <Text type="secondary" style={{ marginTop: '5mm' }}>
                          Scan to verify badge authenticity
                        </Text>
                      </div>
                    ) : (
                      <div style={{ 
                        width: '50mm',
                        height: '50mm',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: '#999',
                        border: '1px dashed #d9d9d9',
                        borderRadius: '4px'
                      }}>
                        <QrcodeOutlined style={{ fontSize: '24px' }} />
                        <div style={{ marginTop: '8px' }}>Click Preview to Generate QR Code</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AdminLayout>
  );
};

export default BadgeManagement;

export async function getServerSideProps() {
  return {
    props: {
      isAdminPage: true,
    },
  };
} 