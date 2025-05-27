import React from 'react';
import { Tabs, Card, Typography, Space, Alert } from 'antd';
import { UserOutlined, HistoryOutlined } from '@ant-design/icons';
import AdminLayout from './layout';
import RegistrationReport from './reports/registrations';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

export default function ReportsPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <Title level={2}>Reports</Title>
          <Text type="secondary">View and analyze visitor registration data and entry logs</Text>
        </div>

        <Card>
          <Tabs 
            defaultActiveKey="registrations"
            type="card"
            size="large"
            tabBarStyle={{ marginBottom: 24 }}
          >
            <TabPane 
              tab={
                <Space>
                  <UserOutlined />
                  <span>Registration Report</span>
                </Space>
              } 
              key="registrations"
            >
              <RegistrationReport />
            </TabPane>
            
            <TabPane 
              tab={
                <Space>
                  <HistoryOutlined />
                  <span>Entry Log</span>
                </Space>
              } 
              key="entry-log"
            >
              <div className="p-6">
                <Alert
                  message="Entry Log Coming Soon"
                  description="The entry log feature is currently under development. It will show detailed check-in and check-out records for all visitors."
                  type="info"
                  showIcon
                  className="mb-6"
                />
                <Card>
                  <div className="text-center py-12">
                    <HistoryOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                    <Title level={4} className="mt-4">Entry Log Feature</Title>
                    <Text type="secondary" className="block mt-2">
                      This feature will provide:
                    </Text>
                    <ul className="text-left max-w-md mx-auto mt-4 text-gray-600">
                      <li>• Real-time check-in and check-out tracking</li>
                      <li>• Visitor movement history</li>
                      <li>• Time-based analytics</li>
                      <li>• Export capabilities for entry logs</li>
                    </ul>
                  </div>
                </Card>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      </div>
    </AdminLayout>
  );
}
