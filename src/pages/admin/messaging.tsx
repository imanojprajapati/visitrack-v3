import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, Tabs, message, Space, Typography } from 'antd';
import { SendOutlined, SettingOutlined } from '@ant-design/icons';
import AdminLayout from './layout';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

const Messaging: React.FC = () => {
  const [form] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);

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
          setLoadingRecipients(false);
        })
        .catch(error => {
          console.error('Error fetching recipients:', error);
          message.error('Failed to load recipients');
          setLoadingRecipients(false);
        });
    } else {
      setRecipients([]);
    }
  }, [selectedEvent]);

  const handleSend = async (values: any) => {
    try {
      setSending(true);
      // Implement message sending logic here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      message.success('Message sent successfully!');
      form.resetFields();
    } catch (error) {
      console.error('Error sending message:', error);
      message.error('Failed to send message');
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
                className="max-w-2xl mx-auto"
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

                <Form.Item
                  name="recipients"
                  label="Recipients"
                  rules={[{ required: true, message: 'Please select recipients' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select recipients"
                    loading={loadingRecipients}
                    disabled={!selectedEvent}
                    className="w-full"
                  >
                    {recipients.map(recipient => (
                      <Option key={recipient._id} value={recipient._id}>
                        {recipient.name} ({recipient.email})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

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
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SendOutlined />}
                    loading={sending}
                    className="w-full sm:w-auto"
                  >
                    Send Message
                  </Button>
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
