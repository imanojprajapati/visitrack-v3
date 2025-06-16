import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Layout, Menu, Typography, Button } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  IdcardOutlined,
  CalendarOutlined,
  FormOutlined,
  MessageOutlined,
  QrcodeOutlined,
  FileTextOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

const { Content, Sider } = Layout;
const { Text } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', path: '/admin' },
  { key: 'visitors', icon: <UserOutlined />, label: 'Visitor Management', path: '/admin/visitors' },
  { key: 'badges', icon: <IdcardOutlined />, label: 'Badge Management', path: '/admin/badge-management' },
  { key: 'events', icon: <CalendarOutlined />, label: 'Event Management', path: '/admin/events' },
  { key: 'forms', icon: <FormOutlined />, label: 'Form Builder', path: '/admin/forms' },
  { key: 'messaging', icon: <MessageOutlined />, label: 'Messaging', path: '/admin/messaging' },
  { key: 'qr', icon: <QrcodeOutlined />, label: 'QR Scanner', path: '/admin/qr-scanner' },
  { key: 'scan-by-camera', icon: <QrcodeOutlined />, label: 'Scan by Camera', path: '/admin/scan-by-camera' },
  { key: 'reports', icon: <FileTextOutlined />, label: 'Reports', path: '/admin/reports' },
  { key: 'settings', icon: <SettingOutlined />, label: 'Settings', path: '/admin/settings' },
];

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  
  // Update selected key based on current path
  const getSelectedKey = () => {
    const path = router.pathname;
    if (path.startsWith('/admin/scan-by-camera')) return 'scan-by-camera';
    if (path.startsWith('/admin/reports')) return 'reports';
    if (path.startsWith('/admin/settings')) return 'settings';
    if (path.startsWith('/admin/messaging')) return 'messaging';
    if (path.startsWith('/admin/forms')) return 'forms';
    if (path.startsWith('/admin/events')) return 'events';
    if (path.startsWith('/admin/dashboard')) return 'dashboard';
    if (path.startsWith('/admin/badge-management')) return 'badge-management';
    if (path.startsWith('/admin/visitors')) return 'visitors';
    if (path.startsWith('/admin/qr-scanner')) return 'qr-scanner';
    return 'dashboard';
  };

  const [selectedKey, setSelectedKey] = useState(getSelectedKey());

  // Update selected key when route changes
  useEffect(() => {
    setSelectedKey(getSelectedKey());
  }, [router.pathname]);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
        setMobileMenuVisible(false);
      } else {
        setMobileMenuVisible(true);
        setCollapsed(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuVisible(!mobileMenuVisible);
  };

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Mobile Menu Toggle Button */}
      {isMobile && (
        <Button
          type="text"
          icon={mobileMenuVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          onClick={toggleMobileMenu}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 1001,
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
          }}
        />
      )}
      
      <Sider
        theme="light"
        collapsible
        collapsed={collapsed}
        onCollapse={toggleSidebar}
        breakpoint="md"
        collapsedWidth={isMobile ? 0 : 80}
        style={{
          height: '100vh',
          position: isMobile ? 'fixed' : 'sticky',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.06)',
          overflow: 'auto',
          transform: isMobile ? (mobileMenuVisible ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          transition: 'all 0.3s ease-in-out',
          width: isMobile ? '250px' : undefined,
          visibility: isMobile ? (mobileMenuVisible ? 'visible' : 'hidden') : 'visible',
          opacity: isMobile ? (mobileMenuVisible ? 1 : 0) : 1,
        }}
        trigger={null}
      >
        <div className="logo p-4 flex items-center justify-center border-b border-gray-100">
          <Link href="/admin" className="flex items-center justify-center w-full">
            {!collapsed ? (
              <img
                src="/images/logo.png"
                alt="Visitrack"
                className="h-8 w-auto"
              />
            ) : (
              <Text strong style={{ fontSize: '24px', color: '#3730A3' }}>V</Text>
            )}
          </Link>
        </div>
        <Menu
          theme="light"
          selectedKeys={[selectedKey]}
          mode="inline"
          items={menuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: (
              <Link href={item.path}>
                {item.label}
              </Link>
            ),
          }))}
        />
        {/* Collapse Trigger Button */}
        {!isMobile && (
          <div 
            className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 cursor-pointer hover:bg-gray-50"
            onClick={toggleSidebar}
          >
            <div className="flex items-center justify-center text-gray-500">
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              {!collapsed && <span className="ml-2"></span>}
            </div>
          </div>
        )}
      </Sider>
      
      {/* Overlay for mobile menu */}
      {isMobile && mobileMenuVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            opacity: mobileMenuVisible ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
          onClick={() => setMobileMenuVisible(false)}
        />
      )}

      <Layout style={{ 
        marginLeft: isMobile ? 0 : (collapsed ? 0 : 0),
        transition: 'all 0.2s',
        minHeight: '100vh',
        background: '#f0f2f5',
        padding: isMobile ? '12px' : '24px',
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <Content style={{ 
          padding: isMobile ? '16px' : '24px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '100%',
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          // overflow: 'hidden',
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
