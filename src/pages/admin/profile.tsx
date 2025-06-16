import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Avatar, Divider, Row, Col, Typography, Switch } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/admin/MainLayout';

const { Title, Text } = Typography;

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Initialize form with current user data
  React.useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        role: user.role,
      });
    }
  }, [user, form]);

  const handleUpdateProfile = async (values: any) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: values.name,
          email: values.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        message.success('Profile updated successfully');
        // Refresh the page to update the user context
        window.location.reload();
      } else {
        message.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      message.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        message.success('Password changed successfully');
        form.resetFields(['currentPassword', 'newPassword', 'confirmPassword']);
      } else {
        message.error(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      message.error('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="w-full px-2 sm:px-4 lg:px-8 py-6">
          <Card>
            <p className="text-center text-gray-500">Loading profile...</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full px-2 sm:px-4 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Profile</h1>
        </div>

        <Row gutter={[24, 24]}>
          {/* Profile Information */}
          <Col xs={24} lg={12}>
            <Card title="Profile Information" className="h-fit">
              <div className="flex items-center mb-6">
                <Avatar size={64} icon={<UserOutlined />} className="mr-4" />
                <div>
                  <Title level={4} className="mb-1">{user.name}</Title>
                  <Text type="secondary">{user.email}</Text>
                  <br />
                  <Text type="secondary" className="capitalize">Role: {user.role}</Text>
                </div>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={handleUpdateProfile}
              >
                <Form.Item
                  name="name"
                  label="Full Name"
                  rules={[{ required: true, message: 'Please enter your full name' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Full Name" />
                </Form.Item>

                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Please enter your email' },
                    { type: 'email', message: 'Invalid email format' }
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="Email" />
                </Form.Item>

                <Form.Item
                  name="role"
                  label="Role"
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SaveOutlined />}
                    loading={loading}
                    block
                  >
                    Update Profile
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Change Password */}
          <Col xs={24} lg={12}>
            <Card title="Change Password" className="h-fit">
              <Form
                layout="vertical"
                onFinish={handleChangePassword}
              >
                <Form.Item
                  name="currentPassword"
                  label="Current Password"
                  rules={[{ required: true, message: 'Please enter your current password' }]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="Current Password" 
                  />
                </Form.Item>

                <Form.Item
                  name="newPassword"
                  label="New Password"
                  rules={[
                    { required: true, message: 'Please enter your new password' },
                    { 
                      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
                      message: 'Password must be at least 6 characters with 1 uppercase, 1 lowercase, and 1 number'
                    }
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="New Password" 
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label="Confirm New Password"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: 'Please confirm your new password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="Confirm New Password" 
                  />
                </Form.Item>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<LockOutlined />}
                    loading={loading}
                    block
                  >
                    Change Password
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>

        {/* Account Information */}
        <Card title="Account Information" className="mt-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <div>
                <Text strong>Account Status:</Text>
                <br />
                <Text type="secondary">
                  {user.isActive ? 'Active' : 'Inactive'}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <Text strong>Member Since:</Text>
                <br />
                <Text type="secondary">
                  {new Date(user.createdAt).toLocaleDateString()}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <Text strong>Last Login:</Text>
                <br />
                <Text type="secondary">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <Text strong>User ID:</Text>
                <br />
                <Text type="secondary" code>
                  {user.id}
                </Text>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Profile; 