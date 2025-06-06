import React, { useState } from 'react';
import { Card, Table, Form, Input, Button, Select, Space, Modal, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import AdminLayout from './layout';

const { Option } = Select;

interface Role {
  key: string;
  name: string;
  description: string;
  permissions: string[];
}

const Settings: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([
    {
      key: '1',
      name: 'Admin',
      description: 'Full access to all features',
      permissions: ['dashboard', 'visitors', 'badges', 'forms', 'messaging', 'reports', 'settings'],
    },
    {
      key: '2',
      name: 'Manager',
      description: 'Access to visitor management and reports',
      permissions: ['dashboard', 'visitors', 'reports'],
    },
    {
      key: '3',
      name: 'Staff',
      description: 'Basic access to visitor check-in',
      permissions: ['dashboard', 'visitors'],
    },
  ]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();

  const columns: ColumnsType<Role> = [
    {
      title: 'Role Name',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 150,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 250,
    },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => (
        <Space wrap>
          {permissions.map(permission => (
            <span key={permission} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {permission}
            </span>
          ))}
        </Space>
      ),
      width: 300,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 120,
      render: (_, record) => (
        <Space size="small" className="flex-wrap">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingRole(record);
              form.setFieldsValue(record);
              setIsModalVisible(true);
            }}
            size="small"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.key)}
            size="small"
          />
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleDelete = (key: string) => {
    setRoles(roles.filter(role => role.key !== key));
    message.success('Role deleted successfully');
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      if (editingRole) {
        // Update existing role
        setRoles(roles.map(role =>
          role.key === editingRole.key ? { ...role, ...values } : role
        ));
        message.success('Role updated successfully');
      } else {
        // Add new role
        const newRole = {
          key: String(roles.length + 1),
          ...values,
        };
        setRoles([...roles, newRole]);
        message.success('Role added successfully');
      }
      setIsModalVisible(false);
    });
  };

  return (
    <AdminLayout>
      <div className="w-full px-2 sm:px-4 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
        </div>
        
        <Card
          title="Role Management"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              className="w-full sm:w-auto"
            >
              Add Role
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              dataSource={roles}
              rowKey="key"
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          </div>
        </Card>

        <Modal
          title={editingRole ? 'Edit Role' : 'Add Role'}
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={() => setIsModalVisible(false)}
          width={window.innerWidth < 640 ? '100%' : 600}
          style={{ top: 24 }}
          bodyStyle={{ padding: window.innerWidth < 640 ? 16 : 24 }}
        >
          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              name="name"
              label="Role Name"
              rules={[{ required: true, message: 'Please enter role name' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'Please enter role description' }]}
            >
              <Input.TextArea rows={3} />
            </Form.Item>

            <Form.Item
              name="permissions"
              label="Permissions"
              rules={[{ required: true, message: 'Please select permissions' }]}
            >
              <Select mode="multiple" className="w-full">
                <Option value="dashboard">Dashboard</Option>
                <Option value="visitors">Visitor Management</Option>
                <Option value="badges">Badge Management</Option>
                <Option value="forms">Form Builder</Option>
                <Option value="messaging">Messaging</Option>
                <Option value="reports">Reports</Option>
                <Option value="settings">Settings</Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default Settings;
