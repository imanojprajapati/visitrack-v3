import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Space, Table, Tag, Modal, message, Select } from 'antd';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { PrinterOutlined, QrcodeOutlined } from '@ant-design/icons';
import AdminLayout from './layout';
import dayjs from 'dayjs';

interface VisitorEntry {
  visitorId: string;
  name: string;
  company: string;
  designation: string;
  email: string;
  phone: string;
  eventName: string;
  status: string;
  scanTime: string;
  entryType: string;
}

interface VisitorData {
  _id?: string;
  id?: string;
  visitorId?: string;
  eventId?: string;
  registrationId?: string;
  name: string;
  company: string;
  designation: string;
  email: string;
  phone: string;
  eventName: string;
  status: string;
}

interface QRScan {
  visitorId: string;
  eventId?: string;
  registrationId?: string;
  name?: string;
  company?: string;
  eventName?: string;
  scanTime: string;
  entryType: 'QR' | 'Manual';
  status: 'success' | 'failed' | 'Visited';
  deviceInfo?: string;
  error?: string;
}

const QRScanner: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedVisitors, setScannedVisitors] = useState<VisitorEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const badgeRef = useRef<HTMLDivElement>(null);
  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualVisitorId, setManualVisitorId] = useState('');
  // QR scanner state
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  // Print loading state for individual buttons
  const [printingVisitors, setPrintingVisitors] = useState<Set<string>>(new Set());

  // Initialize QR scanner when modal opens
  useEffect(() => {
    if (showScanner && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          disableFlip: false 
        },
        false
      );
      
      scanner.render((decodedText) => {
        if (!isProcessingScan) {
          handleQrCodeScan(decodedText);
        }
      }, (error) => {
        console.error('QR Scan error:', error);
      });
      
      scannerRef.current = scanner;
    }

    // Cleanup scanner when modal closes
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [showScanner, isProcessingScan]);

  // Cleanup scanner when component unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  // Fetch scanned visitors on component mount
  useEffect(() => {
    const fetchScannedVisitors = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/qrscans');
        if (!response.ok) {
          throw new Error('Failed to fetch scanned visitors');
        }
        const data = await response.json();
        // Map scanTime to a readable format if needed
        const visitors = data.map((scan: any) => ({
          visitorId: scan.visitorId || scan._id,
          name: scan.name || 'Unknown',
          company: scan.company || '',
          designation: scan.designation || '',
          email: scan.email || '',
          phone: scan.phone || '',
          eventName: scan.eventName || 'Unknown Event',
          status: scan.status || 'Unknown',
          scanTime: scan.scanTime?.$date?.$numberLong
            ? Number(scan.scanTime.$date.$numberLong)
            : scan.scanTime,
          entryType: scan.entryType || 'unknown',
        }));
        setScannedVisitors(visitors);
        setPagination(prev => ({
          ...prev,
          total: visitors.length,
        }));
      } catch (error) {
        console.error('Error fetching scanned visitors:', error);
        messageApi.error('Failed to load scanned visitors');
      } finally {
        setLoading(false);
      }
    };
    fetchScannedVisitors();
  }, [messageApi]);

  const handleQrCodeScan = async (qrData: string) => {
    try {
      // Prevent duplicate processing
      if (isProcessingScan) {
        return;
      }

      // Extract visitor ID from QR code
      const visitorId = qrData.trim();
      if (!visitorId) {
        throw new Error('Invalid QR code data');
      }

      // Validate that the visitor ID looks like a valid MongoDB ObjectId
      const objectIdPattern = /^[0-9a-fA-F]{24}$/;
      if (!objectIdPattern.test(visitorId)) {
        throw new Error('Invalid visitor ID format. Please scan a valid QR code.');
      }

      setIsProcessingScan(true);

      // Show the scanned ID in a popup
      Modal.info({
        title: 'QR Code Scanned',
        content: (
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">Visitor ID:</p>
            <p className="text-2xl font-mono bg-gray-100 p-2 rounded">{visitorId}</p>
            <p className="text-sm text-gray-600 mt-2">Click "Process" to check in this visitor</p>
          </div>
        ),
        okText: 'Process',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            setLoading(true);
            
            // First check if visitor already exists in qrscans collection
            const scanCheckResponse = await fetch(`/api/qrscans/check-visitor?visitorId=${visitorId}`);
            if (!scanCheckResponse.ok) {
              throw new Error('Failed to check visitor scan status');
            }
            
            const scanCheckData = await scanCheckResponse.json();
            
            if (scanCheckData.exists) {
              // Visitor already exists in qrscans collection
              const existingScan = scanCheckData.scan;
              const scanTime = new Date(existingScan.scanTime).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              
              Modal.warning({
                title: 'Visitor Already Checked In',
                content: (
                  <div className="text-center">
                    <p className="text-lg font-semibold mb-2">{existingScan.name}</p>
                    <p className="text-sm text-gray-600 mb-2">Company: {existingScan.company}</p>
                    <p className="text-sm text-gray-600 mb-2">Event: {existingScan.eventName}</p>
                    <p className="text-sm text-gray-600 mb-2">Entry Type: {existingScan.entryType}</p>
                    <p className="text-sm text-gray-600 mb-2">Check-in Time: {scanTime}</p>
                    <p className="text-sm text-red-600 font-semibold">This visitor has already been checked in!</p>
                  </div>
                ),
                okText: 'OK',
                onOk: () => {
                  setIsProcessingScan(false);
                }
              });
              return;
            }

            // If visitor doesn't exist in qrscans, proceed with normal check-in process
            // First check if visitor exists in visitors collection
            const response = await fetch(`/api/visitors/${visitorId}`);
            if (!response.ok) {
              let errorMessage = 'Visitor not found.';
              try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
              } catch (parseError) {
                console.error('Failed to parse error response:', parseError);
                if (response.status === 500) {
                  errorMessage = 'Server error occurred while fetching visitor data.';
                } else if (response.status === 404) {
                  errorMessage = 'Visitor not found with the provided ID.';
                }
              }
              throw new Error(errorMessage);
            }
            
            let responseData;
            try {
              responseData = await response.json();
            } catch (parseError) {
              console.error('Failed to parse visitor response:', parseError);
              throw new Error('Invalid response format from server.');
            }
            
            const visitorData = responseData.visitor || responseData; // Handle both response formats

            // Check if visitor is already visited
            if (visitorData.status === 'Visited') {
              messageApi.warning('Visitor has already been checked in');
              return;
            }

            // Create scan record
            const scanData: QRScan = {
              visitorId: visitorData._id || visitorData.id || visitorId,
              eventId: visitorData.eventId,
              registrationId: visitorData.registrationId,
              name: visitorData.name,
              company: visitorData.company,
              eventName: visitorData.eventName,
              scanTime: new Date().toISOString(),
              entryType: 'QR',
              status: 'Visited',
              deviceInfo: navigator.userAgent
            };

            // Store scan data
            const scanResponse = await fetch('/api/qrscans', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(scanData),
            });

            if (!scanResponse.ok) {
              const errorData = await scanResponse.json();
              throw new Error(errorData.message || 'Failed to record scan data');
            }

            // Update visitor status to Visited
            const updateResponse = await fetch(`/api/visitors/${visitorId}/check-in`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'Visited',
                checkInTime: new Date().toISOString()
              }),
            });

            if (!updateResponse.ok) {
              const errorData = await updateResponse.json();
              // If visitor update fails, update scan record status
              await fetch(`/api/qrscans/${scanData.visitorId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'failed',
                  error: 'Failed to update visitor status'
                }),
              });
              throw new Error(errorData.message || 'Failed to update visitor status');
            }

            // Add to scanned visitors list with updated status
            const newEntry: VisitorEntry = {
              visitorId: visitorData._id || visitorData.id || visitorId,
              name: visitorData.name,
              company: visitorData.company,
              designation: visitorData.designation || '',
              email: visitorData.email || '',
              phone: visitorData.phone || '',
              eventName: visitorData.eventName,
              status: 'Visited',
              scanTime: scanData.scanTime,
              entryType: scanData.entryType
            };

            setScannedVisitors(prev => [newEntry, ...prev]);
            messageApi.success(`Visitor ${visitorData.name} checked in successfully`);
            setShowScanner(false);
          } catch (error) {
            console.error('Error processing visitor:', error);
            messageApi.error(error instanceof Error ? error.message : 'Failed to process visitor');
          } finally {
            setLoading(false);
            setIsProcessingScan(false);
          }
        },
        onCancel: () => {
          setIsProcessingScan(false);
        }
      });
    } catch (error) {
      console.error('Error scanning QR code:', error);
      messageApi.error(error instanceof Error ? error.message : 'Failed to process QR code');
      setIsProcessingScan(false);
    }
  };

  const processQRData = async (visitorData: VisitorData) => {
    try {
      // First, create a QR scan record
      const scanData: QRScan = {
        visitorId: visitorData._id || visitorData.id || visitorData.visitorId || '',
        eventId: visitorData.eventId,
        registrationId: visitorData.registrationId,
        name: visitorData.name,
        company: visitorData.company,
        eventName: visitorData.eventName,
        scanTime: new Date().toISOString(),
        entryType: 'QR',
        status: 'Visited',
        deviceInfo: navigator.userAgent
      };

      // Store scan data in qrscans collection
      const scanResponse = await fetch('/api/qrscans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scanData),
      });

      if (!scanResponse.ok) {
        throw new Error('Failed to record scan data');
      }

      // Update visitor status to Visited
      const updateResponse = await fetch(`/api/visitors/${scanData.visitorId}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Visited',
          checkInTime: new Date().toISOString()
        }),
      });

      if (!updateResponse.ok) {
        // If visitor update fails, update scan record status
        await fetch(`/api/qrscans/${scanData.visitorId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'failed',
            error: 'Failed to update visitor status'
          }),
        });
        throw new Error('Failed to update visitor status');
      }

      // Add to scanned visitors list
      const newEntry: VisitorEntry = {
        visitorId: visitorData._id || visitorData.id || visitorData.visitorId || '',
        name: visitorData.name,
        company: visitorData.company,
        designation: visitorData.designation || '',
        email: visitorData.email || '',
        phone: visitorData.phone || '',
        eventName: visitorData.eventName,
        status: 'Visited',
        scanTime: scanData.scanTime,
        entryType: scanData.entryType
      };

      setScannedVisitors(prev => [newEntry, ...prev]);
      messageApi.success('Visitor checked in successfully');
    } catch (error) {
      console.error('Error processing QR data:', error);
      messageApi.error(error instanceof Error ? error.message : 'Failed to process visitor data');
      throw error;
    }
  };

  const handlePrint = async (visitor: VisitorEntry) => {
    try {
      // Set loading state for this specific visitor
      setPrintingVisitors(prev => new Set(prev).add(visitor.visitorId));
      
      // Call the API to generate and download the badge PDF
      const response = await fetch('/api/visitors/print-badge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: visitor.visitorId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate badge');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `badge-${visitor.visitorId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('Badge downloaded successfully!');
    } catch (error) {
      console.error('Error generating badge:', error);
      message.error(error instanceof Error ? error.message : 'Failed to generate badge');
    } finally {
      // Clear loading state for this specific visitor
      setPrintingVisitors(prev => {
        const newSet = new Set(prev);
        newSet.delete(visitor.visitorId);
        return newSet;
      });
    }
  };

  // Manual entry handler
  const handleManualEntry = async () => {
    if (!manualVisitorId.trim()) {
      messageApi.error('Please enter a visitor ID');
      return;
    }
    try {
      setLoading(true);
      
      // First check if visitor already exists in qrscans collection
      const scanCheckResponse = await fetch(`/api/qrscans/check-visitor?visitorId=${manualVisitorId.trim()}`);
      if (!scanCheckResponse.ok) {
        throw new Error('Failed to check visitor scan status');
      }
      
      const scanCheckData = await scanCheckResponse.json();
      
      if (scanCheckData.exists) {
        // Visitor already exists in qrscans collection
        const existingScan = scanCheckData.scan;
        const scanTime = new Date(existingScan.scanTime).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        
        Modal.warning({
          title: 'Visitor Already Checked In',
          content: (
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">{existingScan.name}</p>
              <p className="text-sm text-gray-600 mb-2">Company: {existingScan.company}</p>
              <p className="text-sm text-gray-600 mb-2">Event: {existingScan.eventName}</p>
              <p className="text-sm text-gray-600 mb-2">Entry Type: {existingScan.entryType}</p>
              <p className="text-sm text-gray-600 mb-2">Check-in Time: {scanTime}</p>
              <p className="text-sm text-red-600 font-semibold">This visitor has already been checked in!</p>
            </div>
          ),
          okText: 'OK',
          onOk: () => {
            setManualVisitorId('');
            setShowManualEntry(false);
          }
        });
        return;
      }
      
      // 1. First fetch visitor data to verify it exists
      const visitorRes = await fetch(`/api/visitors/${manualVisitorId.trim()}`);
      if (!visitorRes.ok) {
        let errorMessage = 'Visitor not found.';
        try {
          const errorData = await visitorRes.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          if (visitorRes.status === 500) {
            errorMessage = 'Server error occurred while fetching visitor data.';
          } else if (visitorRes.status === 404) {
            errorMessage = 'Visitor not found with the provided ID.';
          }
        }
        throw new Error(errorMessage);
      }
      
      let responseData;
      try {
        responseData = await visitorRes.json();
      } catch (parseError) {
        console.error('Failed to parse visitor response:', parseError);
        throw new Error('Invalid response format from server.');
      }
      
      const visitorData = responseData.visitor || responseData; // Handle both response formats

      // 2. Update visitor status to 'Visited'
      const updateRes = await fetch(`/api/visitors/${manualVisitorId.trim()}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Visited', checkInTime: new Date().toISOString() }),
      });
      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.message || 'Failed to update visitor status.');
      }

      // 3. Add record to qrscans collection using the comprehensive API
      const now = new Date().toISOString();
      
      const scanData = {
        visitorId: visitorData._id || visitorData.id || manualVisitorId.trim(),
        eventId: visitorData.eventId,
        registrationId: visitorData.registrationId,
        name: visitorData.name,
        company: visitorData.company,
        eventName: visitorData.eventName,
        scanTime: now,
        entryType: 'Manual' as const,
        status: 'Visited',
        deviceInfo: navigator.userAgent
      };

      const scanRes = await fetch('/api/qrscans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scanData),
      });
      
      if (!scanRes.ok) {
        const err = await scanRes.json();
        throw new Error(err.message || 'Failed to insert scan record.');
      }

      // 4. Add to scanned visitors list for immediate display
      const newEntry: VisitorEntry = {
        visitorId: visitorData._id || visitorData.id || manualVisitorId.trim(),
        name: visitorData.name,
        company: visitorData.company,
        designation: visitorData.designation || '',
        email: visitorData.email || '',
        phone: visitorData.phone || '',
        eventName: visitorData.eventName,
        status: 'Visited',
        scanTime: now,
        entryType: 'Manual'
      };

      setScannedVisitors(prev => [newEntry, ...prev]);
      
      messageApi.success('Manual entry recorded successfully.');
      setManualVisitorId('');
      setShowManualEntry(false);
    } catch (error) {
      console.error('Error recording manual entry:', error);
      messageApi.error(error instanceof Error ? error.message : 'Failed to record manual entry.');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (paginationConfig: any) => {
    console.log('QR Scanner table pagination changed:', paginationConfig);
    setPagination({
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
      total: scannedVisitors.length,
    });
  };

  // Calculate paginated data
  const getPaginatedData = () => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return scannedVisitors.slice(startIndex, endIndex);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: 'Event',
      dataIndex: 'eventName',
      key: 'eventName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Visited' ? 'green' : 'blue'}>{status}</Tag>
      ),
    },
    {
      title: 'Entry Time',
      dataIndex: 'scanTime',
      key: 'scanTime',
      render: (scanTime: string | number | Date) => {
        try {
          if (!scanTime) return '-';
          const dateObj = new Date(scanTime);
          if (isNaN(dateObj.getTime())) return '-';
          return dateObj.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
        } catch (error) {
          return '-';
        }
      },
    },
    {
      title: 'Entry Type',
      dataIndex: 'entryType',
      key: 'entryType',
      render: (text: string) => (
        <Tag color={text === 'Manual' ? 'orange' : 'purple'}>
          {text}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: VisitorEntry) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => handlePrint(record)}
            loading={printingVisitors.has(record.visitorId)}
          >
            Print Badge
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      {contextHolder}
      <div className="p-4 sm:p-6">
        <Card
          title={<h1 className="text-xl sm:text-2xl font-bold">QR Scanner</h1>}
          extra={
            <Space>
              <Button
                type="primary"
                icon={<QrcodeOutlined />}
                onClick={() => setShowScanner(true)}
              >
                Start Scanner
              </Button>
              <Button
                onClick={() => setShowManualEntry(true)}
              >
                Manual Entry
              </Button>
            </Space>
          }
        >
          {/* Scanner Modal */}
          <Modal
            title="QR Code Scanner"
            open={showScanner}
            onCancel={() => {
              setShowScanner(false);
              setIsProcessingScan(false);
            }}
            footer={null}
            width={400}
            centered
          >
            <div className="flex flex-col items-center">
              <div className="w-full aspect-square bg-black rounded-lg overflow-hidden mb-4 relative">
                <div id="qr-reader" className="w-full h-full"></div>
                {isProcessingScan && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Processing scan...</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 text-center mb-2">
                Position the QR code within the frame to scan
              </p>
              <p className="text-xs text-gray-500 text-center">
                {isProcessingScan ? 'Processing previous scan...' : 'Ready to scan'}
              </p>
            </div>
          </Modal>

          {/* Manual Entry Modal */}
          <Modal
            title="Manual Visitor ID Entry"
            open={showManualEntry}
            onOk={handleManualEntry}
            onCancel={() => setShowManualEntry(false)}
            okText="Process"
            confirmLoading={loading}
          >
            <input
              type="text"
              value={manualVisitorId}
              onChange={e => setManualVisitorId(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter' && !loading) {
                  handleManualEntry();
                }
              }}
              placeholder="Enter Visitor ID"
              className="ant-input w-full"
              disabled={loading}
              autoFocus
            />
          </Modal>

          {/* Scanned Visitors Table */}
          <Table
            dataSource={getPaginatedData()}
            columns={columns}
            rowKey={(record) => `${record.visitorId}-${record.scanTime}`}
            loading={loading}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
          
          {/* Custom Pagination */}
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {((pagination.current - 1) * pagination.pageSize) + 1} to {Math.min(pagination.current * pagination.pageSize, pagination.total)} of {pagination.total} visitors
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show:</span>
              <Select
                value={pagination.pageSize}
                onChange={(size) => {
                  setPagination(prev => ({
                    ...prev,
                    pageSize: size,
                    current: 1,
                  }));
                }}
                style={{ width: 80 }}
              >
                <Select.Option value={10}>10</Select.Option>
                <Select.Option value={20}>20</Select.Option>
                <Select.Option value={50}>50</Select.Option>
                <Select.Option value={100}>100</Select.Option>
              </Select>
              <span className="text-sm text-gray-600">per page</span>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                size="small"
                disabled={pagination.current === 1}
                onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
              >
                Previous
              </Button>
              <span className="px-2 text-sm">
                Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
              <Button
                size="small"
                disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default QRScanner;