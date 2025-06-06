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
    size: {
      width: number;
      widthUnit: '%' | 'px';
      height: number;
      heightUnit: 'px';
    };
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

interface QRCodeData {
  visitorId: string;
  eventId?: string; // Make it optional to maintain compatibility
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
  const [mounted, setMounted] = useState(false);
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
      imageData: undefined,
      size: {
        width: 100,
        widthUnit: '%',
        height: 200,
        heightUnit: 'px'
      }
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
    setMounted(true);
    fetchEvents();
    fetchTemplates();
    return () => {
      setMounted(false);
    };
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

      // Update template with badge data while preserving size
      setTemplate(prev => ({
        ...prev,
        badge: {
          cloudinaryUrl: data.url,
          cloudinaryPublicId: data.publicId,
          imageData: base64,
          size: prev.badge?.size || {
            width: 100,
            widthUnit: '%',
            height: 200,
            heightUnit: 'px'
          }
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
    // Ensure we have default values for size
    const defaultSize = {
      width: 3.375,
      height: 2.125,
      unit: 'inches'
    };

    // Convert mm to inches for display
    const sizeInInches = {
      width: record.size?.unit === 'mm' ? record.size.width / 25.4 : (record.size?.width || defaultSize.width),
      height: record.size?.unit === 'mm' ? record.size.height / 25.4 : (record.size?.height || defaultSize.height),
      unit: 'inches'
    };

    // Set default badge size values
    const defaultBadgeSize = {
      width: 100,
      widthUnit: '%',
      height: 200,
      heightUnit: 'px'
    };

    // Get badge size from record or use defaults
    const badgeSize = record.badge?.size || defaultBadgeSize;

    // Set form values with both sizes
    form.setFieldsValue({
      ...record,
      size: sizeInInches,
      badge: {
        ...record.badge,
        size: {
          width: Number(badgeSize.width) || defaultBadgeSize.width,
          widthUnit: badgeSize.widthUnit || defaultBadgeSize.widthUnit,
          height: Number(badgeSize.height) || defaultBadgeSize.height,
          heightUnit: 'px' // Always px for height
        }
      }
    });

    // Update template state with the record
    setTemplate({
      ...record,
      size: sizeInInches,
      badge: {
        ...record.badge,
        size: {
          width: Number(badgeSize.width) || defaultBadgeSize.width,
          widthUnit: badgeSize.widthUnit || defaultBadgeSize.widthUnit,
          height: Number(badgeSize.height) || defaultBadgeSize.height,
          heightUnit: 'px' // Always px for height
        }
      }
    });
    setSelectedTemplate(record);
  };

  const handleSaveTemplate = async (values: BadgeTemplate) => {
    try {
      setLoading(true);
      
      // Ensure we have default values for size
      const defaultSize = {
        width: 85.725, // 3.375 inches in mm
        height: 53.975, // 2.125 inches in mm
        unit: 'mm'
      };

      // Get form values with defaults
      const formSize = values.size || defaultSize;
      const defaultBadgeSize = {
        width: 100,
        widthUnit: '%',
        height: 200,
        heightUnit: 'px'
      };
      
      const formBadgeSize = values.badge?.size || defaultBadgeSize;
      
      // Always store size in millimeters
      const sizeInMm = {
        width: formSize.unit === 'inches' ? formSize.width * 25.4 : formSize.width,
        height: formSize.unit === 'inches' ? formSize.height * 25.4 : formSize.height,
        unit: 'mm' // Always store in mm
      };

      // Create the template data with both sizes properly set
      const templateData = {
        ...values,
        _id: template._id,
        size: sizeInMm, // This will always be in mm
        badge: template.badge?.cloudinaryUrl ? {
          cloudinaryUrl: template.badge.cloudinaryUrl,
          cloudinaryPublicId: template.badge.cloudinaryPublicId,
          size: {
            width: Number(formBadgeSize.width) || defaultBadgeSize.width,
            widthUnit: formBadgeSize.widthUnit || defaultBadgeSize.widthUnit,
            height: Number(formBadgeSize.height) || defaultBadgeSize.height,
            heightUnit: 'px' // Always px for height
          }
        } : undefined,
        qrCode: {
          enabled: values.showQRCode || false,
          position: { x: 0.8, y: 0.5 },
          size: { width: 1, height: 1 }
        }
      };

      // Log the data being sent to verify values
      console.log('Saving template with data:', {
        size: sizeInMm,
        badgeSize: templateData.badge?.size
      });

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
              eventId: eventId
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
      
      // Set container styles
      badgeElement.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 210mm;
        min-height: 297mm;
        background: white;
        padding: 10mm;
        display: flex;
        flex-direction: column;
        position: relative;
        box-sizing: border-box;
      `;

      // Ensure content wrapper maintains structure
      const contentWrapper = badgeElement.querySelector('div[style*="flex: 1"]');
      if (contentWrapper instanceof HTMLElement) {
        contentWrapper.style.cssText = `
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10mm;
          height: calc(297mm - 20mm - 60px);
          padding-bottom: 60px;
          width: 100%;
        `;
      }

      // Ensure all rows maintain their width
      const rows = badgeElement.querySelectorAll('div[style*="display: flex"]');
      rows.forEach((row) => {
        if (row instanceof HTMLElement && !(row as HTMLElement).style.position) { // Skip VISITRACK container
          (row as HTMLElement).style.width = '100%';
        }
      });

      // Ensure VISITRACK text container is properly positioned
      const visitrackContainer = badgeElement.querySelector('div[style*="position: absolute"]');
      if (visitrackContainer instanceof HTMLElement) {
        visitrackContainer.style.cssText = `
          width: 100%;
          height: 60px;
          display: flex;
          justify-content: center;
          align-items: center;
          position: absolute;
          bottom: 10mm;
          left: 0;
          background-color: white;
          border-top: 1px solid #f0f0f0;
        `;
      }

      // Remove any QR code elements
      const qrCodeElements = badgeElement.querySelectorAll('svg');
      qrCodeElements.forEach(element => element.remove());

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
      fixed: 'left' as const,
      width: 200,
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
      key: 'eventId',
      width: 200,
      render: (eventId: string) => {
        const event = events.find(e => e._id === eventId);
        return event?.title || 'N/A';
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 150,
      render: (_: unknown, record: BadgeTemplate) => (
        <Space size="small">
          <Button
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
            size="small"
            title="Preview"
          />
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
            title="Edit"
          />
          <Button
            icon={<DeleteOutlined />}
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
            size="small"
            danger
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  // Update the handleBadgeSizeChange function to handle both sizes
  const handleBadgeSizeChange = (changedValues: any, allValues: any) => {
    if (changedValues.badge?.size) {
      const { width, widthUnit, height } = changedValues.badge.size;
      const defaultBadgeSize = {
        width: 100,
        widthUnit: '%',
        height: 200,
        heightUnit: 'px'
      };
      
      // Update template with new badge size values
      setTemplate((prev: BadgeTemplate) => ({
        ...prev,
        badge: {
          ...prev.badge,
          size: {
            width: width ?? defaultBadgeSize.width,
            widthUnit: widthUnit ?? defaultBadgeSize.widthUnit,
            height: height ?? defaultBadgeSize.height,
            heightUnit: 'px' // Always px for height
          }
        }
      }));
    }

    if (changedValues.size) {
      const { width, height, unit } = changedValues.size;
      
      // Update template with new template size values
      setTemplate((prev: BadgeTemplate) => ({
        ...prev,
        size: {
          width: width ?? prev.size?.width ?? 3.375,
          height: height ?? prev.size?.height ?? 2.125,
          unit: unit ?? prev.size?.unit ?? 'inches'
        }
      }));
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Title level={2} className="m-0">Badge Management</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleNewTemplate}
            className="w-full sm:w-auto"
          >
            New Template
          </Button>
        </div>

        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveTemplate}
            className="space-y-6"
          >
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="name"
                  label="Template Name"
                  rules={[{ required: true, message: 'Please enter template name' }]}
                >
                  <Input placeholder="Enter template name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name={['eventId']}
                  label="Event"
                  rules={[{ required: true, message: 'Please select an event' }]}
                >
                  <Select
                    placeholder="Select event"
                    loading={loading}
                    onChange={(value) => setSelectedEvent(value)}
                  >
                    {events.map((event) => (
                      <Option key={event._id} value={event._id}>
                        {event.title}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name={['orientation']}
                  label="Orientation"
                  rules={[{ required: true, message: 'Please select orientation' }]}
                >
                  <Radio.Group className="w-full sm:w-auto">
                    <Radio.Button value="portrait">Portrait</Radio.Button>
                    <Radio.Button value="landscape">Landscape</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="size"
                  label="Size"
                  rules={[{ required: true, message: 'Please enter size' }]}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <Form.Item
                        name={['size', 'width']}
                        rules={[
                          { required: true, message: 'Please enter width' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              const widthUnit = getFieldValue(['size', 'widthUnit']);
                              if (widthUnit === '%' && (value < 1 || value > 100)) {
                                return Promise.reject(new Error('Width must be between 1 and 100 for percentage'));
                              }
                              if (widthUnit === 'px' && (value < 50 || value > 500)) {
                                return Promise.reject(new Error('Width must be between 50 and 500 for pixels'));
                              }
                              return Promise.resolve();
                            },
                          }),
                        ]}
                        noStyle
                      >
                        <InputNumber 
                          min={1}
                          max={100}
                          step={1}
                          placeholder="Width"
                          style={{ width: '120px' }}
                        />
                      </Form.Item>
                      <Form.Item
                        name={['size', 'widthUnit']}
                        noStyle
                      >
                        <Select 
                          style={{ width: '80px' }}
                          onChange={(value) => {
                            const currentWidth = form.getFieldValue(['size', 'width']);
                            if (value === '%' && currentWidth > 100) {
                              form.setFieldValue(['size', 'width'], 100);
                            } else if (value === 'px' && currentWidth < 50) {
                              form.setFieldValue(['size', 'width'], 50);
                            }
                          }}
                        >
                          <Option value="%">%</Option>
                          <Option value="px">px</Option>
                        </Select>
                      </Form.Item>
                    </Space>
                    <Space>
                      <Form.Item
                        name={['size', 'height']}
                        rules={[
                          { required: true, message: 'Please enter height' },
                          { type: 'number', min: 50, max: 500, message: 'Height must be between 50 and 500 pixels' }
                        ]}
                        noStyle
                      >
                        <InputNumber 
                          min={50}
                          max={500}
                          step={10}
                          placeholder="Height (px)"
                          style={{ width: '120px' }}
                        />
                      </Form.Item>
                      <Form.Item
                        name={['size', 'heightUnit']}
                        noStyle
                        initialValue="px"
                      >
                        <Select style={{ width: '80px' }} disabled>
                          <Option value="px">px</Option>
                        </Select>
                      </Form.Item>
                    </Space>
                  </Space>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="title"
                  label="Badge Title"
                  rules={[{ required: true, message: 'Please enter badge title' }]}
                >
                  <Input placeholder="Enter badge title" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="subtitle"
                  label="Subtitle"
                  rules={[{ required: true, message: 'Please enter subtitle' }]}
                >
                  <Input placeholder="Enter subtitle" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="additionalInfo"
                  label="Additional Information"
                  rules={[{ required: true, message: 'Please enter additional information' }]}
                >
                  <TextArea
                    placeholder="Enter additional information text"
                    rows={4}
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="showQRCode"
                  label="Show QR Code"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
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
              </Col>
            </Row>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Save Template
                </Button>
                <Button onClick={() => form.resetFields()}>Reset</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Saved Templates" className="mt-6">
          <Table
            dataSource={templates}
            columns={columns}
            rowKey="_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} templates`,
              responsive: true,
            }}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      </div>

      {/* Preview Drawer */}
      <Drawer
        title="Badge Preview"
        placement="right"
        width={400}
        onClose={() => setPreviewDrawerVisible(false)}
        open={previewDrawerVisible}
        extra={
          <Space className="flex-wrap">
            <Button onClick={() => setPreviewDrawerVisible(false)}>Close</Button>
            <Button
              type="primary"
              onClick={() => selectedTemplate && handleDownload(selectedTemplate)}
              icon={<PrinterOutlined />}
            >
              Download
            </Button>
          </Space>
        }
      >
        {selectedTemplate && (
          <div className="space-y-4">
            <div
              ref={badgeRef}
              style={{
                width: '100%',
                aspectRatio: selectedTemplate.orientation === 'portrait' ? '2/3' : '3/2',
                position: 'relative',
                background: '#fff',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              {/* Badge preview content */}
            </div>
            <Descriptions column={1} size="small" className="w-full">
              <Descriptions.Item label="Template Name">
                {selectedTemplate.name}
              </Descriptions.Item>
              <Descriptions.Item label="Event">
                {events.find(e => e._id === selectedTemplate.eventId)?.title || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Size">
                {selectedTemplate.size.width} x {selectedTemplate.size.height} {selectedTemplate.size.unit}
              </Descriptions.Item>
              <Descriptions.Item label="Orientation">
                {selectedTemplate.orientation}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Drawer>
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