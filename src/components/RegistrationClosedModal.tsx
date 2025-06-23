import React from 'react';
import { Modal, Button, Descriptions, Card, Alert, Divider } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, UserOutlined, ClockCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { Event } from '../types/event';

interface RegistrationClosedModalProps {
  visible: boolean;
  onCancel: () => void;
  onDownloadBadge: () => void;
  event: Event;
}

const RegistrationClosedModal: React.FC<RegistrationClosedModalProps> = ({ 
  visible, 
  onCancel, 
  onDownloadBadge, 
  event 
}) => {
  const formatDate = (dateString: string) => {
    try {
      // Handle DD-MM-YYYY format
      if (dateString.includes('-') && dateString.split('-').length === 3) {
        const [day, month, year] = dateString.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      // Handle ISO date format
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      // Handle DD-MM-YYYY format - assume start of day
      if (dateString.includes('-') && dateString.split('-').length === 3) {
        const [day, month, year] = dateString.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <ClockCircleOutlined className="text-orange-500" />
          <span>Registration Closed</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <div className="space-y-6">
        {/* Alert Message */}
        <Alert
          message="Online Registration is Closed"
          description="The registration deadline for this event has passed. However, you can still attend the event through on-site registration."
          type="warning"
          showIcon
          className="mb-4"
        />

        {/* Event Information */}
        <Card title={
          <div className="flex items-center gap-2">
            <CalendarOutlined className="text-blue-500" />
            <span>Event Details</span>
          </div>
        }>
          <Descriptions column={1} size="middle">
            <Descriptions.Item 
              label={<><CalendarOutlined className="mr-1" />Event Name</>}
            >
              <span className="font-semibold text-gray-900">{event.title}</span>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={<><EnvironmentOutlined className="mr-1" />Location</>}
            >
              <span className="text-gray-700">{event.location}</span>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={<><CalendarOutlined className="mr-1" />Event Date</>}
            >
              <span className="text-gray-700">
                {event.startDate === event.endDate 
                  ? formatDate(event.startDate)
                  : `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`
                }
              </span>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={<><UserOutlined className="mr-1" />Organizer</>}
            >
              <span className="text-gray-700">{event.organizer}</span>
            </Descriptions.Item>
            
            {event.registrationDeadline && (
              <Descriptions.Item 
                label={<><ClockCircleOutlined className="mr-1" />Registration Deadline</>}
              >
                <span className="text-red-600 font-medium">
                  {formatDate(event.registrationDeadline)} (Passed)
                </span>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* On-site Registration Information */}
        <Card 
          title={
            <div className="flex items-center gap-2">
              <EnvironmentOutlined className="text-green-500" />
              <span>On-Site Registration Available</span>
            </div>
          }
          className="border-green-200"
        >
          <div className="space-y-3">
            <Alert
              message="You can still attend this event!"
              type="success"
              showIcon={false}
              className="bg-green-50 border-green-200"
            />
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">How to Register On-Site:</h4>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Visit the event venue on <strong>{formatTime(event.startDate)}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Look for the registration desk at <strong>{event.location}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Complete registration and payment for entry badge</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>Receive your event badge and enjoy the event!</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> On-site registration is subject to availability and may require payment for an entry badge. 
                We recommend arriving early to secure your spot.
              </p>
            </div>
          </div>
        </Card>

        <Divider />

        {/* Download Badge Section */}
        <div className="text-center space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Already Registered?</h4>
            <p className="text-gray-600 text-sm">
              If you registered before the deadline, you can download your event badge here.
            </p>
          </div>
          
          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            onClick={onDownloadBadge}
            className="bg-blue-500 hover:bg-blue-600 border-blue-500 hover:border-blue-600"
          >
            Download My Badge
          </Button>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end pt-4 border-t">
          <Button size="large" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RegistrationClosedModal; 