import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Typography, Spin } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  CalendarOutlined,
  FormOutlined,
  QrcodeOutlined,
  BarChartOutlined,
  MessageOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CameraOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  // Show loading spinner if not authenticated (instead of returning null)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
        <div className="ml-2">Redirecting to login...</div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const getMenuItems = () => {
    const menuItems = [];

    // Dashboard - available for all roles
    menuItems.push({
      key: '/admin',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    });

    // Visitors - available for all roles
    menuItems.push({
      key: '/admin/visitors',
      icon: <UserOutlined />,
      label: 'Visitors',
    });

    // Event Management - available for admin and manager
    if (user?.role === 'admin' || user?.role === 'manager') {
      menuItems.push({
        key: '/admin/events',
        icon: <CalendarOutlined />,
        label: 'Event Management',
      });
    }

    // Badge Management - available for admin and manager
    if (user?.role === 'admin' || user?.role === 'manager') {
      menuItems.push({
        key: '/admin/badge-management',
        icon: <IdcardOutlined />,
        label: 'Badge Management',
      });
    }

    // Forms - available for admin and manager
    if (user?.role === 'admin' || user?.role === 'manager') {
      menuItems.push({
        key: '/admin/forms',
        icon: <FormOutlined />,
        label: 'Forms',
      });
    }

    // Messaging - available for admin and manager
    if (user?.role === 'admin' || user?.role === 'manager') {
      menuItems.push({
        key: '/admin/messaging',
        icon: <MessageOutlined />,
        label: 'Messaging',
      });
    }

    // QR Scanner - available for all roles
    menuItems.push({
      key: '/admin/qr-scanner',
      icon: <QrcodeOutlined />,
      label: 'QR Scanner',
    });

    // Scan by Camera - available for all roles
    menuItems.push({
      key: '/admin/scan-by-camera',
      icon: <CameraOutlined />,
      label: 'Scan by Camera',
    });

    // Reports - available for admin and manager
    if (user?.role === 'admin' || user?.role === 'manager') {
      menuItems.push({
        key: '/admin/reports',
        icon: <BarChartOutlined />,
        label: 'Reports',
      });
    }

    // Settings - available for admin only
    if (user?.role === 'admin') {
      menuItems.push({
        key: '/admin/settings',
        icon: <SettingOutlined />,
        label: 'Settings',
      });
    }

    return menuItems;
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => router.push('/admin/profile'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed} 
        width={250}
        style={{ background: '#FFFFFF' }}
      >
        <div className="p-4">
          <h1 className="text-black text-lg font-bold">Visitrack</h1>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[router.pathname]}
          items={getMenuItems()}
          onClick={({ key }) => router.push(key)}
          style={{ 
            background: '#FFFFFF',
            color: '#000000',
            borderRight: '1px solid #f0f0f0'
          }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ padding: '0 16px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          
          <div className="flex items-center space-x-4">
            <Text strong>{user?.name}</Text>
            <Text type="secondary">({user?.role})</Text>
            
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <Space className="cursor-pointer">
                <Avatar icon={<UserOutlined />} />
              </Space>
            </Dropdown>
          </div>
        </Header>
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
