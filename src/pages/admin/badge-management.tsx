import React, { useState, useEffect } from 'react';
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
  Image
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

  const handlePrint = async (template: BadgeTemplate) => {
    try {
      if (!template._id) {
        message.error('Template ID is required for printing');
        return;
      }

      // Ensure all required fields are present with proper defaults
      const printData = {
        templateId: template._id,
        visitorData: {
          id: 'preview',
          name: 'John Doe',
          email: 'john@example.com',
          company: 'Sample Company',
          photoUrl: template.badge?.cloudinaryUrl || '',
        },
        template: {
          ...template,
          size: {
            width: template.size.width,
            height: template.size.height,
            unit: template.size.unit
          },
          orientation: template.orientation || 'portrait',
          title: {
            enabled: template.title?.enabled ?? false,
            text: template.title?.text || '',
            fontSize: template.title?.fontSize || 24,
            fontFamily: template.title?.fontFamily || 'Arial',
            color: template.title?.color || '#000000',
            position: template.title?.position || { x: 0.5, y: 0.5 }
          },
          subtitle: {
            enabled: template.subtitle?.enabled ?? false,
            text: template.subtitle?.text || '',
            fontSize: template.subtitle?.fontSize || 18,
            fontFamily: template.subtitle?.fontFamily || 'Arial',
            color: template.subtitle?.color || '#666666',
            position: template.subtitle?.position || { x: 0.5, y: 0.7 }
          },
          additionalInfo: {
            enabled: template.additionalInfo?.enabled ?? false,
            text: template.additionalInfo?.text || '',
            fontSize: template.additionalInfo?.fontSize || 14,
            fontFamily: template.additionalInfo?.fontFamily || 'Arial',
            color: template.additionalInfo?.color || '#333333',
            position: template.additionalInfo?.position || { x: 0.5, y: 0.85 }
          },
          qrCode: {
            enabled: template.qrCode?.enabled ?? false,
            position: template.qrCode?.position || { x: 0.8, y: 0.5 },
            size: template.qrCode?.size || { width: 1, height: 1 }
          },
          badge: template.badge || {
            cloudinaryUrl: undefined,
            cloudinaryPublicId: undefined
          }
        }
      };

      const response = await fetch('/api/badge-templates/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(printData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `badge-template-${template.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      message.error(error.message || 'Failed to generate PDF');
    }
  };

  const handlePreview = (template: BadgeTemplate) => {
    setSelectedTemplate(template);
    setPreviewDrawerVisible(true);
  };

  const PreviewContent = ({ template }: { template: BadgeTemplate }) => {
    // A4 size in pixels (at 96 DPI)
    const A4_WIDTH = 794; // 8.27 inches * 96
    const A4_HEIGHT = 1123; // 11.69 inches * 96

    // Convert size to pixels (1 inch = 96px, 1mm ≈ 3.78px)
    const getPixelSize = (size: number, unit: string) => {
      if (unit === 'inches') return size * 96;
      if (unit === 'mm') return size * 3.78;
      return size;
    };

    // Get actual badge dimensions
    const actualWidth = getPixelSize(template.size.width, template.size.unit);
    const actualHeight = getPixelSize(template.size.height, template.size.unit);

    const badgeStyle = {
      width: `${actualWidth}px`,
      height: `${actualHeight}px`,
      position: 'relative' as const,
      border: '1px solid #d9d9d9',
      margin: '0 auto',
      background: template.badge?.cloudinaryUrl ? `url(${template.badge.cloudinaryUrl})` : '#ffffff',
      backgroundSize: 'contain',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      padding: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    };

    const printStyle = {
      width: `${A4_WIDTH}px`,
      height: `${A4_HEIGHT}px`,
      padding: '40px',
      backgroundColor: 'white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      margin: '0 auto',
      position: 'relative' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'space-between',
    };

    const rowStyle = {
      width: '100%',
      textAlign: 'center' as const,
      marginBottom: '40px',
      padding: '20px',
      backgroundColor: '#fafafa',
      borderRadius: '8px',
      border: '1px solid #eee',
    };

    const handlePrint = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        message.error('Please allow popups to print the preview');
        return;
      }

      // Create QR code SVG string directly
      const qrCodeSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250">
          <rect width="250" height="250" fill="#ffffff"/>
          ${new QRCodeSVG({
            value: `https://your-domain.com/verify/${template._id}`,
            size: 250,
            level: 'H',
            bgColor: '#ffffff',
            fgColor: '#000000',
          }).toString().replace(/<svg[^>]*>|<\/svg>/g, '')}
        </svg>
      `;

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Badge Template Preview</title>
            <style>
              @page {
                size: A4;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 40px;
                font-family: Arial, sans-serif;
              }
              .page {
                width: 794px;
                height: 1123px;
                position: relative;
                background: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
              }
              .row {
                width: 100%;
                text-align: center;
                margin-bottom: 40px;
                padding: 20px;
                background: #fafafa;
                border-radius: 8px;
                border: 1px solid #eee;
              }
              .badge {
                width: ${actualWidth}px;
                height: ${actualHeight}px;
                margin: 0 auto;
                border: 1px solid #d9d9d9;
                background: ${template.badge?.cloudinaryUrl ? `url(${template.badge.cloudinaryUrl})` : '#ffffff'};
                background-size: contain;
                background-position: center;
                background-repeat: no-repeat;
                padding: 10px;
              }
              .details {
                font-size: 16px;
                line-height: 1.6;
              }
              .details div {
                margin: 8px 0;
              }
              .qr-code {
                text-align: center;
                width: 250px;
                height: 250px;
                margin: 0 auto;
                background: white;
                padding: 10px;
                border-radius: 4px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .qr-code svg {
                width: 100%;
                height: 100%;
                display: block;
              }
              @media print {
                body {
                  padding: 0;
                }
                .page {
                  box-shadow: none;
                }
                .row {
                  border: none;
                  background: none;
                }
                .qr-code {
                  box-shadow: none;
                  border: 1px solid #eee;
                }
                .qr-code svg {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            <div class="page">
              <div class="row">
                <div class="badge"></div>
              </div>
              <div class="row">
                <div class="details">
                  ${template.title?.enabled ? `<div style="font-size: ${template.title.fontSize}px; font-family: ${template.title.fontFamily}; color: ${template.title.color};">${template.title.text}</div>` : ''}
                  ${template.subtitle?.enabled ? `<div style="font-size: ${template.subtitle.fontSize}px; font-family: ${template.subtitle.fontFamily}; color: ${template.subtitle.color};">${template.subtitle.text}</div>` : ''}
                  ${template.additionalInfo?.enabled ? `<div style="font-size: ${template.additionalInfo.fontSize}px; font-family: ${template.additionalInfo.fontFamily}; color: ${template.additionalInfo.color};">${template.additionalInfo.text}</div>` : ''}
                </div>
              </div>
              <div class="row">
                <div class="qr-code">
                  ${qrCodeSvg}
                </div>
              </div>
            </div>
            <script>
              window.onload = function() {
                // Wait for all content to load
                setTimeout(() => {
                  window.print();
                  window.onafterprint = function() {
                    window.close();
                  };
                }, 500);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
    };

    return (
      <div className="preview-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* A4 Preview */}
        <Card 
          title={
            <div className="flex justify-between items-center">
              <span>A4 Preview</span>
              <Space>
                <Tag color={template.orientation === 'portrait' ? 'blue' : 'green'}>
                  {template.orientation.charAt(0).toUpperCase() + template.orientation.slice(1)}
                </Tag>
                <Button type="primary" onClick={handlePrint} icon={<PrinterOutlined />}>
                  Print Preview
                </Button>
              </Space>
            </div>
          } 
          className="mb-4"
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            padding: '20px',
            backgroundColor: '#f0f0f0',
            minHeight: `${A4_HEIGHT + 80}px`,
          }}>
            <div style={printStyle}>
              {/* First Row: Badge */}
              <div style={rowStyle}>
                <div style={badgeStyle} />
              </div>

              {/* Second Row: Details */}
              <div style={rowStyle}>
                {template.title?.enabled && (
                  <div style={{
                    fontSize: `${template.title.fontSize}px`,
                    fontFamily: template.title.fontFamily,
                    color: template.title.color,
                    marginBottom: '8px',
                  }}>
                    {template.title.text}
                  </div>
                )}
                {template.subtitle?.enabled && (
                  <div style={{
                    fontSize: `${template.subtitle.fontSize}px`,
                    fontFamily: template.subtitle.fontFamily,
                    color: template.subtitle.color,
                    marginBottom: '8px',
                  }}>
                    {template.subtitle.text}
                  </div>
                )}
                {template.additionalInfo?.enabled && (
                  <div style={{
                    fontSize: `${template.additionalInfo.fontSize}px`,
                    fontFamily: template.additionalInfo.fontFamily,
                    color: template.additionalInfo.color,
                  }}>
                    {template.additionalInfo.text}
                  </div>
                )}
              </div>

              {/* Third Row: QR Code */}
              <div style={rowStyle}>
                <QRCodeSVG
                  value={`https://your-domain.com/verify/${template._id}`}
                  size={250}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
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
          title="Template Preview"
          placement="right"
          width={800}
          onClose={() => setPreviewDrawerVisible(false)}
          visible={previewDrawerVisible}
        >
          {selectedTemplate && <PreviewContent template={selectedTemplate} />}
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