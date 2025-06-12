# Scan Entry API Documentation

## Overview
The Scan Entry API allows your Electron app to check in visitors by scanning QR codes. The API processes the visitor ID from the QR code, updates the visitor's status, and returns visitor details.

## API Endpoint
```
POST /api/scan-entry
```

## Request Format

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "visitorId": "507f1f77bcf86cd799439011",
  "deviceInfo": "Electron App - Desktop Scanner",
  "entryType": "QR"
}
```

### Parameters
- `visitorId` (required): The visitor ID from the QR code (MongoDB ObjectId format)
- `deviceInfo` (optional): Description of the scanning device (default: "Electron App")
- `entryType` (optional): Type of entry - "QR" or "Manual" (default: "QR")

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
    "deviceInfo": "Electron App - Desktop Scanner"
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

## How It Works

1. **QR Code Scanning**: Your Electron app scans a QR code containing the visitor ID
2. **API Request**: Send a POST request to `/api/scan-entry` with the visitor ID
3. **Visitor Lookup**: API finds the visitor by ID and validates their registration
4. **Status Check**: API checks if the visitor is already checked in
5. **Status Update**: If not checked in, updates visitor status to "Visited"
6. **Scan Record**: Creates a record in the qrscans collection
7. **Response**: Returns visitor details and scan record

## Electron App Integration Example

```javascript
// Example Electron app code
const scanQRCode = async (qrData) => {
  try {
    const response = await fetch('http://your-domain.com/api/scan-entry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visitorId: qrData,
        deviceInfo: 'Electron Desktop Scanner',
        entryType: 'QR'
      })
    });

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
  scanQRCode(qrData);
});
```

## QR Code Format

The QR code should contain only the visitor ID in MongoDB ObjectId format:
```
507f1f77bcf86cd799439011
```

## Security Considerations

1. **API Rate Limiting**: Consider implementing rate limiting to prevent abuse
2. **Authentication**: Add API key or token authentication for production use
3. **HTTPS**: Always use HTTPS in production
4. **Input Validation**: The API validates visitor ID format and existence

## Testing

You can test the API using curl:

```bash
curl -X POST http://localhost:3000/api/scan-entry \
  -H "Content-Type: application/json" \
  -d '{
    "visitorId": "507f1f77bcf86cd799439011",
    "deviceInfo": "Test Scanner",
    "entryType": "QR"
  }'
```

## Error Handling

The API handles various error scenarios:
- Invalid visitor ID format
- Visitor not found
- Database connection issues
- Already checked in visitors
- Server errors

Always check the `success` field in the response to determine if the operation was successful. 