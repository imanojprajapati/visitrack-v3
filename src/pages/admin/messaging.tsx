import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  Tabs, 
  message, 
  Space, 
  Typography, 
  Table, 
  Checkbox, 
  Tag, 
  Row, 
  Col,
  Tooltip,
  Badge,
  Modal,
  List,
  Divider,
  Alert
} from 'antd';
import { 
  SendOutlined, 
  FileTextOutlined, 
  UserOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  SelectOutlined,
  ClearOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import AdminLayout from './layout';
import AccessControl from '../../components/admin/AccessControl';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface Visitor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  eventName: string;
  eventId: string;
  checkInTime?: string;
}

interface Event {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
}

interface MessageTemplate {
  _id?: string;
  name: string;
  subject: string;
  message: string;
  variables: string[];
  createdAt?: string;
}

const Messaging: React.FC = () => {
  const [form] = Form.useForm();
  const [templateForm] = Form.useForm();
  
  
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Visitor[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Template messaging state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    // Fetch events for dropdown
    fetch('/api/events')
      .then(res => res.json())
      .then(setEvents)
      .catch(error => {
        console.error('Error fetching events:', error);
        message.error('Failed to load events');
      });

    // Load templates from database
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/message-templates');
      if (response.ok) {
        const templates = await response.json();
        setTemplates(templates);
      } else {
        console.error('Failed to load templates');
        message.error('Failed to load message templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      message.error('Failed to load message templates');
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      setLoadingRecipients(true);
      fetch(`/api/visitors?eventId=${selectedEvent}`)
        .then(res => res.json())
        .then(data => {
          setRecipients(data);
          setSelectedRecipients([]); // Reset selection when event changes
          setPagination(prev => ({
            ...prev,
            total: data.length,
          }));
          setLoadingRecipients(false);
        })
        .catch(error => {
          console.error('Error fetching recipients:', error);
          message.error('Failed to load recipients');
          setLoadingRecipients(false);
        });
    } else {
      setRecipients([]);
      setSelectedRecipients([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
      }));
    }
  }, [selectedEvent]);

  // Quick selection functions
  const selectAll = () => {
    const allIds = recipients.map(recipient => recipient._id);
    setSelectedRecipients(allIds);
    form.setFieldsValue({ recipients: allIds });
  };

  const selectCheckedIn = () => {
    const checkedInIds = recipients
      .filter(recipient => recipient.status === 'Visited')
      .map(recipient => recipient._id);
    setSelectedRecipients(checkedInIds);
    form.setFieldsValue({ recipients: checkedInIds });
  };

  const selectNotCheckedIn = () => {
    const notCheckedInIds = recipients
      .filter(recipient => recipient.status !== 'Visited')
      .map(recipient => recipient._id);
    setSelectedRecipients(notCheckedInIds);
    form.setFieldsValue({ recipients: notCheckedInIds });
  };

  const clearSelection = () => {
    setSelectedRecipients([]);
    form.setFieldsValue({ recipients: [] });
  };

  const handleRecipientChange = (selectedIds: string[]) => {
    setSelectedRecipients(selectedIds);
  };

  // Template functions
  const saveTemplate = async (templateData: MessageTemplate) => {
    try {
      const url = editingTemplate 
        ? `/api/message-templates/${editingTemplate._id}`
        : '/api/message-templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      const savedTemplate = await response.json();
      
      // Update local state
      if (editingTemplate) {
        setTemplates(templates.map(t => t._id === editingTemplate._id ? savedTemplate : t));
      } else {
        setTemplates([...templates, savedTemplate]);
      }
      
      setShowTemplateModal(false);
      setEditingTemplate(null);
      templateForm.resetFields();
      message.success(editingTemplate ? 'Template updated successfully!' : 'Template created successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      message.error(error instanceof Error ? error.message : 'Failed to save template');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/message-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }

      // Update local state
      setTemplates(templates.filter(t => t._id !== templateId));
      
      // If the deleted template was selected, clear selection
      if (selectedTemplate?._id === templateId) {
        setSelectedTemplate(null);
      }
      
      message.success('Template deleted successfully!');
    } catch (error) {
      console.error('Error deleting template:', error);
      message.error(error instanceof Error ? error.message : 'Failed to delete template');
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\$\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(2, -1)) : [];
  };

  const replaceVariables = (text: string, visitor: Visitor, event: Event): string => {
    return text
      .replace(/\$\{visitor_name\}/g, visitor.name)
      .replace(/\$\{event_name\}/g, event.title)
      .replace(/\$\{visitor_company\}/g, visitor.company || '')
      .replace(/\$\{event_date\}/g, new Date(event.startDate).toLocaleDateString())
      .replace(/\$\{visitor_email\}/g, visitor.email);
  };

  const handleTemplateSubmit = async (values: any) => {
    const variables = [
      ...extractVariables(values.subject),
      ...extractVariables(values.message)
    ];
    const uniqueVariables = Array.from(new Set(variables));
    
    await saveTemplate({
      name: values.name,
      subject: values.subject,
      message: values.message,
      variables: uniqueVariables
    });
  };

  const handlePreview = () => {
    if (!selectedTemplate || !selectedEvent || selectedRecipients.length === 0) {
      message.warning('Please select an event, template, and at least one recipient to preview');
      return;
    }

    const selectedEventData = events.find(e => e._id === selectedEvent);
    const selectedVisitors = recipients.filter(r => selectedRecipients.includes(r._id));
    
    if (!selectedEventData) return;

    const previews = selectedVisitors.slice(0, 3).map(visitor => ({
      visitor,
      subject: replaceVariables(selectedTemplate.subject, visitor, selectedEventData),
      message: replaceVariables(selectedTemplate.message, visitor, selectedEventData)
    }));

    setPreviewData({
      template: selectedTemplate,
      event: selectedEventData,
      previews,
      totalRecipients: selectedVisitors.length
    });
    setShowPreviewModal(true);
  };

  const handleSend = async (values: any) => {
    try {
      setSending(true);
      
      // Prepare recipients data for the API
      const selectedVisitors = recipients.filter(recipient => 
        selectedRecipients.includes(recipient._id)
      );

      const response = await fetch('/api/admin/send-bulk-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: selectedVisitors.map(visitor => ({
            email: visitor.email,
            name: visitor.name
          })),
          channel: 'email',
          subject: values.subject,
          message: values.message
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      message.success(result.message || 'Message sent successfully!');
      form.resetFields();
      setSelectedRecipients([]);
    } catch (error) {
      console.error('Error sending message:', error);
      message.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTemplateSend = async (fromPreview = false) => {
    if (!selectedTemplate || !selectedEvent || selectedRecipients.length === 0) {
      message.warning('Please select an event, template, and recipients');
      return;
    }

    const selectedEventData = events.find(e => e._id === selectedEvent);
    const selectedVisitors = recipients.filter(recipient => 
      selectedRecipients.includes(recipient._id)
    );

    if (!selectedEventData) {
      message.error('Selected event not found');
      return;
    }

    // Show confirmation modal
    Modal.confirm({
      title: 'Send Template Messages',
      content: (
        <div>
          <p><strong>Template:</strong> {selectedTemplate.name}</p>
          <p><strong>Event:</strong> {selectedEventData.title}</p>
          <p><strong>Recipients:</strong> {selectedVisitors.length} visitor{selectedVisitors.length !== 1 ? 's' : ''}</p>
          <div className="mt-3 p-3 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Each recipient will receive a personalized message with their name and event details.
            </p>
          </div>
          <p className="mt-2 text-sm text-gray-600">Are you sure you want to send these messages?</p>
        </div>
      ),
      okText: `Send ${selectedVisitors.length} Message${selectedVisitors.length !== 1 ? 's' : ''}`,
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setSending(true);
          
          if (fromPreview) {
            setShowPreviewModal(false);
          }

          // Show progress message
          const hideLoading = message.loading('Preparing personalized messages...', 0);

          // Prepare personalized messages for each recipient
          const personalizedMessages = selectedVisitors.map(visitor => ({
            email: visitor.email,
            name: visitor.name,
            subject: replaceVariables(selectedTemplate.subject, visitor, selectedEventData),
            message: replaceVariables(selectedTemplate.message, visitor, selectedEventData)
          }));

          hideLoading();
          
          // Show sending progress
          const hideProgress = message.loading(`Sending messages to ${personalizedMessages.length} recipients...`, 0);

          // Send messages in smaller batches to avoid overwhelming the server
          const batchSize = 5;
          const results = [];
          
          for (let i = 0; i < personalizedMessages.length; i += batchSize) {
            const batch = personalizedMessages.slice(i, i + batchSize);
            
            const batchResults = await Promise.all(
              batch.map(async (msg) => {
                try {
                  const response = await fetch('/api/admin/send-bulk-message', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      recipients: [{ 
                        email: msg.email, 
                        name: msg.name,
                        subject: msg.subject,
                        message: msg.message 
                      }],
                      channel: 'email',
                      subject: msg.subject,
                      message: msg.message
                    }),
                  });

                  const result = await response.json();
                  return { 
                    email: msg.email, 
                    name: msg.name,
                    success: response.ok, 
                    result,
                    error: response.ok ? null : result.error 
                  };
                } catch (error) {
                  return { 
                    email: msg.email, 
                    name: msg.name,
                    success: false, 
                    error: error instanceof Error ? error.message : 'Network error' 
                  };
                }
              })
            );
            
            results.push(...batchResults);
            
            // Small delay between batches to prevent rate limiting
            if (i + batchSize < personalizedMessages.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          hideProgress();

          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;

          if (successful > 0) {
            message.success({
              content: `Successfully sent ${successful} personalized message${successful !== 1 ? 's' : ''}${failed > 0 ? `. ${failed} failed.` : '.'}`,
              duration: 5,
            });
            
            // Show detailed results if there were failures
            if (failed > 0) {
              const failedResults = results.filter(r => !r.success);
              console.error('Failed to send messages to:', failedResults);
              
              Modal.warning({
                title: 'Some Messages Failed',
                content: (
                  <div>
                    <p>Successfully sent: {successful} messages</p>
                    <p>Failed to send: {failed} messages</p>
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      <p className="text-sm font-medium">Failed recipients:</p>
                      {failedResults.slice(0, 5).map((result, index) => (
                        <p key={index} className="text-xs text-gray-600">
                          • {result.name} ({result.email}): {result.error}
                        </p>
                      ))}
                      {failedResults.length > 5 && (
                        <p className="text-xs text-gray-500">...and {failedResults.length - 5} more</p>
                      )}
                    </div>
                  </div>
                ),
              });
            }
            
            setSelectedRecipients([]);
          } else {
            message.error('Failed to send any messages. Please check your email configuration.');
            
            // Show error details
            Modal.error({
              title: 'All Messages Failed',
              content: (
                <div>
                  <p>No messages were sent successfully.</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Please check your email configuration and try again.
                  </p>
                </div>
              ),
            });
          }
        } catch (error) {
          console.error('Error sending template messages:', error);
          message.error(error instanceof Error ? error.message : 'Failed to send messages');
        } finally {
          setSending(false);
        }
      },
    });
  };

  // Table columns for visitor selection
  const columns = [
    {
      title: 'Select',
      key: 'select',
      width: 60,
      render: (_: any, record: Visitor) => (
        <Checkbox
          checked={selectedRecipients.includes(record._id)}
          onChange={(e) => {
            if (e.target.checked) {
              const newSelection = [...selectedRecipients, record._id];
              setSelectedRecipients(newSelection);
              form.setFieldsValue({ recipients: newSelection });
            } else {
              const newSelection = selectedRecipients.filter(id => id !== record._id);
              setSelectedRecipients(newSelection);
              form.setFieldsValue({ recipients: newSelection });
            }
          }}
        />
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Visitor) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-sm text-gray-500">{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Visited' ? 'green' : 'blue'}>
          {status === 'Visited' ? (
            <Space size={4}>
              <CheckCircleOutlined />
              Checked In
            </Space>
          ) : (
            <Space size={4}>
              <CloseCircleOutlined />
              Not Checked In
            </Space>
          )}
        </Tag>
      ),
    },
    {
      title: 'Check-in Time',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      render: (checkInTime: string) => {
        if (!checkInTime) return '-';
        return new Date(checkInTime).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
  ];

  const checkedInCount = recipients.filter(r => r.status === 'Visited').length;
  const notCheckedInCount = recipients.filter(r => r.status !== 'Visited').length;

  const handleTableChange = (paginationConfig: any) => {
    console.log('Messaging table pagination changed:', paginationConfig);
    setPagination({
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
      total: recipients.length,
    });
  };

  // Calculate paginated data
  const getPaginatedData = () => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return recipients.slice(startIndex, endIndex);
  };

  // Tab items for Ant Design v5
  const tabItems = [
    {
      key: 'compose',
      label: (
        <Space>
          <SendOutlined />
          <span>Compose Message</span>
        </Space>
      ),
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSend}
          className="max-w-4xl mx-auto"
        >
          <Form.Item
            name="event"
            label="Select Event"
            rules={[{ required: true, message: 'Please select an event' }]}
          >
            <Select
              placeholder="Choose an event"
              onChange={value => setSelectedEvent(value)}
              loading={!events.length}
              className="w-full"
            >
              {events.map(event => (
                <Option key={event._id} value={event._id}>
                  {event.title}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedEvent && recipients.length > 0 && (
            <Card 
              size="small" 
              className="mb-4"
              title={
                <Space>
                  <UserOutlined />
                  <span>Recipient Selection</span>
                  <Badge count={selectedRecipients.length} showZero />
                </Space>
              }
              extra={
                <Space>
                  <Button
                    size="small"
                    icon={<SelectOutlined />}
                    onClick={selectAll}
                  >
                    Select All ({recipients.length})
                  </Button>
                  <Button
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={selectCheckedIn}
                  >
                    Checked In ({checkedInCount})
                  </Button>
                  <Button
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={selectNotCheckedIn}
                  >
                    Not Checked In ({notCheckedInCount})
                  </Button>
                  <Button
                    size="small"
                    icon={<ClearOutlined />}
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                  <Button
                    size="small"
                    type={showTable ? "primary" : "default"}
                    onClick={() => setShowTable(!showTable)}
                  >
                    {showTable ? 'Hide Table' : 'Show Table'}
                  </Button>
                </Space>
              }
            >
              {showTable ? (
                <>
                  <Table
                    dataSource={getPaginatedData()}
                    columns={columns}
                    rowKey="_id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                  />
                  
                  {/* Custom Pagination */}
                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      Showing {((pagination.current - 1) * pagination.pageSize) + 1} to {Math.min(pagination.current * pagination.pageSize, pagination.total)} of {pagination.total} visitors
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Show:</span>
                      <Select
                        value={pagination.pageSize}
                        onChange={(size) => {
                          setPagination(prev => ({
                            ...prev,
                            pageSize: size,
                            current: 1,
                          }));
                        }}
                        style={{ width: 80 }}
                      >
                        <Select.Option value={10}>10</Select.Option>
                        <Select.Option value={20}>20</Select.Option>
                        <Select.Option value={50}>50</Select.Option>
                        <Select.Option value={100}>100</Select.Option>
                      </Select>
                      <span className="text-sm text-gray-600">per page</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        size="small"
                        disabled={pagination.current === 1}
                        onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                      >
                        Previous
                      </Button>
                      <span className="px-2 text-sm">
                        Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
                      </span>
                      <Button
                        size="small"
                        disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                        onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <Form.Item
                  name="recipients"
                  rules={[{ required: true, message: 'Please select recipients' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select recipients"
                    loading={loadingRecipients}
                    value={selectedRecipients}
                    onChange={handleRecipientChange}
                    className="w-full"
                    maxTagCount={5}
                    maxTagTextLength={20}
                  >
                    {recipients.map(recipient => (
                      <Option key={recipient._id} value={recipient._id}>
                        <Space>
                          <span>{recipient.name}</span>
                          <span className="text-gray-400">({recipient.email})</span>
                          <Tag color={recipient.status === 'Visited' ? 'green' : 'blue'}>
                            {recipient.status === 'Visited' ? 'Checked In' : 'Not Checked In'}
                          </Tag>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Card>
          )}

          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Please enter a subject' }]}
          >
            <Input placeholder="Enter message subject" />
          </Form.Item>

          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: true, message: 'Please enter a message' }]}
          >
            <TextArea
              rows={6}
              placeholder="Type your message here..."
              className="w-full"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={sending}
                disabled={selectedRecipients.length === 0}
              >
                Send Message ({selectedRecipients.length} recipients)
              </Button>
              {selectedRecipients.length > 0 && (
                <Text type="secondary">
                  Message will be sent to {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''}
                </Text>
              )}
            </Space>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'templates',
      label: (
        <Space>
          <FileTextOutlined />
          <span>Template Messaging</span>
        </Space>
      ),
      children: (
        <div className="max-w-6xl mx-auto">
          <Row gutter={[24, 24]}>
            {/* Template Management */}
            <Col xs={24} lg={12}>
              <Card
                title="Message Templates"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingTemplate(null);
                      setShowTemplateModal(true);
                    }}
                  >
                    Create Template
                  </Button>
                }
              >
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>No templates created yet</p>
                    <p className="text-sm">Create your first message template to get started</p>
                  </div>
                ) : (
                  <List
                    dataSource={templates}
                    renderItem={(template) => (
                      <List.Item
                        key={template._id}
                        actions={[
                          <Button
                            key="edit"
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => {
                              setEditingTemplate(template);
                              templateForm.setFieldsValue(template);
                              setShowTemplateModal(true);
                            }}
                          />,
                          <Button
                            key="delete"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              Modal.confirm({
                                title: 'Delete Template',
                                content: 'Are you sure you want to delete this template?',
                                onOk: () => deleteTemplate(template._id!),
                              });
                            }}
                          />
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Space>
                              <span>{template.name}</span>
                              <Button
                                type="link"
                                size="small"
                                onClick={() => setSelectedTemplate(template)}
                              >
                                {selectedTemplate?._id === template._id ? 'Selected' : 'Select'}
                              </Button>
                            </Space>
                          }
                          description={
                            <div>
                              <p className="text-sm mb-1"><strong>Subject:</strong> {template.subject}</p>
                              <p className="text-sm mb-1"><strong>Variables:</strong> {template.variables.join(', ') || 'None'}</p>
                              <p className="text-xs text-gray-500 truncate">{template.message}</p>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>

            {/* Template Messaging */}
            <Col xs={24} lg={12}>
              <Card title="Send Template Message">
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <Alert
                      message={`Selected Template: ${selectedTemplate.name}`}
                      type="info"
                      showIcon
                    />

                    <div>
                      <Text strong>Select Event:</Text>
                      <Select
                        placeholder="Choose an event"
                        onChange={value => setSelectedEvent(value)}
                        value={selectedEvent}
                        className="w-full mt-2"
                      >
                        {events.map(event => (
                          <Option key={event._id} value={event._id}>
                            {event.title}
                          </Option>
                        ))}
                      </Select>
                    </div>

                    {selectedEvent && recipients.length > 0 && (
                      <div>
                        <Text strong>Select Recipients:</Text>
                        <div className="mt-2 space-y-2">
                          <Space>
                            <Button size="small" onClick={selectAll}>
                              All ({recipients.length})
                            </Button>
                            <Button size="small" onClick={selectCheckedIn}>
                              Checked In ({checkedInCount})
                            </Button>
                            <Button size="small" onClick={selectNotCheckedIn}>
                              Not Checked In ({notCheckedInCount})
                            </Button>
                            <Button size="small" onClick={clearSelection}>
                              Clear
                            </Button>
                          </Space>
                          <Select
                            mode="multiple"
                            placeholder="Select recipients"
                            value={selectedRecipients}
                            onChange={setSelectedRecipients}
                            className="w-full"
                            maxTagCount={3}
                          >
                            {recipients.map(recipient => (
                              <Option key={recipient._id} value={recipient._id}>
                                {recipient.name} ({recipient.email})
                              </Option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex space-x-2">
                        <Button
                          icon={<EyeOutlined />}
                          onClick={handlePreview}
                          disabled={!selectedEvent || selectedRecipients.length === 0}
                          className="flex-1"
                        >
                          Preview Messages
                        </Button>
                        <Button
                          type="primary"
                          icon={<SendOutlined />}
                          loading={sending}
                          onClick={() => handleTemplateSend(false)}
                          disabled={!selectedEvent || selectedRecipients.length === 0}
                          className="flex-1"
                        >
                          Send to {selectedRecipients.length} recipients
                        </Button>
                      </div>
                      
                      {selectedRecipients.length > 0 && (
                        <Alert
                          message={`Ready to send personalized messages to ${selectedRecipients.length} recipient${selectedRecipients.length !== 1 ? 's' : ''}`}
                          description={`Each visitor will receive a customized message using the "${selectedTemplate.name}" template.`}
                          type="info"
                          showIcon
                          className="text-sm"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>Select a template to get started</p>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      )
    }
  ];

  return (
    <AccessControl allowedRoles={['admin', 'manager']} pageName="Messaging">
      <AdminLayout>
        <div className="w-full max-w-screen px-2 sm:px-4 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <Title level={2} className="text-xl sm:text-2xl font-bold">Messaging</Title>
              <Text type="secondary">Send messages to visitors and manage message templates</Text>
            </div>
          </div>

          <Card>
            <Tabs 
              defaultActiveKey="compose"
              type="card"
              size="large"
              tabBarStyle={{ marginBottom: 24 }}
              items={tabItems}
            />
          </Card>
        </div>

        {/* Template Creation/Edit Modal */}
        <Modal
          title={editingTemplate ? 'Edit Template' : 'Create Message Template'}
          open={showTemplateModal}
          onCancel={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
            templateForm.resetFields();
          }}
          footer={null}
          width={800}
        >
          <Form
            form={templateForm}
            layout="vertical"
            onFinish={handleTemplateSubmit}
          >
            <Form.Item
              name="name"
              label="Template Name"
              rules={[{ required: true, message: 'Please enter a template name' }]}
            >
              <Input placeholder="e.g., Event Reminder" />
            </Form.Item>

            <Form.Item
              name="subject"
              label="Email Subject"
              rules={[{ required: true, message: 'Please enter a subject' }]}
            >
              <Input placeholder="e.g., Reminder for ${event_name}" />
            </Form.Item>

            <Form.Item
              name="message"
              label="Message Template"
              rules={[{ required: true, message: 'Please enter a message' }]}
            >
              <TextArea
                rows={8}
                placeholder="e.g., Hey ${visitor_name}, remember for ${event_name}. We look forward to seeing you!"
              />
            </Form.Item>

            <Alert
              message="Available Variables"
              description={
                <div>
                  <p><code>${'{visitor_name}'}</code> - Visitor's name</p>
                  <p><code>${'{event_name}'}</code> - Event name</p>
                  <p><code>${'{visitor_company}'}</code> - Visitor's company</p>
                  <p><code>${'{event_date}'}</code> - Event date</p>
                  <p><code>${'{visitor_email}'}</code> - Visitor's email</p>
                </div>
              }
              type="info"
              className="mb-4"
            />

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
                <Button onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                  templateForm.resetFields();
                }}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Preview Modal */}
        <Modal
          title="Message Preview"
          open={showPreviewModal}
          onCancel={() => setShowPreviewModal(false)}
          footer={[
            <Button key="close" onClick={() => setShowPreviewModal(false)}>
              Close
            </Button>,
            <Button 
              key="send" 
              type="primary" 
              icon={<SendOutlined />}
              loading={sending}
              onClick={() => handleTemplateSend(true)}
              disabled={!selectedEvent || selectedRecipients.length === 0}
            >
              Send Messages
            </Button>
          ]}
          width={800}
        >
          {previewData && (
            <div>
              <Alert
                message={`Preview for ${previewData.totalRecipients} recipients`}
                description={`Template: ${previewData.template.name} | Event: ${previewData.event.title}`}
                type="info"
                className="mb-4"
              />
              
              <div className="space-y-4">
                {previewData.previews.map((preview: any, index: number) => (
                  <Card key={index} size="small" title={`${preview.visitor.name} (${preview.visitor.email})`}>
                    <div className="space-y-2">
                      <div>
                        <Text strong>Subject: </Text>
                        <Text>{preview.subject}</Text>
                      </div>
                      <div>
                        <Text strong>Message: </Text>
                        <div className="bg-gray-50 p-3 rounded mt-1">
                          {preview.message.split('\n').map((line: string, i: number) => (
                            <div key={i}>{line}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {previewData.totalRecipients > 3 && (
                  <Alert
                    message={`... and ${previewData.totalRecipients - 3} more recipients will receive personalized messages`}
                    type="info"
                  />
                )}
              </div>
            </div>
          )}
        </Modal>
      </AdminLayout>
    </AccessControl>
  );
};

export default Messaging;
