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
  Badge
} from 'antd';
import { 
  SendOutlined, 
  SettingOutlined, 
  UserOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  SelectOutlined,
  ClearOutlined
} from '@ant-design/icons';
import AdminLayout from './layout';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

interface Visitor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  eventName: string;
  checkInTime?: string;
}

const Messaging: React.FC = () => {
  const [form] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [events, setEvents] = useState<any[]>([]);
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

  useEffect(() => {
    // Fetch events for dropdown
    fetch('/api/events')
      .then(res => res.json())
      .then(setEvents)
      .catch(error => {
        console.error('Error fetching events:', error);
        message.error('Failed to load events');
      });
  }, []);

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

  const handleSaveSettings = async (values: any) => {
    try {
      // Implement settings save logic here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      message.success('Settings saved successfully!');
      settingsForm.resetFields();
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error('Failed to save settings');
    }
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

  return (
    <AdminLayout>
      <div className="w-full max-w-screen px-2 sm:px-4 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <Title level={2} className="text-xl sm:text-2xl font-bold">Messaging</Title>
            <Text type="secondary">Send messages to visitors and manage notification settings</Text>
          </div>
        </div>

        <Card>
          <Tabs 
            defaultActiveKey="compose"
            type="card"
            size="large"
            tabBarStyle={{ marginBottom: 24 }}
          >
            <TabPane 
              tab={
                <Space>
                  <SendOutlined />
                  <span>Compose Message</span>
                </Space>
              } 
              key="compose"
            >
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
            </TabPane>

            <TabPane
              tab={
                <Space>
                  <SettingOutlined />
                  <span>Settings</span>
                </Space>
              }
              key="settings"
            >
              <Form
                form={settingsForm}
                layout="vertical"
                onFinish={handleSaveSettings}
                className="max-w-2xl mx-auto"
              >
                <Form.Item
                  name="smtpServer"
                  label="SMTP Server"
                  rules={[{ required: true, message: 'Please enter SMTP server' }]}
                >
                  <Input placeholder="smtp.example.com" />
                </Form.Item>

                <Form.Item
                  name="smtpPort"
                  label="SMTP Port"
                  rules={[{ required: true, message: 'Please enter SMTP port' }]}
                >
                  <Input type="number" placeholder="587" />
                </Form.Item>

                <Form.Item
                  name="username"
                  label="Username"
                  rules={[{ required: true, message: 'Please enter username' }]}
                >
                  <Input placeholder="your@email.com" />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Password"
                  rules={[{ required: true, message: 'Please enter password' }]}
                >
                  <Input.Password placeholder="Enter SMTP password" />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="w-full sm:w-auto"
                  >
                    Save Settings
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
          </Tabs>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Messaging;
