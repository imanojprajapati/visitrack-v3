import React, { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Switch,
  Space,
  Upload,
  message,
  Card,
  Tabs,
  Select,
  InputNumber,
  Progress,
  Tag,
  Row,
  Col
} from 'antd';
import type { TableProps } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  EyeOutlined,
  LinkOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import AdminLayout from './layout';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface Event {
  id: number;
  title: string;
  venue: string;
  date: string;
  time: string;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
  visitors: number;
  capacity: number;
  description: string;
  banner?: string;
}

interface FormValues {
  title: string;
  venue: string;
  date: string;
  time: string;
  status: Event['status'];
  capacity: number;
  description?: string;
  banner?: string;
  registrationDeadline?: string;
}

export default function EventManagement() {
  const [form] = Form.useForm<FormValues>();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Mock data - replace with API calls later
  const events: Event[] = [
    {
      id: 1,
      title: 'Tech Conference 2024',
      venue: 'Convention Center',
      date: '2024-03-15',
      time: '09:00',
      status: 'active',
      visitors: 1200,
      capacity: 1500,
      description: 'Annual technology conference featuring industry leaders and innovators.',
      banner: '/images/events/tech-conference.jpg'
    },
    {
      id: 2,
      title: 'Startup Expo',
      venue: 'Innovation Hub',
      date: '2024-04-20',
      time: '10:00',
      status: 'upcoming',
      visitors: 800,
      capacity: 1000,
      description: 'Showcase of emerging startups and entrepreneurial innovations.',
      banner: '/images/events/startup-expo.jpg'
    },
  ];

  const columns: TableProps<Event>['columns'] = [
    {
      title: 'Event',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space>
          <img 
            src={record.banner} 
            alt={text} 
            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
          />
          <div>
            <div className="font-medium">{text}</div>
            <div className="text-sm text-gray-500">{record.venue}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Date & Time',
      dataIndex: 'date',
      key: 'date',
      render: (date, record) => (
        <div>
          <div>{date}</div>
          <div className="text-sm text-gray-500">{record.time}</div>
        </div>
      ),
    },
    {
      title: 'Capacity',
      key: 'capacity',
      render: (_, record) => (
        <div>
          <Progress 
            percent={Math.round((record.visitors / record.capacity) * 100)} 
            size="small"
          />
          <div className="text-sm text-gray-500">
            {record.visitors} / {record.capacity} visitors
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',      render: (status: Event['status']) => {
        const colors: Record<Event['status'], string> = {
          active: 'green',
          upcoming: 'blue',
          completed: 'gray',
          cancelled: 'red'
        };
        return (
          <Tag color={colors[status]}>
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedEvent(record);
              setModalVisible(true);
            }}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedEvent(record);
              setModalVisible(true);
            }}
          />
          <Button 
            type="text" 
            icon={<DeleteOutlined />}
            danger
            onClick={() => {
              // Implement delete functionality
              message.success('Event deleted successfully');
            }}
          />
        </Space>
      ),
    },
  ];

  const handleSubmit = (values: FormValues) => {
    console.log('Form values:', values);
    // Implement form submission
    message.success('Event saved successfully');
    setModalVisible(false);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <Card
          title={<h1 className="text-2xl font-bold">Event Management</h1>}
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedEvent(null);
                setModalVisible(true);
              }}
            >
              Create Event
            </Button>
          }
        >
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="All Events" key="1">
              <Table
                columns={columns}
                dataSource={events}
                rowKey="id"
                pagination={{
                  total: events.length,
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} events`,
                }}
              />
            </TabPane>
            <TabPane tab="Active Events" key="2">
              <Table
                columns={columns}
                dataSource={events.filter(e => e.status === 'active')}
                rowKey="id"
              />
            </TabPane>
            <TabPane tab="Upcoming Events" key="3">
              <Table
                columns={columns}
                dataSource={events.filter(e => e.status === 'upcoming')}
                rowKey="id"
              />
            </TabPane>
          </Tabs>
        </Card>

        <Modal
          title={selectedEvent ? 'Edit Event' : 'Create New Event'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={800}
        >          <Form<FormValues>
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={selectedEvent || undefined}
          >
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item
                  name="title"
                  label="Event Title"
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="status"
                  label="Status"
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Select.Option value="active">Active</Select.Option>
                    <Select.Option value="upcoming">Upcoming</Select.Option>
                    <Select.Option value="completed">Completed</Select.Option>
                    <Select.Option value="cancelled">Cancelled</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="date"
                  label="Event Date"
                  rules={[{ required: true }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="time"
                  label="Event Time"
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="venue"
              label="Venue"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="capacity"
                  label="Capacity"
                  rules={[{ required: true }]}
                >
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="registrationDeadline"
                  label="Registration Deadline"
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea rows={4} />
            </Form.Item>

            <Form.Item
              name="banner"
              label="Event Banner"
            >
              <Upload
                action="/api/upload"
                listType="picture-card"
                maxCount={1}
                accept="image/*"
              >
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              </Upload>
            </Form.Item>

            <Form.Item className="mb-0">
              <Space>
                <Button type="primary" htmlType="submit">
                  {selectedEvent ? 'Update Event' : 'Create Event'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
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
