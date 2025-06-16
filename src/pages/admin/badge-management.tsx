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
  message,
  Modal,
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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ReactDOM from 'react-dom/client';
import { QRCodeComponent, generateVerificationURL } from '../../lib/qrcode';
import AccessControl from '../../components/admin/AccessControl';

const { Title, Text } = Typography;
const { Option } = Select;

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
  showQRCode: boolean;
  badge: {
    cloudinaryUrl?: string;
    cloudinaryPublicId?: string;
    imageData?: string;
  };
  qrCode: {
    enabled: boolean;
    cloudinaryUrl?: string;
  };
  isPreview: boolean;
}

interface QRCodeData {
  visitorId: string;
  eventId?: string;
}

const BadgeManagement: React.FC = () => {
  const [form] = Form.useForm<BadgeTemplate>();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [badgeFile, setBadgeFile] = useState<UploadFile | null>(null);
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
    showQRCode: true,
    badge: {
      cloudinaryUrl: undefined,
      cloudinaryPublicId: undefined,
      imageData: undefined
    },
    qrCode: {
      enabled: true
    },
    isPreview: false
  };

  // Update the handleNewTemplate function
  const handleNewTemplate = () => {
    // Reset form with default values and clear _id
    const newTemplate = {
      ...defaultTemplate,
      _id: undefined // Explicitly clear the _id field
    };
    form.setFieldsValue(newTemplate);
    setSelectedEvent('');
    setBadgeFile(null);
  };

  useEffect(() => {
    setMounted(true);
    fetchEvents();
    fetchTemplates();
    // Initialize form with default values
    form.setFieldsValue(defaultTemplate);
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events?admin=true');
      if (response.ok) {
        const data = await response.json();
        // Handle new API response format with events and pagination
        const eventsData = data.events || data;
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      message.error('Failed to fetch events');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/badge-templates');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched templates data:', data);
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      message.error('Failed to fetch templates');
    }
  };

  const handleBadgeUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleBadgeUploadRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    
    if (!file) {
      onError?.(new Error('No file provided'));
      return;
    }

    try {
      setLoading(true);
      
      // Convert file to base64
      const imageData = await handleBadgeUpload(file as File);
      
      // Upload using our API endpoint
      const response = await fetch('/api/upload/badge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload API response:', errorData);
        throw new Error(errorData.message || 'Failed to upload badge');
      }

      const result = await response.json();
      console.log('Badge upload result:', result);
      
      // Update form with the uploaded image URL
      const badgeData = {
        badge: {
          cloudinaryUrl: result.cloudinaryUrl,
          cloudinaryPublicId: result.cloudinaryPublicId,
          imageData: imageData
        }
      };
      console.log('Setting badge data in form:', badgeData);
      form.setFieldsValue(badgeData);
      
      // Verify the form fields were set correctly
      const updatedFormValues = form.getFieldsValue();
      console.log('Form values after setting badge data:', updatedFormValues);

      setBadgeFile(file as UploadFile);
      onSuccess?.(result);
      message.success('Badge uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      onError?.(error as Error);
      message.error('Failed to upload badge');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: BadgeTemplate) => {
    // Set form values for editing
    const formValues = {
      _id: record._id,
      name: record.name,
      eventId: record.eventId,
      showQRCode: record.showQRCode,
      badge: {
        cloudinaryUrl: record.badge?.cloudinaryUrl,
        cloudinaryPublicId: record.badge?.cloudinaryPublicId,
        imageData: record.badge?.imageData
      }
    };
    
    form.setFieldsValue(formValues);
    
    setSelectedEvent(record.eventId);
    
    if (record.badge?.cloudinaryUrl) {
      setBadgeFile({
        uid: '-1',
        name: 'badge.jpg',
        status: 'done',
        url: record.badge.cloudinaryUrl
      } as UploadFile);
    }
  };

  const handleSaveTemplate = async (values: BadgeTemplate) => {
    try {
      setLoading(true);
      
      console.log('Form values before processing:', values);
      console.log('Current form badge field:', form.getFieldValue('badge'));
      console.log('Form values badge field:', values.badge);
      
      // Get the current form values to ensure we have the latest data
      const currentFormValues = form.getFieldsValue();
      console.log('Current form values:', currentFormValues);
      
      const templateData = {
        ...values,
        badge: {
          cloudinaryUrl: values.badge?.cloudinaryUrl || currentFormValues.badge?.cloudinaryUrl,
          cloudinaryPublicId: values.badge?.cloudinaryPublicId || currentFormValues.badge?.cloudinaryPublicId,
          imageData: values.badge?.imageData || currentFormValues.badge?.imageData
        },
        qrCode: {
          enabled: values.showQRCode
        }
      };

      console.log('Template data to save:', templateData);

      // If we don't have an _id, check if a template already exists for this event
      if (!templateData._id) {
        try {
          const existingTemplatesResponse = await fetch(`/api/badge-templates?eventId=${templateData.eventId}`);
          if (existingTemplatesResponse.ok) {
            const existingTemplates = await existingTemplatesResponse.json();
            if (existingTemplates && existingTemplates.length > 0) {
              const existingTemplate = existingTemplates[0];
              // Ask user if they want to update the existing template
              const shouldUpdate = window.confirm(
                `A badge template already exists for this event. Would you like to update the existing template "${existingTemplate.name}"?`
              );
              
              if (shouldUpdate) {
                // Update the existing template
                templateData._id = existingTemplate._id;
              } else {
                message.info('Template creation cancelled');
                return;
              }
            }
          }
        } catch (error) {
          console.log('Error checking existing templates:', error);
          // Continue with creation if check fails
        }
      }

      const method = templateData._id ? 'PUT' : 'POST';
      const url = templateData._id 
        ? `/api/badge-templates/${templateData._id}`
        : '/api/badge-templates';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save template error response:', errorData);
        
        // Handle specific error cases
        if (response.status === 409) {
          message.error('A badge template already exists for this event. Please edit the existing template instead.');
          // Fetch templates to refresh the list
          fetchTemplates();
          return;
        }
        
        throw new Error(errorData.message || 'Failed to save template');
      }

      const savedTemplate = await response.json();
      console.log('Saved template response:', savedTemplate);
      
      if (values.showQRCode && savedTemplate._id) {
        await generateAndUploadQRCode(savedTemplate._id, values.eventId);
      }

      message.success('Template saved successfully');
      fetchTemplates();
      
      // Only reset form if we're creating a new template (no _id)
      if (!templateData._id) {
        handleNewTemplate();
      }
    } catch (error) {
      console.error('Save error:', error);
      message.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const generateAndUploadQRCode = async (templateId: string, eventId: string) => {
    try {
      setIsGeneratingQR(true);
      
      // Generate QR code data
      const qrData: QRCodeData = {
        visitorId: 'sample-visitor-id',
        eventId: eventId
      };
      
      const qrCodeUrl = generateVerificationURL(JSON.stringify(qrData));
      
      // Create QR code component
      const qrCodeComponent = React.createElement(QRCodeSVG, {
        value: qrCodeUrl,
        size: 200,
        level: 'M',
        includeMargin: true,
        style: { backgroundColor: 'white' }
      });

      // Render QR code to canvas
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      const root = ReactDOM.createRoot(container);
      root.render(qrCodeComponent);

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(container, {
        background: '#ffffff',
        width: 200,
        height: 200
      });

      // Convert to base64
      const imageData = canvas.toDataURL('image/png');

      // Upload using our API endpoint
      const response = await fetch('/api/upload/qr-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          templateId: templateId,
          eventId: eventId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload QR code');
      }

      const result = await response.json();

      // Cleanup
      document.body.removeChild(container);
      root.unmount();

      message.success('QR code generated and uploaded successfully');
    } catch (error) {
      console.error('QR code generation error:', error);
      message.error('Failed to generate QR code');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handlePreview = (template: BadgeTemplate) => {
    setSelectedTemplate(template);
    setPreviewDrawerVisible(true);
  };

  const handleDownload = async (template: BadgeTemplate) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/badge-templates/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: template._id,
          visitorData: {
            name: 'Sample Visitor',
            company: 'Sample Company',
            email: 'sample@example.com',
            phone: '+1234567890'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name}-badge.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('Badge downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download badge');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this template?',
      content: 'This action cannot be undone.',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          const response = await fetch(`/api/badge-templates/${templateId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete template');
          }

          message.success('Template deleted successfully');
          fetchTemplates();
        } catch (error) {
          console.error('Delete error:', error);
          message.error('Failed to delete template');
        }
      },
    });
  };

  const uploadProps: UploadProps = {
    name: 'badge',
    customRequest: handleBadgeUploadRequest,
    showUploadList: false,
    accept: 'image/*',
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('You can only upload image files!');
        return false;
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('Image must be smaller than 2MB!');
        return false;
      }
      return true;
    },
  };

  const columns = [
    {
      title: 'Template Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Event',
      dataIndex: 'eventId',
      key: 'eventId',
      render: (eventId: string) => {
        const event = events.find(e => e._id === eventId);
        return event ? event.title : 'N/A';
      },
    },
    {
      title: 'QR Code',
      dataIndex: 'showQRCode',
      key: 'showQRCode',
      render: (showQRCode: boolean) => (
        <Tag color={showQRCode ? 'green' : 'red'}>
          {showQRCode ? 'Enabled' : 'Disabled'}
        </Tag>
      ),
    },
    {
      title: 'Badge',
      dataIndex: 'badge',
      key: 'badge',
      render: (badge: any, record: BadgeTemplate) => {
        console.log('Badge column render - badge data:', badge);
        console.log('Badge column render - full record:', record);
        return (
          <div>
            {badge?.cloudinaryUrl ? (
              <Image
                src={badge.cloudinaryUrl}
                alt="Badge"
                style={{ width: 50, height: 50, objectFit: 'cover' }}
                preview={true}
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                onError={(e) => {
                  console.error('Image failed to load:', badge.cloudinaryUrl);
                  console.error('Error event:', e);
                }}
              />
            ) : (
              <Text type="secondary">No badge</Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: BadgeTemplate) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Edit
          </Button>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
            size="small"
          >
            Preview
          </Button>
          <Button
            type="link"
            icon={<PrinterOutlined />}
            onClick={() => handleDownload(record)}
            size="small"
          >
            Download
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id!)}
            size="small"
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const handleEventChange = async (eventId: string) => {
    setSelectedEvent(eventId);
    
    // Check if a template already exists for this event
    if (eventId) {
      try {
        const response = await fetch(`/api/badge-templates?eventId=${eventId}`);
        if (response.ok) {
          const existingTemplates = await response.json();
          if (existingTemplates && existingTemplates.length > 0) {
            const existingTemplate = existingTemplates[0];
            message.info(`A badge template "${existingTemplate.name}" already exists for this event. You can edit it or create a new one.`);
            
            // Optionally, you can auto-load the existing template
            // handleEdit(existingTemplate);
          }
        }
      } catch (error) {
        console.log('Error checking existing templates:', error);
      }
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <AccessControl allowedRoles={['admin', 'manager']} pageName="Badge Management">
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

          <Card title={form.getFieldValue('_id') ? 'Edit Template' : 'Create New Template'}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveTemplate}
              className="space-y-6"
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="name"
                    label="Template Name"
                    rules={[{ required: true, message: 'Please enter template name' }]}
                  >
                    <Input placeholder="Enter template name" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="eventId"
                    label="Select Event"
                    rules={[{ required: true, message: 'Please select an event' }]}
                  >
                    <Select
                      placeholder="Select event"
                      loading={loading}
                      onChange={(value) => handleEventChange(value)}
                    >
                      {events.map((event) => (
                        <Option key={event._id} value={event._id}>
                          {event.title}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[24, 24]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="showQRCode"
                    label="Show QR Code"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Upload Badge">
                    <Upload {...uploadProps}>
                      <Button icon={<UploadOutlined />}>Upload Badge</Button>
                    </Upload>
                    {form.getFieldValue(['badge', 'cloudinaryUrl']) && (
                      <div className="mt-2">
                        <Image
                          src={form.getFieldValue(['badge', 'cloudinaryUrl'])}
                          alt="Badge preview"
                          style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
                          preview={true}
                        />
                      </div>
                    )}
                  </Form.Item>
                </Col>
              </Row>

              {/* Hidden form fields to capture badge data */}
              <Form.Item name="_id" hidden>
                <Input />
              </Form.Item>
              <Form.Item name={['badge', 'cloudinaryUrl']} hidden>
                <Input />
              </Form.Item>
              <Form.Item name={['badge', 'cloudinaryPublicId']} hidden>
                <Input />
              </Form.Item>
              <Form.Item name={['badge', 'imageData']} hidden>
                <Input />
              </Form.Item>
              <Form.Item name="badge" hidden>
                <Input />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    {form.getFieldValue('_id') ? 'Update Template' : 'Save Template'}
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
          width={600}
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
                  width: '210mm',
                  minHeight: '297mm',
                  background: '#fff',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxSizing: 'border-box',
                }}
              >
                {/* Badge Image - Top Section */}
                <div style={{ 
                  width: '100%', 
                  height: '180px', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  background: '#f8f9fa'
                }}>
                  {selectedTemplate.badge?.cloudinaryUrl ? (
                    <img
                      src={selectedTemplate.badge.cloudinaryUrl}
                      alt="Badge"
                      style={{
                        width: '100%',
                        height: '180px',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '180px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: '#999',
                      fontSize: '16px',
                      border: '2px dashed #d9d9d9'
                    }}>
                      Badge Image Placeholder
                    </div>
                  )}
                </div>

                {/* QR Code - Middle Section */}
                {selectedTemplate.showQRCode && (
                  <div style={{ 
                    width: '100%', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    marginTop: '20px',
                    marginBottom: '20px'
                  }}>
                    {selectedTemplate.qrCode?.cloudinaryUrl ? (
                      <img
                        src={selectedTemplate.qrCode.cloudinaryUrl}
                        alt="QR Code"
                        style={{
                          width: '200px',
                          height: '200px',
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '200px',
                        height: '200px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        border: '2px dashed #d9d9d9',
                        color: '#999',
                        fontSize: '14px'
                      }}>
                        QR Code Placeholder
                      </div>
                    )}
                  </div>
                )}

                {/* Visitor Details Section - Styled like PDF */}
                <div style={{
                  width: '400px',
                  margin: '20px auto',
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  padding: '20px',
                  minHeight: '120px'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: '15px'
                  }}>
                    Registration Details
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '20px'
                  }}>
                    {/* Left Column */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', color: '#374151', marginBottom: '5px' }}>
                        Name: Sample Visitor
                      </div>
                      <div style={{ fontSize: '10px', color: '#374151', marginBottom: '5px' }}>
                        Email: sample@example.com
                      </div>
                      <div style={{ fontSize: '10px', color: '#374151', marginBottom: '5px' }}>
                        Phone: +1234567890
                      </div>
                      <div style={{ fontSize: '10px', color: '#374151', marginBottom: '5px' }}>
                        Company: Sample Company
                      </div>
                    </div>
                    
                    {/* Right Column */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', color: '#374151', marginBottom: '5px' }}>
                        Event: {events.find(e => e._id === selectedTemplate.eventId)?.title || 'Sample Event'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#374151', marginBottom: '5px' }}>
                        Location: Sample Location
                      </div>
                      <div style={{ fontSize: '10px', color: '#374151', marginBottom: '5px' }}>
                        Date: 01 Jan 2024
                      </div>
                      <div style={{ fontSize: '10px', color: '#374151', marginBottom: '5px' }}>
                        ID: SAMPLE123
                      </div>
                    </div>
                  </div>
                </div>

                {/* VISITOR text at bottom */}
                <div style={{ 
                  width: '100%', 
                  height: '72px', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  position: 'absolute',
                  bottom: '20px',
                  left: 0,
                  fontSize: '64px',
                  fontWeight: 'bold',
                  color: '#4338CA',
                }}>
                  VISITOR
                </div>
              </div>
              
              <Descriptions column={1} size="small" className="w-full">
                <Descriptions.Item label="Template Name">
                  {selectedTemplate.name}
                </Descriptions.Item>
                <Descriptions.Item label="Event">
                  {events.find(e => e._id === selectedTemplate.eventId)?.title || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="QR Code">
                  {selectedTemplate.showQRCode ? 'Enabled' : 'Disabled'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Drawer>
      </AdminLayout>
    </AccessControl>
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