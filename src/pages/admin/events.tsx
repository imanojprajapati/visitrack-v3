import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Upload,
  Card,
  Select,
  InputNumber,
  Progress,
  Tag,
  Row,
  Col,
  Popconfirm
} from 'antd';
import type { TableProps } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { DatePicker, dayjs } from '../../utils/date';
import AdminLayout from './layout';
import { useAppContext } from '../../context/AppContext';
import { useEventForm } from '../../hooks/useEventForm';
import type { Event, EventStatus } from '../../types/event';

const { TextArea } = Input;

export interface FormValues {
  title: string;
  venue: string;
  date: any; // dayjs object for start date
  endDate: any; // dayjs object for end date
  time: string;
  endTime: string;
  status: Event['status'];
  capacity: number;
  description?: string;
  banner?: string;
  registrationDeadline?: any; // dayjs object
}

export default function EventManagement() {
  const { messageApi } = useAppContext();
  const { form, handleSubmit, handleImageUpload } = useEventForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const refreshEvents = async (showMessage = true) => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      
      // Sort events by date (newest first)
      const sortedEvents = data.sort((a: Event, b: Event) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      
      setEvents(sortedEvents);
      if (showMessage) {
        messageApi?.success('Events list refreshed');
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      if (showMessage) {
        messageApi?.error('Failed to refresh events list');
      }
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    setMounted(true);
    refreshEvents(false);

    // Set up periodic refresh every 30 seconds
    const intervalId = setInterval(() => refreshEvents(false), 300000000);

    // Cleanup interval on component unmount
    return () => {
      clearInterval(intervalId);
      setMounted(false);
    };
  }, []);

  // Add refresh after modal close
  const handleModalClose = () => {
    form.resetFields();
    setModalVisible(false);
    setIsViewMode(false);
    refreshEvents(false); // Refresh events after modal closes without showing message
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete event');
      }

      messageApi?.success('Event deleted successfully');
      refreshEvents(false); // Refresh events after deletion without showing message
    } catch (error) {
      console.error('Failed to delete event:', error);
      messageApi?.error(error instanceof Error ? error.message : 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: TableProps<Event>['columns'] = [
    {
      title: 'Event',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Event) => (
        <Space>
          {record.banner && (
            <div style={{ width: 40, height: 40, position: 'relative', overflow: 'hidden', borderRadius: 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={record.banner} 
                alt={text}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
          <div>
            <div className="font-medium">{text}</div>
            <div className="text-sm text-gray-500">{record.location}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Date & Time',
      key: 'date',
      render: (_, record) => (
        <div>
          <div>{typeof record.startDate === 'string' ? new Date(record.startDate).toLocaleDateString() : record.startDate?.toLocaleDateString?.() ?? ''}</div>
          <div className="text-sm text-gray-500">{record.time}</div>
        </div>
      ),
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (_, record) => {
        const visitorCount = record.visitors ?? 0;
        const isFull = visitorCount >= record.capacity;
        return (
          <div className="flex items-center gap-2">
            <Progress 
              percent={Math.round(visitorCount / record.capacity * 100)} 
              size="small"
              status={isFull ? 'exception' : 'active'}
            />
            <div>
              {visitorCount} / {record.capacity}
              {isFull && (
                <Tag color="red" className="ml-2">Full</Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: EventStatus) => {
        const colors: Record<EventStatus, string> = {
          draft: 'gray',
          published: 'green',
          cancelled: 'red',
          upcoming: 'blue'
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
              setIsViewMode(true);
              setModalVisible(true);
            }}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedEvent(record);
              setIsViewMode(false);
              setModalVisible(true);
            }}
          />
          <Popconfirm
            title="Delete Event"
            description="Are you sure you want to delete this event? This action cannot be undone."
            onConfirm={() => handleDeleteEvent(record._id!)}
            okText="Yes, delete"
            cancelText="No, cancel"
            okButtonProps={{ danger: true, loading: isDeleting }}
          >
            <Button 
              type="text" 
              icon={<DeleteOutlined />}
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];  

  const getInitialValues = (event: Event | null) => {
    if (!event) return undefined;

    // Convert banner URL to fileList format that Upload component expects
    const fileList = event.banner ? [{
      uid: '-1',
      name: event.banner.split('/').pop() || 'image.jpg',
      status: 'done',
      url: event.banner,
    }] : undefined;

    return {
      title: event.title,
      venue: event.venue || event.location, // Use venue if available, fallback to location
      date: event.startDate ? dayjs(event.startDate) : undefined,
      endDate: event.endDate ? dayjs(event.endDate) : undefined,
      time: event.time,
      endTime: event.endTime,
      status: event.status,
      capacity: event.capacity,
      description: event.description,
      registrationDeadline: event.registrationDeadline ? dayjs(event.registrationDeadline) : undefined,
      banner: fileList
    };
  };

  const onSubmit = async (values: FormValues) => {
    const success = await handleSubmit(values, selectedEvent?._id);
    if (success) {
      setModalVisible(false);
      form.resetFields();
      setIsViewMode(false);
      refreshEvents(false); // Refresh events after submission without showing message
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <Card
          title={<h1 className="text-2xl font-bold">Event Management</h1>}
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined spin={isRefreshing} />}
                onClick={() => refreshEvents(true)} // Show message when manually refreshing
                disabled={isRefreshing}
                title="Refresh Events List"
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  form.resetFields();
                  setSelectedEvent(null);
                  setIsViewMode(false);
                  setModalVisible(true);
                }}
              >
                Create Event
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={events}
            rowKey="_id"
            pagination={{
              total: events.length,
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} events`,
            }}
            loading={isLoading || isRefreshing}
          />
        </Card>

        <Modal
          title={isViewMode ? 'Event Details' : (selectedEvent ? 'Edit Event' : 'Create New Event')}
          open={modalVisible}
          onCancel={handleModalClose}
          footer={isViewMode ? [
            <Button key="close" onClick={handleModalClose}>
              Close
            </Button>
          ] : null}
          width={800}
        >
          {isViewMode && selectedEvent ? (
            <div className="p-4">
              {selectedEvent.banner && (
                <div className="mb-6">
                  <img 
                    src={selectedEvent.banner} 
                    alt={selectedEvent.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <h2 className="text-2xl font-bold mb-4">{selectedEvent.title}</h2>
                </Col>
                <Col span={12}>
                  <div className="font-semibold text-gray-600">Date & Time</div>
                  <div>
                    {typeof selectedEvent.startDate === 'string' 
                      ? new Date(selectedEvent.startDate).toLocaleDateString()
                      : selectedEvent.startDate instanceof Date 
                        ? selectedEvent.startDate.toLocaleDateString()
                        : ''} at {selectedEvent.time}
                  </div>
                </Col>
                <Col span={12}>
                  <div className="font-semibold text-gray-600">Status</div>
                  <Tag color={
                    selectedEvent.status === 'published' ? 'green' :
                    selectedEvent.status === 'upcoming' ? 'blue' :
                    selectedEvent.status === 'draft' ? 'gray' : 'red'
                  }>
                    {selectedEvent.status.toUpperCase()}
                  </Tag>
                </Col>
                <Col span={12}>
                  <div className="font-semibold text-gray-600">Venue</div>
                  <div>{selectedEvent.venue || selectedEvent.location}</div>
                </Col>
                <Col span={12}>
                  <div className="font-semibold text-gray-600">Capacity</div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const visitorCount = selectedEvent.visitors ?? 0;
                      const isFull = visitorCount >= selectedEvent.capacity;
                      return (
                        <>
                          <Progress 
                            percent={Math.round(visitorCount / selectedEvent.capacity * 100)} 
                            size="small"
                            status={isFull ? 'exception' : 'active'}
                          />
                          <div>
                            {visitorCount} / {selectedEvent.capacity} visitors
                            {isFull && (
                              <Tag color="red" className="ml-2">Full</Tag>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </Col>
                <Col span={24}>
                  <div className="font-semibold text-gray-600">Description</div>
                  <div className="mt-1">{selectedEvent.description}</div>
                </Col>
                {selectedEvent.registrationDeadline && (
                  <Col span={12}>
                    <div className="font-semibold text-gray-600">Registration Deadline</div>
                    <div>
                      {typeof selectedEvent.registrationDeadline === 'string'
                        ? new Date(selectedEvent.registrationDeadline).toLocaleDateString()
                        : selectedEvent.registrationDeadline instanceof Date
                          ? selectedEvent.registrationDeadline.toLocaleDateString()
                          : ''}
                    </div>
                  </Col>
                )}
              </Row>
            </div>
          ) : (
            <Form
              form={form}
              layout="vertical"
              onFinish={onSubmit}
              initialValues={getInitialValues(selectedEvent)}
            >
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    name="title"
                    label="Event Title"
                    rules={[{ required: true, message: 'Please enter event title' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true, message: 'Please select status' }]}
                  >
                    <Select>
                      <Select.Option value="published">Published</Select.Option>
                      <Select.Option value="upcoming">Upcoming</Select.Option>
                      <Select.Option value="draft">Draft</Select.Option>
                      <Select.Option value="cancelled">Cancelled</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="date"
                    label="Start Date"
                    rules={[
                      { required: true, message: 'Please select the event start date' },
                    ]}
                  >
                    <DatePicker 
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="endDate"
                    label="End Date"
                    rules={[
                      { required: true, message: 'Please select the event end date' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || !getFieldValue('date') || value.isAfter(getFieldValue('date'))) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('End date must be after start date'));
                        },
                      }),
                    ]}
                  >
                    <DatePicker 
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="time"
                    label="Start Time"
                    rules={[{ required: true, message: 'Please enter event start time' }]}
                  >
                    <Input placeholder="e.g., 09:00 AM" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="endTime"
                    label="End Time"
                    rules={[{ required: true, message: 'Please enter event end time' }]}
                  >
                    <Input placeholder="e.g., 05:00 PM" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="venue"
                label="Venue"
                rules={[{ required: true, message: 'Please enter venue' }]}
              >
                <Input />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="capacity"
                    label="Capacity"
                    rules={[{ required: true, message: 'Please enter capacity' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={1} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="registrationDeadline"
                    label="Registration Deadline"
                  >
                    <DatePicker 
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD"
                    />
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
                valuePropName="fileList"
                getValueFromEvent={(e) => {
                  if (Array.isArray(e)) {
                    return e;
                  }
                  return e?.fileList || [];
                }}
              >
                <Upload
                  name="file"
                  action="/api/upload"
                  listType="picture-card"
                  maxCount={1}
                  accept="image/*"
                  fileList={form.getFieldValue('banner') ? [{
                    uid: '-1',
                    name: 'banner.jpg',
                    status: 'done',
                    url: form.getFieldValue('banner'),
                    response: { url: form.getFieldValue('banner') }
                  }] : []}
                  showUploadList={{
                    showPreviewIcon: true,
                    showRemoveIcon: true,
                  }}
                  beforeUpload={(file) => {
                    const isImage = file.type.startsWith('image/');
                    if (!isImage) {
                      messageApi?.error('You can only upload image files!');
                      return false;
                    }
                    const isLt5M = file.size / 1024 / 1024 < 5;
                    if (!isLt5M) {
                      messageApi?.error('Image must be smaller than 5MB!');
                      return false;
                    }
                    return true;
                  }}
                  onChange={(info) => {
                    // Ensure fileList is always an array
                    const fileList = info.fileList || [];
                    // Update form with the latest fileList
                    form.setFieldValue('banner', fileList);
                    // Call the original handler
                    handleImageUpload(info);
                  }}
                >
                  {(!form.getFieldValue('banner') || form.getFieldValue('banner').length === 0) && (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    {selectedEvent ? 'Update Event' : 'Create Event'}
                  </Button>
                  <Button onClick={() => {
                    form.resetFields();
                    setModalVisible(false);
                  }}>
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
