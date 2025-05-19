import React, { useState } from 'react';
import { Card, Table, DatePicker, Select, Button, Space, Tabs } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import AdminLayout from './layout';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const Reports = () => {
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Mock data for registration report
  const registrationData = [
    {
      key: '1',
      name: 'John Doe',
      email: 'john@example.com',
      source: 'Online',
      status: 'Visited',
      registrationDate: '2023-06-01',
      visitDate: '2023-06-15',
    },
  ];

  // Mock data for entry log
  const entryLogData = [
    {
      key: '1',
      name: 'John Doe',
      entryTime: '2023-06-15 09:30:00',
      exitTime: '2023-06-15 17:00:00',
      duration: '7h 30m',
    },
  ];

  const registrationColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Registration Date',
      dataIndex: 'registrationDate',
      key: 'registrationDate',
    },
    {
      title: 'Visit Date',
      dataIndex: 'visitDate',
      key: 'visitDate',
    },
  ];

  const entryLogColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Entry Time',
      dataIndex: 'entryTime',
      key: 'entryTime',
    },
    {
      title: 'Exit Time',
      dataIndex: 'exitTime',
      key: 'exitTime',
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
    },
  ];

  const handleExport = (format: string) => {
    // TODO: Implement export functionality
    console.log(`Exporting report in ${format} format`);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>
        
        <Tabs defaultActiveKey="1">
          <TabPane tab="Registration Report" key="1">
            <Card>
              <Space className="mb-4">
                <RangePicker
                  onChange={(dates) => console.log(dates)}
                  className="w-64"
                />
                <Select
                  value={selectedSource}
                  onChange={setSelectedSource}
                  className="w-40"
                  options={[
                    { value: 'all', label: 'All Sources' },
                    { value: 'online', label: 'Online' },
                    { value: 'pre-registered', label: 'Pre-registered' },
                  ]}
                />
                <Select
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  className="w-40"
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'visited', label: 'Visited' },
                    { value: 'not-visited', label: 'Not Visited' },
                  ]}
                />
                <Button.Group>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('csv')}
                  >
                    CSV
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('excel')}
                  >
                    Excel
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('pdf')}
                  >
                    PDF
                  </Button>
                </Button.Group>
              </Space>

              <Table
                dataSource={registrationData}
                columns={registrationColumns}
                pagination={{ pageSize: 10 }}
                scroll={{ x: true }}
              />
            </Card>
          </TabPane>

          <TabPane tab="Entry Log" key="2">
            <Card>
              <Space className="mb-4">
                <RangePicker
                  onChange={(dates) => console.log(dates)}
                  className="w-64"
                />
                <Button.Group>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('csv')}
                  >
                    CSV
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('excel')}
                  >
                    Excel
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('pdf')}
                  >
                    PDF
                  </Button>
                </Button.Group>
              </Space>

              <Table
                dataSource={entryLogData}
                columns={entryLogColumns}
                pagination={{ pageSize: 10 }}
                scroll={{ x: true }}
              />
            </Card>
          </TabPane>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Reports;
