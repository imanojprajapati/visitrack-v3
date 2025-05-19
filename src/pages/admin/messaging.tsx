import React from 'react';
import { Card, Form, Input, Button, Select, Tabs, message } from 'antd';
import { SendOutlined, SettingOutlined } from '@ant-design/icons';
import AdminLayout from './layout';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const Messaging = () => {
  const [form] = Form.useForm();
  const [settingsForm] = Form.useForm();

  const handleSendMessage = (values: any) => {
    // TODO: Implement message sending logic
    console.log('Sending message:', values);
    message.success('Message sent successfully!');
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
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSendMessage}
              >
                <Form.Item
                  name="recipients"
                  label="Recipients"
                  rules={[{ required: true }]}
                >
                  <Select mode="multiple">
                    <Option value="all">All Visitors</Option>
                    <Option value="visited">Visited Today</Option>
                    <Option value="not-visited">Not Visited</Option>
                    <Option value="pre-registered">Pre-registered</Option>
                  </Select>
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
