import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Layout, Menu } from 'antd';
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
} from '@ant-design/icons';

const { Content, Sider } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', path: '/admin' },
  { key: 'visitors', icon: <UserOutlined />, label: 'Visitor Management', path: '/admin/visitors' },
  { key: 'badges', icon: <IdcardOutlined />, label: 'Badge Management', path: '/admin/badges' },
  { key: 'events', icon: <CalendarOutlined />, label: 'Event Management', path: '/admin/events' },
  { key: 'forms', icon: <FormOutlined />, label: 'Form Builder', path: '/admin/forms' },
  { key: 'messaging', icon: <MessageOutlined />, label: 'Messaging', path: '/admin/messaging' },
  { key: 'qr', icon: <QrcodeOutlined />, label: 'QR Scanner', path: '/admin/qr-scanner' },
  { key: 'reports', icon: <FileTextOutlined />, label: 'Reports', path: '/admin/reports' },
  { key: 'settings', icon: <SettingOutlined />, label: 'Settings', path: '/admin/settings' },
];

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const selectedKey = router.pathname.split('/')[2] || 'dashboard';
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
        }}
      >        <div className="logo p-4 flex items-center justify-center">
          <Link href="/" className="flex items-center">
            {!collapsed ? (
              <img
                src="/images/logo.png"
                alt="Visitrack"
                className="h-8 w-auto"
              />
            ) : (
              <img
                src="/images/icon.png"
                alt="Visitrack"
                className="h-8 w-8"
              />
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
      </Sider>      <Layout style={{ 
          marginLeft: collapsed ? 80 : 200, 
          transition: 'all 0.2s',
          minHeight: '100vh',
          background: '#f5f5f5'
        }}>
        <Content style={{ 
          margin: '24px',
          minHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
