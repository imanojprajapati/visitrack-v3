import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, Tabs, message } from 'antd';
import { SendOutlined, SettingOutlined } from '@ant-design/icons';
import AdminLayout from './layout';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const Messaging = () => {
  const [form] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    // Fetch events for dropdown
    fetch('/api/events')
      .then(res => res.json())
      .then(setEvents);
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      setLoadingRecipients(true);
      fetch(`/api/visitors?eventId=${selectedEvent}`)
        .then(res => res.json())
        .then(data => {
          setRecipients(data);
          setLoadingRecipients(false);
        });
    } else {
      setRecipients([]);
    }
  }, [selectedEvent]);

  const handleSendMessage = async (values: any) => {
    if (!selectedEvent || recipients.length === 0) {
      message.error('Please select an event with registered visitors.');
      return;
    }
    try {
      // Format recipients to only include necessary data
      const formattedRecipients = recipients.map(recipient => ({
        email: recipient.email,
        name: recipient.name
      }));

      const response = await fetch('/api/admin/send-bulk-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent,
          recipients: formattedRecipients,
          channel: values.channel,
          subject: values.subject,
          message: values.message,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send message');
      message.success(data.message || 'Message sent to all registered visitors!');
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || 'Failed to send message');
    }
  };

  const handleSaveSettings = (values: any) => {
    // TODO: Implement settings save logic
    console.log('Saving settings:', values);
    message.success('Settings saved successfully!');
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Messaging</h1>

        <Tabs defaultActiveKey="1">
          <TabPane tab="Send Message" key="1">
            <Card>
              <Form layout="vertical">
                <Form.Item label="Select Event" required>
                  <Select
                    showSearch
                    placeholder="Select an event"
                    value={selectedEvent || undefined}
                    onChange={setSelectedEvent}
                    filterOption={(input, option) =>
                      !!(option?.children && option.children.toString().toLowerCase().includes(input.toLowerCase()))
                    }
                  >
                    {events.map(event => (
                      <Option key={event._id} value={event._id}>{event.title}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Form>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSendMessage}
                disabled={!selectedEvent || recipients.length === 0}
              >
                <Form.Item label="Recipients">
                  <span>
                    {loadingRecipients
                      ? 'Loading recipients...'
                      : recipients.length > 0
                        ? `${recipients.length} registered visitors will receive this message.`
                        : 'No registered visitors for this event.'}
                  </span>
                </Form.Item>
                <Form.Item
                  name="channel"
                  label="Channel"
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Option value="email">Email</Option>
                    <Option value="sms">SMS</Option>
                    <Option value="whatsapp">WhatsApp</Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="subject"
                  label="Subject"
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="message"
                  label="Message"
                  rules={[{ required: true }]}
                >
                  <TextArea rows={4} />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SendOutlined />}
                    disabled={!selectedEvent || recipients.length === 0}
                  >
                    Send Message
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane tab="Settings" key="2">
            <Card>
              <Form
                form={settingsForm}
                layout="vertical"
                onFinish={handleSaveSettings}
              >
                <Tabs>
                  <TabPane tab="Email Settings" key="email">
                    <Form.Item
                      name="emailApiKey"
                      label="Email API Key"
                      rules={[{ required: true }]}
                    >
                      <Input.Password />
                    </Form.Item>
                    <Form.Item
                      name="emailSender"
                      label="Sender Email"
                      rules={[{ required: true, type: 'email' }]}
                    >
                      <Input />
                    </Form.Item>
                  </TabPane>

                  <TabPane tab="SMS Settings" key="sms">
                    <Form.Item
                      name="smsApiKey"
                      label="SMS API Key"
                      rules={[{ required: true }]}
                    >
                      <Input.Password />
                    </Form.Item>
                    <Form.Item
                      name="smsSender"
                      label="Sender Name"
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                  </TabPane>

                  <TabPane tab="WhatsApp Settings" key="whatsapp">
                    <Form.Item
                      name="whatsappApiKey"
                      label="WhatsApp API Key"
                      rules={[{ required: true }]}
                    >
                      <Input.Password />
                    </Form.Item>
                    <Form.Item
                      name="whatsappSender"
                      label="Sender Number"
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                  </TabPane>
                </Tabs>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SettingOutlined />}
                  >
                    Save Settings
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Messaging;
