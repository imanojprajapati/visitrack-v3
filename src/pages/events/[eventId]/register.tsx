import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, Input, Button, message, Steps, Form, Typography, Space, Divider, Result, Spin, Alert } from 'antd';
import { MailOutlined, SafetyOutlined, UserOutlined, QrcodeOutlined, DownloadOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { DynamicForm } from '../../../components/DynamicForm';
import { Event } from '../../../types/event';
import { Visitor } from '../../../types/visitor';
import ReactDOM from 'react-dom/client';
import { fetchApi, buildApiUrl } from '../../../utils/api';
import { FormBuilder, FormField, FormTemplate } from '../../../utils/formBuilder';
import { Rule } from 'antd/es/form';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Step } = Steps;

export default function EventRegistration() {
  const router = useRouter();
  const { eventId } = router.query;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!eventId) {
        throw new Error('Event ID is required');
      }

      // Add console log for debugging
      console.log('Fetching event details for ID:', eventId);

      const eventData = await fetchApi(`events/${eventId}`, {
        method: 'GET',
        retries: 3,
        retryDelay: 1000,
      });

      console.log('Event data received:', eventData);

      if (!eventData) {
        throw new Error('Event not found');
      }

      // Validate event data
      if (!eventData.title || !eventData.startDate || !eventData.endDate) {
        console.error('Invalid event data:', eventData);
        throw new Error('Invalid event data: Missing required fields');
      }

      // Validate form data if present
      if (eventData.form) {
        if (!Array.isArray(eventData.form.fields)) {
          console.error('Invalid form structure:', eventData.form);
          throw new Error('Invalid form structure');
        }
      }
      
      setEvent(eventData);
    } catch (error) {
      console.error('Error fetching event:', error);
      setError(error instanceof Error ? error.message : 'Failed to load event details');
      messageApi.error(error instanceof Error ? error.message : 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  useEffect(() => {
    if (currentStep === 2) {
      console.log('Current step:', currentStep);
      console.log('Event data:', event);
      if (event?.form) {
        console.log('Form fields:', event.form.fields);
      } else {
        console.log('No form data available');
      }
    }
  }, [currentStep, event]);

  const handleSendOTP = async (values: { email: string }) => {
    try {
      setLoading(true);
      setError(null);

      // Validate email
      if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        throw new Error('Please enter a valid email address');
      }

      // First check if user is already registered
      const checkResponse = await fetchApi('visitors/check-registration', {
        method: 'POST',
        body: JSON.stringify({ email: values.email, eventId }),
      });
      
      if (checkResponse.isRegistered && checkResponse.visitor) {
        setVisitor(checkResponse.visitor);
        setIsAlreadyRegistered(true);
        setCurrentStep(3); // Move to the final step
        message.info('You are already registered for this event');
        return;
      }

      // If not registered, proceed with OTP
      await fetchApi('auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: values.email }),
      });
      
      setCurrentStep(1);
      message.success('OTP sent to your email');
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process request');
      message.error(error instanceof Error ? error.message : 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (values: { otp: string }) => {
    if (isVerifying || isSubmitting) {
      console.log('Verification already in progress');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      // Get email from form
      const email = form.getFieldValue('email');
      if (!email) {
        form.setFields([{
          name: 'email',
          errors: ['Email is required']
        }]);
        return;
      }

      // Clean and validate OTP
      const cleanOTP = values.otp?.toString().trim() || '';
      if (!cleanOTP) {
        form.setFields([{
          name: 'otp',
          errors: ['Please enter the OTP']
        }]);
        return;
      }

      if (!/^\d{6}$/.test(cleanOTP)) {
        form.setFields([{
          name: 'otp',
          errors: ['Please enter a valid 6-digit OTP']
        }]);
        return;
      }

      // Clear any previous errors
      form.setFields([{
        name: 'otp',
        errors: []
      }]);

      // Verify OTP
      const response = await fetchApi('auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email,
          otp: cleanOTP
        })
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to verify OTP');
      }

      // OTP verification successful
      if (!event?.form) {
        throw new Error('This event has no registration form');
      }

      // Reset form and move to next step
      form.resetFields(['otp']);
      setCurrentStep(2);
      message.success('OTP verified successfully');

    } catch (error) {
      console.error('OTP verification error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify OTP';
      let formError = '';

      if (errorMessage.includes('expired')) {
        formError = 'OTP has expired. Please request a new OTP.';
      } else if (errorMessage.includes('attempts')) {
        formError = 'Too many failed attempts. Please request a new OTP.';
      } else if (errorMessage.includes('Invalid OTP')) {
        formError = 'Invalid OTP. Please try again.';
      } else if (errorMessage.includes('unavailable')) {
        formError = 'Service temporarily unavailable. Please try again.';
      } else {
        formError = 'Failed to verify OTP. Please try again.';
      }

      form.setFields([{
        name: 'otp',
        errors: [formError]
      }]);
      setError(formError);
      message.error(formError);

    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegistration = async (values: any) => {
    if (isSubmitting) {
      console.log('Registration already in progress');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Validate required fields
      if (!event?.form?.fields) {
        throw new Error('Form configuration is missing');
      }

      const email = form.getFieldValue('email');
      if (!email) {
        throw new Error('Email is required');
      }

      // Extract name and phone from form data
      const name = values.name || values.fullName || values.visitorName;
      const phone = values.phone || values.mobile || values.contactNumber;

      if (!name) {
        throw new Error('Name is required');
      }

      // Format form data
      const formData = event.form.fields.reduce((acc, field) => {
        const value = values[field.id];
        
        // Skip empty optional fields
        if (!field.required && (value === undefined || value === '' || value === null)) {
          return acc;
        }

        // Validate required fields
        if (field.required && (value === undefined || value === '' || value === null)) {
          throw new Error(`${field.label} is required`);
        }

        // Format the field value based on type
        let formattedValue = value;
        if (field.type === 'date' && value) {
          formattedValue = dayjs(value).format('YYYY-MM-DD');
        } else if (field.type === 'number' && value) {
          formattedValue = Number(value);
        }

        acc[field.id] = {
          label: field.label,
          value: formattedValue
        };

        return acc;
      }, {} as Record<string, any>);

      // Add source field
      formData.source = {
        label: 'Source',
        value: 'Website'
      };

      // Submit registration
      const response = await fetchApi('visitors/register', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          email,
          name,
          phone: phone || '',
          formData
        })
      });

      if (!response.visitor) {
        throw new Error('Failed to create visitor registration');
      }

      setVisitor(response.visitor);
      setCurrentStep(3);
      message.success('Registration successful');

    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete registration';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to validate MongoDB ObjectId format
  const isValidObjectId = (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // QR Code component with error boundary
  const QRCode: React.FC<{ value: string; size?: number }> = ({ value, size = 200 }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
      return (
        <Result
          status="error"
          title="QR Code Generation Failed"
          subTitle="Unable to generate QR code. Please try again later."
        />
      );
    }

    try {
      return (
        <div style={{ background: '#fff', padding: '20px', textAlign: 'center' }}>
          <QRCodeSVG
            value={value}
            size={size}
            level="L"
            includeMargin={true}
            style={{ display: 'block', margin: '0 auto' }}
            onError={(error) => {
              console.error('QR Code generation error:', error);
              setHasError(true);
            }}
          />
          <div style={{ marginTop: '10px', fontSize: '12px', wordBreak: 'break-all' }}>
            {value}
          </div>
        </div>
      );
    } catch (error) {
      console.error('QR Code render error:', error);
      setHasError(true);
      return null;
    }
  };

  // Helper function to generate QR code data
  const generateQRCodeData = (visitor: Visitor): string => {
    try {
      if (!visitor?._id) {
        throw new Error('Invalid visitor ID');
      }
      // Ensure the ID is a string and trim any whitespace
      const visitorId = visitor._id.toString().trim();
      if (!visitorId) {
        throw new Error('Empty visitor ID');
      }
      return visitorId;
    } catch (error) {
      console.error('Error generating QR code data:', error);
      throw error;
    }
  };

  // Registration details component
  const RegistrationDetails: React.FC<{ visitor: Visitor }> = ({ visitor }) => {
    const [qrError, setQrError] = useState<string | null>(null);
    
    let qrCodeData: string;
    try {
      qrCodeData = generateQRCodeData(visitor);
    } catch (error) {
      setQrError(error instanceof Error ? error.message : 'Failed to generate QR code');
      qrCodeData = '';
    }

    return (
      <div className="mb-8 text-left">
        <Title level={4}>Registration Details</Title>
        <Divider />
        {qrError ? (
          <Result
            status="error"
            title="Error Generating QR Code"
            subTitle={qrError}
          />
        ) : (
          <div className="mb-8">
            <QRCode value={qrCodeData} />
          </div>
        )}
        <Space direction="vertical" size="small" style={{ width: '100%' }} className="p-4 bg-gray-50 rounded-lg">
          <div>
            <Text type="secondary">Name</Text>
            <div><Text strong>{visitor.name}</Text></div>
          </div>
          <div>
            <Text type="secondary">Email</Text>
            <div><Text strong>{visitor.email}</Text></div>
          </div>
          <div>
            <Text type="secondary">Phone</Text>
            <div><Text strong>{visitor.phone}</Text></div>
          </div>
          <div>
            <Text type="secondary">Event</Text>
            <div><Text strong>{visitor.eventName}</Text></div>
          </div>
          <div>
            <Text type="secondary">Location</Text>
            <div><Text strong>{visitor.eventLocation}</Text></div>
          </div>
          <div>
            <Text type="secondary">Event Date</Text>
            <div><Text strong>{formatDate(visitor.eventStartDate)}</Text></div>
          </div>
          <div>
            <Text type="secondary">Registration Date</Text>
            <div><Text strong>{formatDateTime(visitor.createdAt)}</Text></div>
          </div>
        </Space>
      </div>
    );
  };

  const handleDownloadQR = async () => {
    if (!visitor) return;

    try {
      const qrCodeData = generateQRCodeData(visitor);
      if (!qrCodeData) {
        throw new Error('Failed to generate QR code data');
      }

      // Create a temporary div to render QR code
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '240px';
      tempDiv.style.height = '280px';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.background = '#ffffff';
      tempDiv.style.padding = '20px';
      document.body.appendChild(tempDiv);

      // Create QR code container
      const qrContainer = document.createElement('div');
      qrContainer.id = 'qr-code-container';
      tempDiv.appendChild(qrContainer);

      // Create a promise that resolves when the QR code is rendered
      const qrCodePromise = new Promise<HTMLCanvasElement>((resolve, reject) => {
        try {
          // Render QR code using ReactDOM
          const root = ReactDOM.createRoot(qrContainer);
          root.render(
            <QRCode value={qrCodeData} />
          );

          // Wait for QR code to render
          setTimeout(() => {
            const svg = qrContainer.querySelector('svg');
            if (!svg) {
              reject(new Error('QR code SVG not found'));
              return;
            }

            // Convert SVG to canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 240;
            canvas.height = 280;

            // Create a blob URL for the SVG
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);

            // Create an image from the SVG
            const img = new Image();
            img.onload = () => {
              if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 20, 20, 200, 200);
                
                // Add the QR code text
                ctx.fillStyle = '#000000';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(qrCodeData, canvas.width / 2, 250);
              }
              URL.revokeObjectURL(svgUrl);
              resolve(canvas);
            };
            img.onerror = () => {
              URL.revokeObjectURL(svgUrl);
              reject(new Error('Failed to load QR code image'));
            };
            img.src = svgUrl;
          }, 100);
        } catch (error) {
          reject(error);
        }
      });

      // Wait for QR code to be rendered and converted to canvas
      const canvas = await qrCodePromise;

      // Create download link
      const link = document.createElement('a');
      link.download = `visitrack-qr-${visitor.name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // Cleanup
      document.body.removeChild(tempDiv);
      message.success('QR code downloaded successfully');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      message.error('Failed to download QR code');
    }
  };

  const handleDownloadPDF = async () => {
    if (!visitor || !event) return;
    try {
      // Fetch badge template for this event
      const templates = await fetchApi(`badge-templates?eventId=${event._id}`);
      if (!Array.isArray(templates) || templates.length === 0) {
        message.error('No badge template found for this event.');
        return;
      }
      const templateId = templates[0]._id;

      // Prepare visitor data with IDs
      const visitorData = {
        ...visitor,
        visitorId: visitor._id,
        eventId: event._id,
        eventDate: formatDate(visitor.eventStartDate),
        registrationDate: formatDateTime(visitor.createdAt)
      };

      // Use fetchApi to get the PDF blob directly
      const pdfBlob = await fetchApi('badge-templates/download', {
        method: 'POST',
        body: JSON.stringify({
          templateId,
          visitorData
        })
      });

      // Create download link for the blob
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `visitrack-badge-${visitor.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('Badge downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      message.error(error instanceof Error ? error.message : 'Failed to download PDF');
    }
  };

  const handlePrint = () => {
    // Implementation for printing the badge
    console.log('Printing badge');
  };

  // Helper function to format dates
  const formatDate = (dateString: string | Date | undefined): string => {
    try {
      if (!dateString) return 'Not specified';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Not specified';
      }
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Not specified';
    }
  };

  // Helper function to format date time
  const formatDateTime = (dateString: string | Date | undefined): string => {
    try {
      if (!dateString) return 'Not specified';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Not specified';
      }
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(',', '');
    } catch (error) {
      console.error('Error formatting date time:', error);
      return 'Not specified';
    }
  };

  const renderStepContent = () => {
    if (!event) {
      return null;
    }

    switch (currentStep) {
      case 0:
        return (
          <div className="flex justify-center items-center">
            <Form
              form={form}
              onFinish={handleSendOTP}
              layout="vertical"
              className="w-full max-w-sm"
            >
              <Form.Item
                name="email"
                label={<div className="text-center">Email</div>}
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Enter your email" />
              </Form.Item>
              <Form.Item className="text-center">
                <Button type="primary" htmlType="submit" loading={loading} block>
                  Send OTP
                </Button>
              </Form.Item>
            </Form>
          </div>
        );

      case 1:
        return (
          <div className="flex justify-center items-center">
            <Form
              form={form}
              onFinish={handleVerifyOTP}
              layout="vertical"
              className="w-full max-w-sm"
            >
              <Form.Item
                name="otp"
                label={<div className="text-center">Enter OTP</div>}
                rules={[
                  { required: true, message: 'Please enter the OTP' },
                  { 
                    pattern: /^\d{6}$/,
                    message: 'Please enter a valid 6-digit OTP'
                  }
                ]}
              >
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  autoComplete="one-time-code"
                  disabled={isVerifying}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    if (value && !/^\d{6}$/.test(value)) {
                      form.setFields([{
                        name: 'otp',
                        errors: ['Please enter a valid 6-digit OTP']
                      }]);
                    } else {
                      form.setFields([{
                        name: 'otp',
                        errors: []
                      }]);
                    }
                  }}
                />
              </Form.Item>

              <Form.Item className="text-center">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isVerifying}
                  block
                  disabled={isVerifying}
                >
                  {isVerifying ? 'Verifying...' : 'Verify OTP'}
                </Button>
              </Form.Item>

              <div className="text-center">
                <Button
                  type="link"
                  onClick={() => {
                    form.resetFields(['otp']);
                    setCurrentStep(0);
                  }}
                  disabled={isVerifying}
                >
                  Back to Email
                </Button>
              </div>
            </Form>
          </div>
        );

      case 2:
        if (!event.form) {
          return (
            <Result
              status="error"
              title="Form not found"
              subTitle="The registration form for this event is not available."
            />
          );
        }

        // Create form template from event form fields
        const template: FormTemplate = {
          id: 'registration-form',
          name: 'Registration Form',
          description: 'Please fill in your details',
          fields: event.form.fields
            .filter(field => field.id !== 'source')
            .map(field => {
              let fieldType: FormField['type'] = 'text';
              const fieldTypeStr = field.type as string;
              
              switch (fieldTypeStr) {
                case 'phone':
                case 'tel':
                  fieldType = 'phone';
                  break;
                case 'textarea':
                  fieldType = 'textarea';
                  break;
                case 'number':
                  fieldType = 'number';
                  break;
                case 'email':
                  fieldType = 'email';
                  break;
                case 'date':
                  fieldType = 'date';
                  break;
                case 'select':
                  fieldType = 'select';
                  break;
                default:
                  fieldType = 'text';
              }

              return {
                id: field.id,
                label: field.label,
                type: fieldType,
                required: field.required,
                placeholder: field.placeholder,
                options: field.options ? field.options.map(opt => ({
                  label: String(opt),
                  value: String(opt)
                })) : undefined,
                validation: field.validation ? [
                  ...(field.validation.min !== undefined ? [{
                    type: 'number' as const,
                    min: field.validation.min,
                    message: `Minimum value is ${field.validation.min}`
                  }] : []),
                  ...(field.validation.max !== undefined ? [{
                    type: 'number' as const,
                    max: field.validation.max,
                    message: `Maximum value is ${field.validation.max}`
                  }] : []),
                  ...(field.validation.pattern ? [{
                    pattern: new RegExp(field.validation.pattern),
                    message: 'Invalid format'
                  }] : [])
                ] : []
              };
            })
        };

        return (
          <div className="max-w-2xl mx-auto">
            <Form
              form={form}
              onFinish={handleRegistration}
              layout="vertical"
              className="registration-form"
            >
              <DynamicForm
                template={template}
                onFinish={handleRegistration}
                onFinishFailed={(errorInfo) => {
                  console.error('Form validation failed:', errorInfo);
                  message.error('Please fill in all required fields correctly');
                }}
              />
              
              <div className="text-center mt-6 space-x-4">
                <Button
                  type="default"
                  onClick={() => {
                    form.resetFields();
                    setCurrentStep(1);
                  }}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  onClick={() => {
                    if (!isSubmitting) {
                      form.validateFields()
                        .then(values => {
                          handleRegistration(values);
                        })
                        .catch(errorInfo => {
                          console.error('Form validation failed:', errorInfo);
                          message.error('Please fill in all required fields correctly');
                        });
                    }
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                </Button>
              </div>
            </Form>
          </div>
        );

      case 3:
        if (!visitor) {
          return (
            <Result
              status="error"
              title="Visitor information not found"
              subTitle="Please try registering again."
            />
          );
        }
        return (
          <div className="text-center">
            <Result
              status="success"
              title="Registration Successful!"
              subTitle={`You have successfully registered for ${event.title}`}
            />
            <div className="mt-8">
              <QRCodeSVG value={generateQRCodeData(visitor)} size={200} />
            </div>
            <div className="mt-4">
              <Space>
                <Button type="primary" onClick={handleDownloadQR}>
                  <DownloadOutlined /> Download QR Code
                </Button>
                <Button onClick={handleDownloadPDF}>
                  <DownloadOutlined /> Download PDF
                </Button>
              </Space>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <Result
              status="error"
              title="Failed to load event"
              subTitle={error}
              extra={[
                <Button
                  key="retry"
                  type="primary"
                  onClick={() => {
                    setError(null);
                    if (eventId) {
                      fetchEventDetails();
                    }
                  }}
                >
                  Try Again
                </Button>
              ]}
            />
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <div className="text-center">
              <Spin size="large" />
              <div className="mt-4">Loading...</div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <Result
              status="404"
              title="Event not found"
              subTitle="The event you are looking for does not exist."
            />
          </Card>
        </div>
      </div>
    );
  }

  if (isAlreadyRegistered && visitor && event) {
    const eventTitle = event?.title || 'Event';
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Head>
          <title>Already Registered - {eventTitle}</title>
        </Head>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <Result
              status="info"
              title="Already Registered"
              subTitle={`You have already registered for ${eventTitle}`}
              icon={<SafetyOutlined style={{ color: '#1890ff' }} />}
              extra={[
                <div key="details" className="text-center">
                  <div className="mb-8">
                    <Title level={4}>Your QR Code</Title>
                    <div className="my-6 p-4 bg-white rounded-lg shadow-sm inline-block">
                      <QRCode value={visitor._id} size={200} />
                    </div>
                  </div>
                  
                  <div className="mb-8 text-left">
                    <Title level={4}>Registration Details</Title>
                    <Divider />
                    <Space direction="vertical" size="middle" style={{ width: '100%' }} className="p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Text type="secondary">Name</Text>
                        <div><Text strong>{visitor.name}</Text></div>
                      </div>
                      <div>
                        <Text type="secondary">Email</Text>
                        <div><Text strong>{visitor.email}</Text></div>
                      </div>
                      <div>
                        <Text type="secondary">Phone</Text>
                        <div><Text strong>{visitor.phone}</Text></div>
                      </div>
                      <div>
                        <Text type="secondary">Event</Text>
                        <div><Text strong>{visitor.eventName}</Text></div>
                      </div>
                      <div>
                        <Text type="secondary">Location</Text>
                        <div><Text strong>{visitor.eventLocation}</Text></div>
                      </div>
                      <div>
                        <Text type="secondary">Event Date</Text>
                        <div><Text strong>{new Date(visitor.eventStartDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}</Text></div>
                      </div>
                      <div>
                        <Text type="secondary">Registration Date</Text>
                        <div><Text strong>{new Date(visitor.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }).replace(',', '')}</Text></div>
                      </div>
                      {visitor.company && (
                        <div>
                          <Text type="secondary">Company</Text>
                          <div><Text strong>{visitor.company}</Text></div>
                        </div>
                      )}
                    </Space>
                  </div>
                  
                  <Space size="middle">
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadQR}
                      size="large"
                    >
                      Download QR Code
                    </Button>
                    <Button
                      type="default"
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadPDF}
                      size="large"
                    >
                      Download Badge
                    </Button>
                  </Space>
                </div>
              ]}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Head>
        <title>Register - {event.title}</title>
      </Head>
      {contextHolder}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <div className="text-center mb-8">
            <Title level={2}>{event.title}</Title>
            <Text type="secondary">
              {formatDate(event.startDate)} - {formatDate(event.endDate)}
            </Text>
          </div>

          <Steps current={currentStep} className="mb-8">
            <Step title="Email" icon={<MailOutlined />} />
            <Step title="Verify" icon={<SafetyOutlined />} />
            <Step title="Details" icon={<UserOutlined />} />
            <Step title="Complete" icon={<QrcodeOutlined />} />
          </Steps>

          {error && (
            <div className="mb-4">
              <Alert message={error} type="error" showIcon />
            </div>
          )}

          {renderStepContent()}
        </Card>
      </div>
    </div>
  );
}