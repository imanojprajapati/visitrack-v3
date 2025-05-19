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
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Visitors"
                value={2547}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Active Events"
                value={8}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Check-ins Today"
                value={156}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Pending Approvals"
                value={23}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
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
