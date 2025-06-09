import React from 'react';
import { Tabs, Card, Typography, Space, Alert } from 'antd';
import { UserOutlined, HistoryOutlined } from '@ant-design/icons';
import AdminLayout from './layout';
import RegistrationReport from './reports/registrations';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

interface VisitorReport {
  _id: string;
  name: string;
  email: string;
  eventDate?: string;
  event?: {
    _id: string;
    title: string;
    startDate: string;
    endDate: string;
  };
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export default function ReportsPage() {
  const columns = [
    {
      title: 'Event Date',
      dataIndex: 'eventDate',
      key: 'eventDate',
      render: (date: string, record: VisitorReport) => {
        // Fallback to event start date if eventDate is not available
        const eventDate = date || record.event?.startDate;
        return eventDate ? dayjs(eventDate).format('DD MMM YYYY') : '-';
      },
      sorter: (a: VisitorReport, b: VisitorReport) => {
        const dateA = a.eventDate || a.event?.startDate || '';
        const dateB = b.eventDate || b.event?.startDate || '';
        return dayjs(dateA).unix() - dayjs(dateB).unix();
      },
    },
  ];

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-none mb-6">
          <Title level={2}>Reports</Title>
          <Text type="secondary">View and analyze visitor registration data and entry logs</Text>
        </div>

        <Card className="bg-white shadow-sm flex-1 flex flex-col overflow-hidden">
          <Tabs 
            defaultActiveKey="registrations"
            type="card"
            size="large"
            tabBarStyle={{ marginBottom: 24 }}
            className="flex-1 flex flex-col reports-tabs"
          >
            <TabPane 
              tab={
                <Space>
                  <UserOutlined />
                  <span>Registration Report</span>
                </Space>
              } 
              key="registrations"
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 flex flex-col overflow-hidden">
                <RegistrationReport />
              </div>
            </TabPane>
            
            <TabPane 
              tab={
                <Space>
                  <HistoryOutlined />
                  <span>Entry Log</span>
                </Space>
              } 
              key="entry-log"
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="p-6 flex-1 flex flex-col overflow-hidden">
                <Alert
                  message="Entry Log Coming Soon"
                  description="The entry log feature is currently under development. It will show detailed check-in and check-out records for all visitors."
                  type="info"
                  showIcon
                  className="mb-6"
                />
                <Card className="flex-1 overflow-hidden">
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

        <style jsx global>{`
          .ant-card {
            border-radius: 8px;
          }
          .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab {
            border-radius: 8px 8px 0 0;
          }
          .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active {
            background: #fff;
            border-bottom-color: #fff;
          }
          .ant-tabs-content {
            background: #fff;
            border-radius: 0 0 8px 8px;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .ant-tabs-tabpane {
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .ant-tabs-content-holder {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .reports-tabs {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
          }
          .reports-tabs .ant-tabs-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
        `}</style>
      </div>
    </AdminLayout>
  );
} 