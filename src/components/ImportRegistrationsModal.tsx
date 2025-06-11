import React, { useState, useRef } from 'react';
import { 
  Modal, 
  Upload, 
  Button, 
  message, 
  Table, 
  Alert, 
  Space, 
  Typography, 
  Progress,
  Tag,
  Divider,
  Card,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  UploadOutlined, 
  FileExcelOutlined, 
  FileTextOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { parseCSV, parseExcel, downloadSampleCSV, ImportResult, ImportedVisitor } from '../utils/importUtils';
import { Event } from '../types/event';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface ImportRegistrationsModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  events: Event[];
}

export default function ImportRegistrationsModal({ 
  visible, 
  onCancel, 
  onSuccess, 
  events 
}: ImportRegistrationsModalProps) {
  const [fileList, setFileList] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewColumns, setPreviewColumns] = useState<any[]>([]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setImportResult(null);
    
    try {
      let result: ImportResult;
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        result = await parseCSV(file);
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        result = await parseExcel(file);
      } else {
        message.error('Please upload a CSV or Excel file');
        setUploading(false);
        return false;
      }

      setImportResult(result);
      
      // Dynamically generate columns from the data
      if (result.data.length > 0) {
        const allKeys = Array.from(new Set(result.data.flatMap(row => Object.keys(row))));
        setPreviewColumns(
          allKeys
            .filter(key => key.toLowerCase() !== 'phone' && key.toLowerCase() !== 'eventname')
            .map(key => ({
              title: key.charAt(0).toUpperCase() + key.slice(1),
              dataIndex: key,
              key,
              width: 150,
            }))
        );
      } else {
        setPreviewColumns([]);
      }
      
      if (result.errors.length > 0) {
        message.warning(`File uploaded with ${result.errors.length} errors. Please review before importing.`);
      } else if (result.validRows > 0) {
        message.success(`File uploaded successfully! ${result.validRows} valid records found.`);
      } else {
        message.error('No valid records found in the file.');
      }
      
    } catch (error) {
      console.error('File parsing error:', error);
      message.error('Failed to parse file. Please check the file format.');
    } finally {
      setUploading(false);
    }
    
    return false; // Prevent default upload behavior
  };

  const handleImport = async () => {
    if (!importResult || importResult.validRows === 0) {
      message.error('No valid data to import');
      return;
    }

    setImporting(true);
    
    try {
      const formData = new FormData();
      const file = fileList[0]?.originFileObj;
      
      if (!file) {
        message.error('No file selected');
        return;
      }

      formData.append('file', file);

      const response = await fetch('/api/registrations/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        message.success(result.message);
        onSuccess();
        handleReset();
      } else {
        message.error(result.error || 'Import failed');
        if (result.details) {
          console.error('Import errors:', result.details);
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      message.error('Failed to import registrations');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFileList([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    beforeUpload: handleFileUpload,
    onChange: (info: any) => {
      setFileList(info.fileList.slice(-1)); // Keep only the last file
    },
    onRemove: () => {
      setFileList([]);
      setImportResult(null);
    },
    accept: '.csv,.xlsx,.xls',
    showUploadList: {
      showPreviewIcon: false,
      showRemoveIcon: true,
    },
  };

  const getValidationStatus = () => {
    if (!importResult) return 'none';
    if (importResult.errors.length > 0 && importResult.validRows === 0) return 'error';
    if (importResult.errors.length > 0 && importResult.validRows > 0) return 'warning';
    return 'success';
  };

  const validationStatus = getValidationStatus();

  return (
    <Modal
      title={
        <Space>
          <UploadOutlined />
          <span>Import Registrations</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1200}
      destroyOnClose
    >
      <div className="space-y-6">
        {/* Instructions */}
        <Card size="small" className="bg-blue-50 border-blue-200">
          <div className="space-y-2">
            <Title level={5} className="m-0 text-blue-800">
              Import Instructions
            </Title>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• Upload CSV or Excel files with visitor registration data</div>
              <div>• Required fields: <strong>name</strong>, <strong>email</strong></div>
              <div>• Optional fields: phone, company, city, state, country, pincode, source, eventName</div>
              <div>• File size limit: 10MB</div>
              <div>• Each row must have an Event column specifying the event name.</div>
            </div>
            <Button 
              type="link" 
              icon={<DownloadOutlined />} 
              onClick={downloadSampleCSV}
              className="p-0 h-auto text-blue-600 hover:text-blue-800"
            >
              Download Sample CSV Template
            </Button>
          </div>
        </Card>

        {/* File Upload */}
        <Card size="small">
          <Title level={5} className="m-0 mb-4">Upload File</Title>
          <Dragger {...uploadProps} disabled={uploading}>
            <p className="ant-upload-drag-icon">
              {uploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              ) : (
                <UploadOutlined className="text-3xl text-blue-500" />
              )}
            </p>
            <p className="ant-upload-text">
              {uploading ? 'Processing file...' : 'Click or drag CSV/Excel file to upload'}
            </p>
            <p className="ant-upload-hint">
              Support for .csv, .xlsx, .xls files
            </p>
          </Dragger>
        </Card>

        {/* Validation Results */}
        {importResult && (
          <Card size="small">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Title level={5} className="m-0">Validation Results</Title>
                <Space>
                  {validationStatus === 'success' && (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                      All Valid
                    </Tag>
                  )}
                  {validationStatus === 'warning' && (
                    <Tag color="orange" icon={<WarningOutlined />}>
                      Has Warnings
                    </Tag>
                  )}
                  {validationStatus === 'error' && (
                    <Tag color="red" icon={<ExclamationCircleOutlined />}>
                      Has Errors
                    </Tag>
                  )}
                </Space>
              </div>

              <Row gutter={16}>
                <Col span={6}>
                  <Statistic 
                    title="Total Rows" 
                    value={importResult.totalRows} 
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Valid Rows" 
                    value={importResult.validRows} 
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Errors" 
                    value={importResult.errors.length} 
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Warnings" 
                    value={importResult.warnings.length} 
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
              </Row>

              <Progress 
                percent={importResult.totalRows > 0 ? (importResult.validRows / importResult.totalRows) * 100 : 0}
                status={validationStatus === 'error' ? 'exception' : 'normal'}
                strokeColor={validationStatus === 'success' ? '#52c41a' : validationStatus === 'warning' ? '#faad14' : '#ff4d4f'}
              />

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <Alert
                  message="Validation Errors"
                  description={
                    <div className="max-h-32 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 mb-1">
                          {error}
                        </div>
                      ))}
                    </div>
                  }
                  type="error"
                  showIcon
                  className="mb-4"
                />
              )}

              {/* Warnings */}
              {importResult.warnings.length > 0 && (
                <Alert
                  message="Validation Warnings"
                  description={
                    <div className="max-h-32 overflow-y-auto">
                      {importResult.warnings.map((warning, index) => (
                        <div key={index} className="text-sm text-orange-600 mb-1">
                          {warning}
                        </div>
                      ))}
                    </div>
                  }
                  type="warning"
                  showIcon
                  className="mb-4"
                />
              )}

              {/* Data Preview */}
              {importResult.validRows > 0 && (
                <div>
                  <Title level={5} className="m-0 mb-3">Data Preview (First 5 rows)</Title>
                  <Table
                    columns={previewColumns}
                    dataSource={importResult.data.slice(0, 5).map((item, index) => ({ ...item, key: index }))}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    pagination={false}
                    className="border border-gray-200 rounded"
                  />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={handleImport}
            loading={importing}
            disabled={!importResult || importResult.validRows === 0}
            icon={<UploadOutlined />}
          >
            {importing ? 'Importing...' : 'Import Registrations'}
          </Button>
        </div>
      </div>
    </Modal>
  );
} 