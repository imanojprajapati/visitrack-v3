// Test script for Visitrack QR Scan API
// Run this to test both localhost and production environments

const fetch = require('node-fetch');

const testUrls = {
  localhost: 'http://localhost:3000/api/scan-entry',
  production: 'https://www.visitrack.in/api/scan-entry'
};

// Test visitor ID (replace with a real one from your database)
const testVisitorId = '507f1f77bcf86cd799439011';

async function testApi(baseUrl, environment) {
  console.log(`\n🧪 Testing ${environment.toUpperCase()} environment:`);
  console.log(`📍 URL: ${baseUrl}/${testVisitorId}`);
  
  try {
    const response = await fetch(`${baseUrl}/${testVisitorId}`);
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`🎉 SUCCESS: Visitor ${data.visitor.name} checked in!`);
      console.log(`📅 Event: ${data.visitor.eventName}`);
      console.log(`🕐 Check-in: ${data.visitor.checkInTime}`);
    } else {
      console.log(`ℹ️  INFO: ${data.message}`);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    console.log(`🔍 This might be because:`);
    console.log(`   - Server is not running (localhost)`);
    console.log(`   - Network connectivity issues`);
    console.log(`   - Invalid visitor ID`);
    console.log(`   - CORS issues`);
  }
}

async function runTests() {
  console.log('🚀 Starting Visitrack QR Scan API Tests');
  console.log('=====================================');
  
  // Test localhost
  await testApi(testUrls.localhost, 'localhost');
  
  // Test production
  await testApi(testUrls.production, 'production');
  
  console.log('\n📋 Test Summary:');
  console.log('================');
  console.log('✅ If you see SUCCESS messages, the API is working!');
  console.log('❌ If you see ERROR messages, check the troubleshooting guide.');
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Make sure your local server is running: npm run dev');
  console.log('2. Check if the visitor ID exists in your database');
  console.log('3. Verify network connectivity for production');
  console.log('4. Check CORS settings if testing from Electron app');
}

// Run the tests
runTests().catch(console.error); 