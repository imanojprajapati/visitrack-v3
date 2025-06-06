import React from 'react';
import { Tabs, Card, Typography, Space, Alert } from 'antd';
import { UserOutlined, HistoryOutlined, BarChartOutlined } from '@ant-design/icons';
import AdminLayout from './layout';
import RegistrationReport from './reports/registrations';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

export default function ReportsPage() {
  return (
    <AdminLayout>
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <Title level={2} className="text-xl sm:text-2xl font-bold">Reports</Title>
            <Text type="secondary">View and analyze visitor registration data and entry logs</Text>
          </div>
        </div>

        <Card>
          <Tabs 
            defaultActiveKey="registrations"
            type="card"
            size="large"
            tabBarStyle={{ marginBottom: 24 }}
            className="overflow-x-auto"
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
                  <span>Entry Logs</span>
                </Space>
              }
              key="entry-logs"
            >
              <div className="p-4">
                <Alert
                  message="Coming Soon"
                  description="Entry logs report will be available in the next update. This will include detailed visitor check-in and check-out times, duration of visits, and location tracking."
                  type="info"
                  showIcon
                />
              </div>
            </TabPane>

            <TabPane
              tab={
                <Space>
                  <BarChartOutlined />
                  <span>Analytics</span>
                </Space>
              }
              key="analytics"
            >
              <div className="p-4">
                <Alert
                  message="Coming Soon"
                  description="Analytics dashboard will provide insights into visitor demographics, peak hours, popular events, and more."
                  type="info"
                  showIcon
                />
              </div>
            </TabPane>
          </Tabs>
        </Card>
      </div>
    </AdminLayout>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      isAdminPage: true,
    },
  };
}
