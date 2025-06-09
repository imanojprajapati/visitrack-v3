import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import AdminLayout from './layout';

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">Dashboard</h1>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card className="w-full shadow-sm">
              <Statistic
                title={<span className="text-base sm:text-lg">Total Visitors</span>}
                value={2547}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="w-full shadow-sm">
              <Statistic
                title={<span className="text-base sm:text-lg">Active Events</span>}
                value={8}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#52c41a', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="w-full shadow-sm">
              <Statistic
                title={<span className="text-base sm:text-lg">Check-ins Today</span>}
                value={156}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#722ed1', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="w-full shadow-sm">
              <Statistic
                title={<span className="text-base sm:text-lg">Pending Approvals</span>}
                value={23}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14', fontSize: 24 }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </AdminLayout>
  );
}

// Add getServerSideProps to pass the isAdminPage prop
export async function getServerSideProps() {
  return {
    props: {
      isAdminPage: true,
    },
  };
}
