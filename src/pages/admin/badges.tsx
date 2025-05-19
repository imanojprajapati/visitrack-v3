import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, Row, Col, Space, Switch, Upload, message } from 'antd';
import { PrinterOutlined, SaveOutlined, UploadOutlined, PictureOutlined } from '@ant-design/icons';
import AdminLayout from './layout';

const { Option } = Select;
const { TextArea } = Input;

export default function BadgeManagement() {
  const [form] = Form.useForm();
  const [previewVisible, setPreviewVisible] = useState(false);

  const handlePrint = () => {
    // Implement print functionality
    message.success('Printing badge...');
  };

  const handleSaveTemplate = () => {
    // Implement save template functionality
    message.success('Template saved successfully!');
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Badge Management</h1>
        
        <Row gutter={[16, 16]}>
          <Col span={16}>
            <Card title="Badge Template Editor">
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  size: '3x4',
                  title: 'Visitor Badge',
                  subtitle: 'Expo 2024',
                  showQR: true,
                  showPhoto: true,
                }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="size"
                      label="Badge Size"
                      rules={[{ required: true }]}
                    >
                      <Select>
                        <Option value="3x4">3x4 inches</Option>
                        <Option value="4x6">4x6 inches</Option>
                        <Option value="custom">Custom Size</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  
                  <Col span={12}>
                    <Form.Item
                      name="orientation"
                      label="Orientation"
                      rules={[{ required: true }]}
                    >
                      <Select>
                        <Option value="portrait">Portrait</Option>
                        <Option value="landscape">Landscape</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="title"
                  label="Badge Title"
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  name="subtitle"
                  label="Subtitle"
                >
                  <Input />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="showQR"
                      valuePropName="checked"
                      label="Show QR Code"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="showPhoto"
                      valuePropName="checked"
                      label="Show Photo"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="logo"
                  label="Badge Logo"
                >
                  <Upload
                    action="/api/upload"
                    listType="picture"
                    maxCount={1}
                    accept="image/*"
                  >
                    <Button icon={<UploadOutlined />}>Upload Logo</Button>
                  </Upload>
                </Form.Item>

                <Form.Item
                  name="background"
                  label="Background Design"
                >
                  <Upload
                    action="/api/upload"
                    listType="picture"
                    maxCount={1}
                    accept="image/*"
                  >
                    <Button icon={<PictureOutlined />}>Upload Background</Button>
                  </Upload>
                </Form.Item>

                <Form.Item
                  name="additionalInfo"
                  label="Additional Information"
                >
                  <TextArea rows={4} placeholder="Enter any additional information to display on the badge" />
                </Form.Item>

                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveTemplate}
                  >
                    Save Template
                  </Button>
                  <Button
                    icon={<PrinterOutlined />}
                    onClick={handlePrint}
                  >
                    Print Preview
                  </Button>
                </Space>
              </Form>
            </Card>
          </Col>
          
          <Col span={8}>
            <Card title="Preview">
              <div className="bg-gray-100 p-4 min-h-[400px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  Badge preview will appear here
                </div>
              </div>
            </Card>
            
            <Card title="Saved Templates" className="mt-4">
              <div className="space-y-2">
                {['Default Template', 'VIP Badge', 'Staff Badge'].map((template) => (
                  <div
                    key={template}
                    className="p-2 border rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                  >
                    <span>{template}</span>
                    <Space>
                      <Button type="text" size="small">Edit</Button>
                      <Button type="text" size="small" danger>Delete</Button>
                    </Space>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </AdminLayout>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      isAdminPage: true,
    },
  };
}
