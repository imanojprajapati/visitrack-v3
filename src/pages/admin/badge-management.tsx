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
import { QRCodeComponent, generateVerificationURL } from '../../lib/qrcode';

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
  isPreview: boolean;
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

  // Define default template values
  const defaultTemplate: BadgeTemplate = {
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
    showQRCode: true,
    isPreview: false
  };

  // Update the handleNewTemplate function
  const handleNewTemplate = () => {
    // Reset form with default values
    form.setFieldsValue(defaultTemplate);
    
    // Reset template state with default values
    setTemplate(defaultTemplate);
    
    // Clear selected template
    setSelectedTemplate(null);
    
    // Clear any uploaded files
    setLogoFile(null);
    setBackgroundFile(null);
  };

  // Update the initial template state
  const [template, setTemplate] = useState<BadgeTemplate>(defaultTemplate);

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

  const handleEdit = (record: BadgeTemplate) => {
    form.setFieldsValue({
      ...record,
      size: {
        ...record.size,
        width: record.size.unit === 'mm' ? record.size.width / 25.4 : record.size.width,
        height: record.size.unit === 'mm' ? record.size.height / 25.4 : record.size.height,
        unit: record.size.unit
      }
    });
    setTemplate(record);
    setSelectedTemplate(record);
  };

  const handleSaveTemplate = async (values: BadgeTemplate) => {
    try {
      setLoading(true);
      
      const templateData = {
        ...values,
        _id: template._id,
        size: {
          ...values.size,
          width: values.size.unit === 'inches' ? values.size.width * 25.4 : values.size.width,
          height: values.size.unit === 'inches' ? values.size.height * 25.4 : values.size.height,
          unit: 'mm'
        },
        badge: template.badge?.cloudinaryUrl ? {
          cloudinaryUrl: template.badge.cloudinaryUrl,
          cloudinaryPublicId: template.badge.cloudinaryPublicId
        } : undefined,
        qrCode: {
          enabled: values.showQRCode || false,
          position: { x: 0.8, y: 0.5 },
          size: { width: 1, height: 1 }
        }
      };

      const isUpdate = template._id !== undefined;
      const url = isUpdate ? `/api/badge-templates/${template._id}` : '/api/badge-templates';
      const method = isUpdate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${isUpdate ? 'update' : 'save'} template`);
      }
      
      message.success(`Template ${isUpdate ? 'updated' : 'saved'} successfully`);
      fetchTemplates();
      
      if (!isUpdate) {
        form.resetFields();
        setTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      message.error(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const generateAndUploadQRCode = async (templateId: string, eventId: string) => {
    try {
      setIsGeneratingQR(true);
      
      const event = events.find(e => e._id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }

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

      const qrCodeComponent = document.createElement('div');
      qrCodeComponent.id = 'qr-code-container';
      qrCodeComponent.style.display = 'flex';
      qrCodeComponent.style.justifyContent = 'center';
      qrCodeComponent.style.alignItems = 'center';
      qrCodeComponent.style.width = '100%';
      qrCodeComponent.style.height = '100%';
      tempDiv.appendChild(qrCodeComponent);

      const root = ReactDOM.createRoot(qrCodeComponent);
      root.render(
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: '100%',
          height: '100%'
        }}>
          <QRCodeComponent
            data={{
              visitorId: 'template',
              eventId: eventId,
              registrationId: templateId
            }}
            size={1000}
          />
        </div>
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(qrCodeComponent, {
        background: '#ffffff',
        logging: false,
        useCORS: true,
        width: 1000,
        height: 1000
      });

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = 500;
      finalCanvas.height = 500;
      const ctx = finalCanvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, 1000, 1000, 0, 0, 500, 500);
      }

      const imageData = finalCanvas.toDataURL('image/png', 1.0);

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

  const handlePreview = (template: BadgeTemplate) => {
    setSelectedTemplate({ ...template, isPreview: true });
    setPreviewDrawerVisible(true);
  };

  const handleDownload = async (template: BadgeTemplate) => {
    try {
      setLoading(true);
      const downloadTemplate = { 
        ...template, 
        isPreview: false,
        showQRCode: false
      };
      setSelectedTemplate(downloadTemplate);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (!badgeRef.current) {
        throw new Error('Badge preview element not found');
      }

      const badgeElement = badgeRef.current.cloneNode(true) as HTMLElement;
      
      // Set container styles with proper width constraints
      badgeElement.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 190mm; /* Reduced from 210mm to account for padding */
        height: 297mm;
        background: white;
        padding: 10mm;
        display: flex;
        flex-direction: column;
        position: relative;
        box-sizing: border-box;
        min-height: 297mm;
        overflow: hidden;
      `;

      // Ensure content container maintains structure with proper width
      const contentContainer = badgeElement.querySelector('div[style*="flex: 1"]');
      if (contentContainer instanceof HTMLElement) {
        contentContainer.style.cssText = `
          display: flex;
          flex-direction: column;
          flex: 1;
          position: relative;
          min-height: 277mm;
          width: 100%;
          max-width: 190mm;
          margin: 0 auto;
        `;
      }

      // Fix width of all rows
      const rows = badgeElement.querySelectorAll('div[style*="display: flex"]');
      rows.forEach((row) => {
        if (row instanceof HTMLElement) {
          row.style.width = '100%';
          row.style.maxWidth = '190mm';
          row.style.margin = '0 auto';
        }
      });

      // Ensure third row (QR code space) is properly sized
      const qrCodeContainer = badgeElement.querySelector('div[style*="height: 350px"]');
      if (qrCodeContainer instanceof HTMLElement) {
        qrCodeContainer.style.cssText = `
          height: 350px;
          width: 100%;
          max-width: 190mm;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 5mm;
          border: 1px dashed #e5e7eb;
          border-radius: 4px;
          background-color: #fafafa;
          margin: 0 auto 20mm auto;
        `;
      }

      // Ensure VISITRACK text container is properly positioned and sized
      const visitrackContainer = badgeElement.querySelector('div[style*="position: absolute"]');
      if (visitrackContainer instanceof HTMLElement) {
        visitrackContainer.style.cssText = `
          width: 100%;
          max-width: 190mm;
          padding: 5mm 0;
          display: flex;
          justify-content: center;
          align-items: center;
          position: absolute;
          bottom: 10mm;
          left: 50%;
          transform: translateX(-50%);
          background-color: white;
          z-index: 10;
        `;
      }

      // Remove any QR code elements
      const qrCodeElements = badgeElement.querySelectorAll('svg');
      qrCodeElements.forEach(element => element.remove());

      // Ensure all images are properly contained
      const images = badgeElement.querySelectorAll('img');
      images.forEach((img) => {
        if (img instanceof HTMLElement) {
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
        }
      });

      document.body.appendChild(badgeElement);

      try {
        const canvas = await html2canvas(badgeElement, {
          useCORS: true,
          logging: false,
          background: '#ffffff',
          width: 595.28,
          height: 841.89,
          allowTaint: true
        });

        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'pt',
          format: 'a4',
          compress: true
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, 595.28, 841.89, undefined, 'FAST');
        
        pdf.save(`${template.name}-badge.pdf`);
        message.success('Badge downloaded successfully');
      } finally {
        document.body.removeChild(badgeElement);
      }
    } catch (error) {
      console.error('Error downloading badge:', error);
      message.error('Failed to download badge');
    } finally {
      setLoading(false);
    }
  };

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
            onClick={() => handleEdit(record)}
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
                onClick={handleNewTemplate}
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
              <Button onClick={handleNewTemplate}>Reset</Button>
            </Space>
          }
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveTemplate}
            initialValues={defaultTemplate}
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
          title="Badge Preview"
          placement="right"
          width={800}
          onClose={() => setPreviewDrawerVisible(false)}
          open={previewDrawerVisible}
          extra={
            <Space>
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={() => selectedTemplate && handleDownload(selectedTemplate)}
                loading={loading}
              >
                Download Badge
              </Button>
            </Space>
          }
        >
          {selectedTemplate && (
            <div 
              ref={badgeRef}
              className="badge-preview"
              style={{
                width: '210mm',
                height: '297mm',
                margin: '0 auto',
                background: 'white',
                padding: '10mm',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxSizing: 'border-box',
                minHeight: '297mm'
              }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                position: 'relative',
                minHeight: '277mm'
              }}>
                <div style={{
                  width: '100%',
                  height: '220px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  backgroundColor: '#fafafa',
                  marginBottom: '10mm'
                }}>
                  {selectedTemplate.badge?.cloudinaryUrl && (
                    <div style={{
                      width: '100%',
                      height: '220px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '2mm'
                    }}>
                      <Image
                        src={selectedTemplate.badge.cloudinaryUrl}
                        alt="Badge"
                        style={{
                          width: '100%',
                          height: '220px',
                          objectFit: 'contain'
                        }}
                        preview={false}
                      />
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8mm',
                  padding: '5mm',
                  textAlign: 'center',
                  marginBottom: '10mm',
                  minHeight: '120px'
                }}>
                  <Typography.Title 
                    level={3} 
                    style={{ 
                      margin: 0, 
                      fontSize: '20pt',
                      color: '#000000',
                      lineHeight: '1.2'
                    }}
                  >
                    {selectedTemplate.title?.text}
                  </Typography.Title>
                  <Typography.Text 
                    strong 
                    style={{ 
                      fontSize: '16pt',
                      color: '#000000',
                      lineHeight: '1.2'
                    }}
                  >
                    {selectedTemplate.subtitle?.text}
                  </Typography.Text>
                  <Typography.Text 
                    style={{ 
                      fontSize: '12pt',
                      color: '#000000',
                      lineHeight: '1.2'
                    }}
                  >
                    {selectedTemplate.additionalInfo?.text}
                  </Typography.Text>
                </div>

                <div style={{
                  height: '350px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '5mm',
                  border: selectedTemplate.isPreview ? 'none' : '1px dashed #e5e7eb',
                  borderRadius: '4px',
                  backgroundColor: selectedTemplate.isPreview ? 'transparent' : '#fafafa',
                  marginBottom: '20mm'
                }}>
                  {selectedTemplate.isPreview && selectedTemplate.showQRCode && (
                    <QRCodeSVG
                      value={generateVerificationURL(selectedTemplate._id || '')}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  )}
                </div>
              </div>

              <div style={{
                width: '100%',
                padding: '5mm 0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 'auto',
                backgroundColor: 'white'
              }}>
                <Typography.Title
                  level={1}
                  style={{
                    margin: 0,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '3px',
                    color: '#3730A3',
                    fontSize: '48px'
                  }}
                >
                  VISITRACK
                </Typography.Title>
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