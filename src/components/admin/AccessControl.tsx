import React from 'react';
import { Card, Typography, Button } from 'antd';
import { LockOutlined, HomeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import MainLayout from './MainLayout';

const { Title, Text } = Typography;

interface AccessControlProps {
  children: React.ReactNode;
  allowedRoles: string[];
  pageName: string;
}

const AccessControl: React.FC<AccessControlProps> = ({ children, allowedRoles, pageName }) => {
  const { user } = useAuth();
  const router = useRouter();

  // Check if user has access to this page
  const hasAccess = user && allowedRoles.includes(user.role);

  if (!hasAccess) {
    return (
      <MainLayout>
        <div className="w-full px-2 sm:px-4 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="mb-6">
              <LockOutlined className="text-6xl text-red-500 mb-4" />
              <Title level={2} className="text-red-600 mb-2">
                Access Denied
              </Title>
              <Text type="secondary" className="text-lg">
                You don't have permission to access the {pageName} page.
              </Text>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg max-w-md w-full mb-6">
              <Title level={4} className="mb-3">
                Your Role: <span className="capitalize text-blue-600">{user?.role}</span>
              </Title>
              <Text type="secondary" className="block mb-2">
                Your current role has access to:
              </Text>
              <ul className="text-left space-y-1">
                {user?.role === 'admin' && (
                  <>
                    <li>• Dashboard</li>
                    <li>• Visitors</li>
                    <li>• Event Management</li>
                    <li>• Badge Management</li>
                    <li>• Forms</li>
                    <li>• Messaging</li>
                    <li>• QR Scanner</li>
                    <li>• Scan by Camera</li>
                    <li>• Reports</li>
                    <li>• Settings</li>
                  </>
                )}
                {user?.role === 'manager' && (
                  <>
                    <li>• Dashboard</li>
                    <li>• Visitors</li>
                    <li>• Event Management</li>
                    <li>• Badge Management</li>
                    <li>• Forms</li>
                    <li>• Messaging</li>
                    <li>• QR Scanner</li>
                    <li>• Scan by Camera</li>
                    <li>• Reports</li>
                  </>
                )}
                {user?.role === 'staff' && (
                  <>
                    <li>• Dashboard</li>
                    <li>• Visitors</li>
                    <li>• QR Scanner</li>
                    <li>• Scan by Camera</li>
                  </>
                )}
              </ul>
            </div>

            <div className="space-x-4">
              <Button 
                type="primary" 
                icon={<HomeOutlined />}
                onClick={() => router.push('/admin')}
                size="large"
              >
                Go to Dashboard
              </Button>
              <Button 
                onClick={() => router.back()}
                size="large"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return <>{children}</>;
};

export default AccessControl; 