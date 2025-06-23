import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Input, Button, Select, Space, Modal, message, Switch, Tag, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/admin/MainLayout';

const { Option } = Select;

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  isActive: boolean;
  createdAt: string;
}

const Settings: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);

  // Fetch users from database
  const fetchUsers = async () => {
    try {
      setFetchingUsers(true);
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies instead of Bearer token
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.users);
        } else {
          message.error(data.message || 'Failed to fetch users');
        }
      } else {
        message.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Failed to fetch users');
    } finally {
      setFetchingUsers(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const userColumns: ColumnsType<User> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => {
        const color = role === 'admin' ? 'red' : role === 'manager' ? 'blue' : 'green';
        return <Tag color={color}>{role.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {record.role !== 'admin' && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditUser(record)}
              size="small"
            />
          )}
          {record.id !== currentUser?.id && record.role !== 'admin' && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteUser(record.id)}
              size="small"
            />
          )}
        </Space>
      ),
    },
  ];

  const handleAddUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    setIsUserModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    userForm.setFieldsValue(user);
    setIsUserModalVisible(true);
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies instead of Bearer token
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          message.success('User deleted successfully');
          fetchUsers(); // Refresh the list
        } else {
          message.error(data.message || 'Failed to delete user');
        }
      } else {
        message.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      message.error('Failed to delete user');
    }
  };

  const handleUserModalOk = async () => {
    try {
      const values = await userForm.validateFields();
      setLoading(true);

      const url = editingUser 
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/create-user';
      
      const method = editingUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies instead of Bearer token
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        message.success(editingUser ? 'User updated successfully' : 'User created successfully');
        setIsUserModalVisible(false);
        fetchUsers(); // Refresh the list
      } else {
        message.error(data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      message.error('Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Only show user management for admin users
  if (currentUser?.role !== 'admin') {
    return (
      <MainLayout>
        <div className="admin-responsive-container">
          <div className="admin-content-wrapper">
            <h1 className="text-responsive-xl font-bold text-gray-900 mb-6">Settings</h1>
            <Card className="admin-card-responsive">
              <p className="text-center text-gray-500">Access denied. Admin privileges required.</p>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="admin-responsive-container">
        <div className="admin-content-wrapper">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-responsive-xl font-bold text-gray-900">Settings</h1>
            <div className="admin-button-group">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddUser}
                className="w-full sm:w-auto"
              >
                Add User
              </Button>
            </div>
          </div>
          
          <Card title="User Management" className="admin-card-responsive">
            {fetchingUsers ? (
              <div className="flex justify-center items-center py-8">
                <Spin size="large" />
              </div>
            ) : (
              <div className="admin-table-responsive">
                <Table
                  columns={userColumns}
                  dataSource={users}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 'max-content' }}
                />
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* User Modal */}
      <Modal
        title={editingUser ? 'Edit User' : 'Add User'}
        open={isUserModalVisible}
        onOk={handleUserModalOk}
        onCancel={() => setIsUserModalVisible(false)}
        className="admin-modal-responsive"
        confirmLoading={loading}
      >
        <Form
          form={userForm}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter full name' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Full Name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Invalid email format' }
            ]}
          >
            <Input placeholder="Email" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please enter password' },
                { 
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
                  message: 'Password must be at least 6 characters with 1 uppercase, 1 lowercase, and 1 number'
                }
              ]}
            >
              <Input.Password placeholder="Password" />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select role' }]}
          >
            <Select placeholder="Select role">
              <Option value="admin">Admin - Full Access</Option>
              <Option value="manager">Manager - Limited Access</Option>
              <Option value="staff">Staff - Basic Access</Option>
            </Select>
          </Form.Item>

          {editingUser && (
            <Form.Item
              name="isActive"
              label="Status"
              valuePropName="checked"
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </MainLayout>
  );
};

export default Settings;
