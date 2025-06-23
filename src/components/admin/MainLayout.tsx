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
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767);
      // Auto-collapse sidebar on mobile
      if (window.innerWidth <= 767) {
        setCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleMenuToggle = () => {
    setCollapsed(!collapsed);
  };

  // Close sidebar when clicking menu item on mobile
  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
    if (isMobile) {
      setCollapsed(true);
    }
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
      label: 'Visitors Management',
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
    // menuItems.push({
    //   key: '/admin/scan-by-camera',
    //   icon: <CameraOutlined />,
    //   label: 'Scan by Camera',
    // });

    // Quick Scanner - available for all roles
    menuItems.push({
      key: '/admin/quick-scanner',
      icon: <QrcodeOutlined />,
      label: 'Quick Scanner',
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
    <>
      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div 
          className="admin-mobile-overlay show"
          onClick={() => setCollapsed(true)}
        />
      )}
      
      <Layout className="admin-layout-responsive" style={{ minHeight: '100vh' }}>
        <Sider 
          trigger={null} 
          collapsible 
          collapsed={collapsed} 
          width={250}
          className={`admin-sidebar-responsive ${collapsed ? 'collapsed' : ''}`}
          style={{ background: '#FFFFFF' }}
          breakpoint="lg"
          collapsedWidth={isMobile ? 0 : 80}
        >
          <div className="spacing-responsive-sm">
            <h1 className="text-black text-responsive-lg font-bold">
              {collapsed && !isMobile ? 'VT' : 'Visitrack'}
            </h1>
          </div>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[router.pathname]}
            items={getMenuItems()}
            onClick={handleMenuClick}
            style={{ 
              background: '#FFFFFF',
              color: '#000000',
              borderRight: '1px solid #f0f0f0'
            }}
          />
        </Sider>
        
        <Layout>
          <Header 
            className="admin-header-responsive"
            style={{ 
              padding: '0 16px', 
              background: '#fff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}
          >
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={handleMenuToggle}
              style={{ fontSize: '16px', width: 64, height: 64 }}
            />
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Text strong className="text-responsive-sm hide-mobile">{user?.name}</Text>
              <Text type="secondary" className="text-responsive-xs hide-mobile">({user?.role})</Text>
              
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <Space className="cursor-pointer">
                  <Avatar icon={<UserOutlined />} />
                  <span className="show-mobile text-responsive-sm">{user?.name}</span>
                </Space>
              </Dropdown>
            </div>
          </Header>
          
          <Content 
            className="admin-content-responsive admin-content-wrapper"
            style={{ 
              margin: '24px 16px', 
              padding: 24, 
              background: '#fff', 
              minHeight: 280 
            }}
          >
            <div className="admin-responsive-container">
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </>
  );
};

export default MainLayout;
