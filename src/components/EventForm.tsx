import { Form, Input, DatePicker, TimePicker, Select, InputNumber, Upload, Button } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import { useEventForm } from '../hooks/useEventForm';
import { FormValues } from '../pages/admin/events';
import { RcFile } from 'antd/lib/upload';
import { useAppContext } from '../context/AppContext';

const { TextArea } = Input;
const { Option } = Select;

const normFile = (e: any) => {
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

export default function EventForm() {
  const { form, handleSubmit, handleImageUpload } = useEventForm();
  const { messageApi } = useAppContext();
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Create New Event</h2>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          status: 'active',
        }}
        className="w-full"
      >
        <div className="grid grid-cols-1 gap-6">
          <Form.Item
            name="title"
            label="Event Title"
            rules={[{ required: true, message: 'Please enter event title' }]}
            className="w-full"
          >
            <Input className="w-full" />
          </Form.Item>

          <Form.Item
            name="venue"
            label="Venue"
            rules={[{ required: true, message: 'Please enter venue' }]}
            className="w-full"
          >
            <Input className="w-full" />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: 'Please select date' }]}
              className="w-full"
            >
              <DatePicker className="w-full" />
            </Form.Item>

            <Form.Item
              name="time"
              label="Time"
              rules={[{ required: true, message: 'Please select time' }]}
              className="w-full"
            >
              <TimePicker format="HH:mm" className="w-full" />
            </Form.Item>
          </div>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
            className="w-full"
          >
            <Select className="w-full">
              <Option value="active">Active</Option>
              <Option value="upcoming">Upcoming</Option>
              <Option value="completed">Completed</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="capacity"
            label="Capacity"
            rules={[{ required: true, message: 'Please enter capacity' }]}
            className="w-full"
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter event description' }]}
            className="w-full"
          >
            <Input.TextArea 
              rows={4} 
              className="w-full resize-none"
              placeholder="Enter event description..."
            />
          </Form.Item>

          <Form.Item
            name="banner"
            label="Banner Image"
            valuePropName="fileList"
            getValueFromEvent={normFile}
            className="w-full"
          >
            <Upload
              name="file"
              action="/api/upload"
              listType="picture-card"
              maxCount={1}
              accept="image/*"
              showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
              beforeUpload={(file) => {
                const isImage = file.type.startsWith('image/');
                if (!isImage) {
                  messageApi?.error('You can only upload image files!');
                  return false;
                }
                const isLessThan5MB = file.size / 1024 / 1024 < 5;
                if (!isLessThan5MB) {
                  messageApi?.error('Image must be smaller than 5MB!');
                  return false;
                }
                return true;
              }}
              onChange={handleImageUpload}
            >
              {form.getFieldValue('banner') ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item
            name="registrationDeadline"
            label="Registration Deadline"
            className="w-full"
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <div className="flex justify-end space-x-4">
            <Button onClick={() => form.resetFields()}>
              Reset
            </Button>
            <Button type="primary" htmlType="submit">
              Create Event
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}