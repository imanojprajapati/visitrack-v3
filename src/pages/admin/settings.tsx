import React, { useState } from 'react';
import { Card, Table, Form, Input, Button, Select, Space, Modal, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import AdminLayout from './layout';

const { Option } = Select;

const Settings = () => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Mock data for roles
  const [roles, setRoles] = useState([
    {
      key: '1',
      name: 'Admin',
      description: 'Full access to all features',
      permissions: ['dashboard', 'visitors', 'badges', 'forms', 'messaging', 'reports', 'settings'],
    },
    {
      key: '2',
      name: 'Staff',
      description: 'Limited access to visitor management',
      permissions: ['dashboard', 'visitors'],
    },
    {
      key: '3',
      name: 'Scanner',
      description: 'Access to badge scanning only',
      permissions: ['badges'],
    },
    {
      key: '4',
      name: 'Visitor Manager',
      description: 'Access to visitor management and reports',
      permissions: ['visitors', 'reports'],
    },
  ]);

  const columns = [
    {
      title: 'Role Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => permissions.join(', '),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.key)}
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

  const handleEdit = (role: any) => {
    setEditingRole(role);
    form.setFieldsValue(role);
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
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Card
          title="Role Management"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Add Role
            </Button>
          }
        >
          <Table
            dataSource={roles}
            columns={columns}
            pagination={false}
          />
        </Card>

        <Modal
          title={editingRole ? 'Edit Role' : 'Add Role'}
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={() => setIsModalVisible(false)}
        >
          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              name="name"
              label="Role Name"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true }]}
            >
              <Input.TextArea />
            </Form.Item>

            <Form.Item
              name="permissions"
              label="Permissions"
              rules={[{ required: true }]}
            >
              <Select mode="multiple">
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
