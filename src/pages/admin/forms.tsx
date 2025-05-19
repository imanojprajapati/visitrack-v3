import React, { useState } from 'react';
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  Space,
  Divider,
  Row,
  Col
} from 'antd';
import { PlusOutlined, DragOutlined } from '@ant-design/icons';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import AdminLayout from './layout';

const { Option } = Select;

const FormBuilder = () => {
  const [form] = Form.useForm();
  const [fields, setFields] = useState([]);

  const addField = () => {
    const values = form.getFieldsValue();
    setFields([...fields, values]);
    form.resetFields();
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Form Builder</h1>
        
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="Add New Field">
              <Form form={form} layout="vertical">
                <Form.Item
                  name="label"
                  label="Field Label"
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  name="type"
                  label="Field Type"
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Option value="text">Text Input</Option>
                    <Option value="number">Number Input</Option>
                    <Option value="email">Email Input</Option>
                    <Option value="phone">Phone Input</Option>
                    <Option value="select">Dropdown</Option>
                    <Option value="checkbox">Checkbox</Option>
                    <Option value="radio">Radio Button</Option>
                  </Select>
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={addField}
                  >
                    Add Field
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col span={12}>
            <Card title="Form Preview">
              <DndProvider backend={HTML5Backend}>
                {fields.map((field, index) => (
                  <div
                    key={index}
                    className="bg-white p-4 mb-2 border rounded-md cursor-move flex items-center gap-2"
                  >
                    <DragOutlined className="text-gray-400" />
                    <span>{field.label}</span>
                    <span className="text-gray-400">({field.type})</span>
                  </div>
                ))}
              </DndProvider>
            </Card>
          </Col>
        </Row>

        <Divider />

        <Card title="Form Actions">
          <Space>
            <Button type="primary">Save Form</Button>
            <Button>Preview Form</Button>
            <Button>Export Form</Button>
          </Space>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default FormBuilder;
