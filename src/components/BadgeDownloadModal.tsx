import React, { useState } from 'react';
import { Modal, Input, Button, message } from 'antd';
import { MailOutlined, CalendarOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { Event } from '../types/event';

interface BadgeDownloadModalProps {
  visible: boolean;
  onCancel: () => void;
  event: Event;
}

const BadgeDownloadModal: React.FC<BadgeDownloadModalProps> = ({ visible, onCancel, event }) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      message.error('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      message.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/registrations/find-by-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          eventId: event._id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          message.error('No registration found with this email address for this event');
        } else {
          message.error(data.message || 'Failed to find registration');
        }
        return;
      }

      if (data.found) {
        // Close the modal first
        handleModalClose();
        
        // Show success message
        message.success('Registration found! Redirecting to event page...');
        
        // Redirect to the event registration page
        setTimeout(() => {
          router.push(`/events/${event._id}/register`);
        }, 1000);
      } else {
        message.error('No registration found with this email address');
      }
    } catch (error) {
      console.error('Error finding registration:', error);
      message.error('Failed to search for registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setEmail('');
    onCancel();
  };

  return (
    <Modal
      title="Find Your Registration"
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="mb-4">
            <CalendarOutlined className="text-4xl text-blue-500 mb-2" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {event.title}
          </h3>
          <p className="text-gray-600 mb-4">
            Enter your email address to check your registration status and access the event page.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Enter the email address you used to register</li>
            <li>• We'll verify your registration</li>
            <li>• You'll be redirected to the event page</li>
            <li>• Access your registration details and download your badge</li>
          </ul>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <Input
              size="large"
              placeholder="Enter your registered email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              prefix={<MailOutlined className="text-gray-400" />}
              onPressEnter={handleEmailSubmit}
            />
          </div>

          <Button
            type="primary"
            size="large"
            loading={loading}
            onClick={handleEmailSubmit}
            className="w-full"
            disabled={!email.trim()}
          >
            {loading ? 'Checking Registration...' : 'Check My Registration'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BadgeDownloadModal; 