import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, Input, Button, message, Steps, Form, Typography, Space, Divider, Result } from 'antd';
import { MailOutlined, SafetyOutlined, UserOutlined, QrcodeOutlined, DownloadOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { DynamicForm } from '../../../components/DynamicForm';
import { Event } from '../../../types/event';
import { Visitor } from '../../../types/visitor';
import ReactDOM from 'react-dom/client';
import { fetchApi, buildApiUrl } from '../../../utils/api';
import { FormBuilder, FormField } from '../../../utils/formBuilder';
import { Rule } from 'antd/es/form';

const { Title, Text } = Typography;
const { Step } = Steps;

export default function EventRegistration() {
  const router = useRouter();
  const { eventId } = router.query;
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

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

  const fetchEventDetails = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to load event details' }));
        throw new Error(errorData.message || 'Failed to load event details');
      }
      
      const data = await response.json();
      console.log('Event data received:', data);
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid event data received');
      }

      if (!data.form) {
        console.error('No form data in event response');
        message.error('This event has no registration form');
        return;
      }

      // Validate form data structure
      if (!Array.isArray(data.form.fields)) {
        console.error('Invalid form fields data:', data.form);
        throw new Error('Invalid form structure');
      }

      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      message.error(error instanceof Error ? error.message : 'Failed to load event details');
    }
  };

  const handleSendOTP = async (values: { email: string }) => {
    setLoading(true);
    try {
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
      message.error(error instanceof Error ? error.message : 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (values: { otp: string }) => {
    setLoading(true);
    try {
      const email = form.getFieldValue('email');
      const response = await fetchApi('auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email,
          otp: values.otp,
        }),
      });

      if (!event?.form) {
        console.error('No form data available for event:', event);
        message.error('This event has no registration form');
        return;
      }
      setCurrentStep(2);
      message.success('OTP verified successfully');
    } catch (error) {
      console.error('Error in OTP verification:', error);
      if (error instanceof Error) {
        if (error.message.includes('No valid OTP found')) {
          message.error('OTP has expired. Please request a new OTP.');
        } else if (error.message.includes('Too many failed attempts')) {
          message.error('Too many failed attempts. Please request a new OTP.');
        } else if (error.message.includes('Invalid OTP')) {
          message.error('Invalid OTP. Please try again.');
        } else {
          message.error(error.message);
        }
      } else {
        message.error('Failed to verify OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async (values: any) => {
    setLoading(true);
    try {
      // Validate required fields
      if (!event?.form?.fields) {
        throw new Error('Form configuration is missing');
      }

      // Format form data to match the expected structure
      const formData = event.form.fields.reduce((acc, field) => {
        const value = values[field.id];
        
        // Skip empty optional fields
        if (!field.required && (value === undefined || value === '')) {
          return acc;
        }

        // Validate required fields
        if (field.required && (value === undefined || value === '')) {
          throw new Error(`${field.label} is required`);
        }

        // Format the field value
        acc[field.id] = {
          label: field.label,
          value: value
        };

        return acc;
      }, {} as Record<string, any>);

      // Ensure source field exists
      formData.source = {
        label: 'Source',
        value: 'Website'
      };

      // Extract name and phone from form data
      const name = formData.name?.value || '';
      const phone = formData.phone?.value || '';

      const response = await fetch('/api/visitors/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          name,
          email: form.getFieldValue('email'),
          phone,
          formData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      
      setVisitor(data.visitor);
      setCurrentStep(3);
      
      // Refresh event data to get updated visitor count
      await fetchEventDetails();
      
      message.success('Registration successful!');
    } catch (error) {
      console.error('Error:', error);
      message.error(error instanceof Error ? error.message : 'Failed to complete registration');
    } finally {
      setLoading(false);
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

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
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

  if (currentStep === 3 && visitor && event) {
    const eventTitle = event?.title || 'Event';
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Head>
          <title>Registration Successful - {eventTitle}</title>
        </Head>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <Result
              status="success"
              title="Registration Successful"
              subTitle={`You have successfully registered for ${eventTitle}`}
              extra={[
                <div key="qr" className="text-center">
                  <RegistrationDetails visitor={visitor} />
                  <Space>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadQR}
                      size="large"
                    >
                      Download QR Code
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadPDF}
                      type="primary"
                      size="large"
                    >
                      Download PDF
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

  // Registration form
  if (currentStep === 2 && event?.form) {
    const template = FormBuilder.createTemplate(
      'Registration Form',
      event.form.fields.map(field => {
        // Convert validation object to antd Rule array
        const validation: Rule[] = [];
        if (field.validation) {
          if (field.validation.min !== undefined) {
            validation.push({ type: 'number', min: field.validation.min, message: `Minimum value is ${field.validation.min}` });
          }
          if (field.validation.max !== undefined) {
            validation.push({ type: 'number', max: field.validation.max, message: `Maximum value is ${field.validation.max}` });
          }
          if (field.validation.pattern) {
            validation.push({ pattern: new RegExp(field.validation.pattern), message: 'Invalid format' });
          }
        }

        return {
          id: field.id,
          label: field.label,
          type: field.type === 'tel' ? 'phone' : field.type === 'textarea' ? 'text' : field.type as FormField['type'],
          required: field.required || false,
          validation: validation.length > 0 ? validation : undefined,
          placeholder: field.placeholder,
          options: field.options?.map(opt => ({ label: opt.label, value: opt.value }))
        };
      }),
      'Event registration form'
    );

    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Head>
          <title>Register for {event?.title || 'Event'} - Visitrack</title>
        </Head>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <div className="text-center mb-8">
              <Title level={2}>{event.title}</Title>
              <Text type="secondary">{event.description}</Text>
              <div className="mt-4">
                <Text type="secondary">
                  Location: {event.location} | 
                  Date: {new Date(event.startDate).toLocaleDateString()} | 
                  Capacity: {event.visitors}/{event.capacity}
                </Text>
              </div>
            </div>

            <Steps current={currentStep} className="mb-8">
              <Step title="Email" icon={<MailOutlined />} />
              <Step title="Verify" icon={<SafetyOutlined />} />
              <Step title="Register" icon={<UserOutlined />} />
              <Step title="QR Code" icon={<QrcodeOutlined />} />
            </Steps>

            <DynamicForm
              template={template}
              onFinish={handleRegistration}
              onFinishFailed={(errorInfo) => {
                console.error('Form validation failed:', errorInfo);
                message.error('Please fill in all required fields correctly');
              }}
            />
          </Card>
        </div>
      </div>
    );
  }

  // Email form
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Head>
          <title>Register for {event?.title || 'Event'} - Visitrack</title>
        </Head>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <div className="text-center mb-8">
              <Title level={2}>{event?.title || 'Event Registration'}</Title>
              <Text type="secondary">{event?.description}</Text>
              {event && (
                <div className="mt-4">
                  <Text type="secondary">
                    Location: {event.location} | 
                    Date: {new Date(event.startDate).toLocaleDateString()} | 
                    Capacity: {event.visitors}/{event.capacity}
                  </Text>
                </div>
              )}
            </div>

            <Steps current={currentStep} className="mb-8">
              <Step title="Email" icon={<MailOutlined />} />
              <Step title="Verify" icon={<SafetyOutlined />} />
              <Step title="Register" icon={<UserOutlined />} />
              <Step title="QR Code" icon={<QrcodeOutlined />} />
            </Steps>

            <Form form={form} onFinish={handleSendOTP} layout="vertical">
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Enter your email" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  Send OTP
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </div>
    );
  }

  // OTP verification form
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Head>
          <title>Verify OTP - Visitrack</title>
        </Head>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <div className="text-center mb-8">
              <Title level={2}>Verify OTP</Title>
              <Text type="secondary">
                Please enter the OTP sent to your email: {form.getFieldValue('email')}
              </Text>
            </div>

            <Steps current={currentStep} className="mb-8">
              <Step title="Email" icon={<MailOutlined />} />
              <Step title="Verify" icon={<SafetyOutlined />} />
              <Step title="Register" icon={<UserOutlined />} />
              <Step title="QR Code" icon={<QrcodeOutlined />} />
            </Steps>

            <Form form={form} onFinish={handleVerifyOTP} layout="vertical">
              <Form.Item
                name="otp"
                label="OTP"
                rules={[
                  { required: true, message: 'Please enter the OTP' },
                  { pattern: /^\d{6}$/, message: 'OTP must be 6 digits' }
                ]}
              >
                <Input placeholder="Enter 6-digit OTP" maxLength={6} />
              </Form.Item>

              <Form.Item>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button type="primary" htmlType="submit" loading={loading} block>
                    Verify OTP
                  </Button>
                  <Button 
                    type="link" 
                    onClick={() => setCurrentStep(0)} 
                    block
                  >
                    Back to Email
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </div>
    );
  }

  // Loading or error state
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Head>
        <title>Loading - Visitrack</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <div className="text-center">
            <Title level={2}>Loading...</Title>
            <Text type="secondary">Please wait while we load the event details.</Text>
          </div>
        </Card>
      </div>
    </div>
  );
} 