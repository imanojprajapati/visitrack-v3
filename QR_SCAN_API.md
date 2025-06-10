# QR Scan Entry API Documentation

## Overview
Simple GET API for QR code scanning that accepts visitor ID in the URL and marks visitor entry by scan. Works on both localhost and production.

## API Endpoint
```
GET /api/scan-entry/[visitorId]
```

## API URLs for Testing

### Localhost (Development)
```
http://localhost:3000/api/scan-entry/507f1f77bcf86cd799439011
```

### Production (Live)
```
https://www.visitrack.in/api/scan-entry/507f1f77bcf86cd799439011
```

## Environment Configuration

The API automatically detects the environment and uses the appropriate base URL:

- **Development**: `http://localhost:3000`
- **Production**: `https://www.visitrack.in`

## How It Works

1. **QR Code Scanning**: Your Electron app scans QR code containing visitor ID
2. **GET Request**: Send GET request to `/api/scan-entry/{visitorId}`
3. **Visitor Lookup**: API finds visitor by ID and validates registration
4. **Status Check**: API checks if visitor is already checked in
5. **Status Update**: If not checked in, updates visitor status to "Visited"
6. **Scan Record**: Creates record in qrscans collection
7. **Response**: Returns visitor details and scan record

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "Visitor checked in successfully",
  "visitor": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "company": "Tech Corp",
    "eventName": "Tech Conference 2024",
    "eventLocation": "Convention Center",
    "eventStartDate": "15-01-24",
    "eventEndDate": "16-01-24",
    "eventStartTime": "09:00",
    "eventEndTime": "17:00",
    "status": "Visited",
    "checkInTime": "15-01-24 10:30",
    "additionalData": {
      "city": { "label": "City", "value": "New York" },
      "state": { "label": "State", "value": "NY" }
    }
  },
  "scanRecord": {
    "_id": "507f1f77bcf86cd799439012",
    "visitorId": "507f1f77bcf86cd799439011",
    "eventId": "507f1f77bcf86cd799439013",
    "name": "John Doe",
    "company": "Tech Corp",
    "eventName": "Tech Conference 2024",
    "scanTime": "2024-01-15T10:30:00.000Z",
    "entryType": "QR",
    "status": "Visited",
    "deviceInfo": "QR Scanner"
  }
}
```

### Already Checked In Response (200)
```json
{
  "success": false,
  "message": "Visitor is already checked in",
  "visitor": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "company": "Tech Corp",
    "eventName": "Tech Conference 2024",
    "eventLocation": "Convention Center",
    "eventStartDate": "15-01-24",
    "eventEndDate": "16-01-24",
    "eventStartTime": "09:00",
    "eventEndTime": "17:00",
    "status": "Visited",
    "checkInTime": "15-01-24 10:30",
    "additionalData": {}
  }
}
```

### Error Responses

#### Invalid Visitor ID (400)
```json
{
  "error": "Invalid visitor ID format"
}
```

#### Visitor Not Found (404)
```json
{
  "error": "Visitor not found"
}
```

#### Server Error (500)
```json
{
  "error": "Internal server error"
}
```

## Testing in Thunder Client

### 1. Create New Request
- Method: `GET`
- URL: Choose one of the following:

#### For Local Development
```
http://localhost:3000/api/scan-entry/507f1f77bcf86cd799439011
```

#### For Production Testing
```
https://www.visitrack.in/api/scan-entry/507f1f77bcf86cd799439011
```

### 2. Replace Visitor ID
Replace `507f1f77bcf86cd799439011` with an actual visitor ID from your database.

### 3. Send Request
Click "Send" to test the API.

## Electron App Integration

### Dynamic URL Configuration
```javascript
// Example Electron app code with environment detection
const getApiBaseUrl = () => {
  // You can set this based on your Electron app's environment
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction 
    ? 'https://www.visitrack.in/api'
    : 'http://localhost:3000/api';
};

const scanQRCode = async (visitorId) => {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/scan-entry/${visitorId}`);
    const data = await response.json();

    if (data.success) {
      // Visitor checked in successfully
      console.log(`Welcome ${data.visitor.name}!`);
      console.log(`Event: ${data.visitor.eventName}`);
      console.log(`Check-in time: ${data.visitor.checkInTime}`);
      
      // Display success message in your Electron app
      showSuccessMessage(`Welcome ${data.visitor.name}!`);
    } else {
      // Visitor already checked in
      console.log(`Visitor ${data.visitor.name} is already checked in`);
      showInfoMessage(`Visitor ${data.visitor.name} is already checked in`);
    }
  } catch (error) {
    console.error('Scan error:', error);
    showErrorMessage('Failed to process scan');
  }
};

// Usage with QR scanner
qrScanner.on('scan', (qrData) => {
  scanQRCode(qrData.trim());
});
```

### Simple Configuration
```javascript
// Simple version - just change the base URL
const API_BASE_URL = 'https://www.visitrack.in/api'; // or 'http://localhost:3000/api'

const scanQRCode = async (visitorId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/scan-entry/${visitorId}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`Welcome ${data.visitor.name}!`);
      console.log(`Event: ${data.visitor.eventName}`);
      console.log(`Event Date: ${data.visitor.eventStartDate}`);
    }
  } catch (error) {
    console.error('Scan error:', error);
  }
};
```

## QR Code Format

The QR code should contain only the visitor ID in MongoDB ObjectId format:
```
507f1f77bcf86cd799439011
```

## Features

- ✅ **Works on both environments** - localhost and production
- ✅ **Simple GET request** - No complex POST body needed
- ✅ **Visitor validation** - Checks if visitor exists
- ✅ **Duplicate prevention** - Can't check in twice
- ✅ **Status update** - Automatically marks as "Visited"
- ✅ **Scan recording** - Creates audit trail
- ✅ **Complete visitor details** - Returns all visitor info
- ✅ **Event information** - Includes event name, date, time
- ✅ **Error handling** - Proper error responses
- ✅ **CORS enabled** - Works with Electron apps

## Security Considerations

1. **Input Validation**: API validates visitor ID format
2. **Database Security**: Uses proper MongoDB queries
3. **Error Handling**: Comprehensive error responses
4. **CORS Headers**: Configured for cross-origin requests
5. **Rate Limiting**: Consider adding for production use
6. **Authentication**: Add API key for production use

## Testing URLs for Thunder Client

### Local Development
```
GET http://localhost:3000/api/scan-entry/507f1f77bcf86cd799439011
```

### Production
```
GET https://www.visitrack.in/api/scan-entry/507f1f77bcf86cd799439011
```

### Test with Invalid Visitor ID
```
GET https://www.visitrack.in/api/scan-entry/invalid-id
```

### Test with Non-existent Visitor ID
```
GET https://www.visitrack.in/api/scan-entry/507f1f77bcf86cd799439999
```

## Environment Variables

The application uses these environment variables:

```env
NODE_ENV=production  # or development
NEXT_PUBLIC_API_URL=https://www.visitrack.in/api  # or http://localhost:3000/api
NEXT_PUBLIC_BASE_URL=https://www.visitrack.in     # or http://localhost:3000
```

## Response Fields

### Visitor Object
- `_id`: Visitor ID
- `name`: Visitor name
- `email`: Visitor email
- `phone`: Visitor phone
- `company`: Visitor company
- `eventName`: Event name
- `eventLocation`: Event location
- `eventStartDate`: Event start date (DD-MM-YY)
- `eventEndDate`: Event end date (DD-MM-YY)
- `eventStartTime`: Event start time (HH:mm)
- `eventEndTime`: Event end time (HH:mm)
- `status`: Visitor status
- `checkInTime`: Check-in time (DD-MM-YY HH:mm)
- `additionalData`: Additional form fields

### Scan Record Object
- `_id`: Scan record ID
- `visitorId`: Visitor ID
- `eventId`: Event ID
- `name`: Visitor name
- `company`: Visitor company
- `eventName`: Event name
- `scanTime`: Scan timestamp
- `entryType`: Entry type (QR/Manual)
- `status`: Scan status
- `deviceInfo`: Device information

## Deployment Notes

1. **Production URL**: https://www.visitrack.in
2. **API Base**: https://www.visitrack.in/api
3. **CORS**: Configured for cross-origin requests
4. **SSL**: HTTPS enabled for production
5. **Environment**: Automatically detects production vs development 