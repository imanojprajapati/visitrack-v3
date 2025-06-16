import { useState } from 'react';
import { useRouter } from 'next/router';
import { Form, Input, Button, Typography, Card, message } from 'antd';
import { useAuth } from '../../context/AuthContext';

const { Title } = Typography;

export default function AdminLogin() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onLoginFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await login(values.email, values.password);
      if (result.success) {
        message.success(result.message);
        router.push('/admin');
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <Title level={3} className="text-center mb-4">Visitrack Admin</Title>
        
        <Form layout="vertical" onFinish={onLoginFinish}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Invalid email format' }
            ]}
          >
            <Input size="large" placeholder="Email" />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password size="large" placeholder="Password" />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
} 