const fetch = require('node-fetch');

// Test the form display and registration flow
async function testFormDebug() {
  const baseUrl = 'http://localhost:3000/api';
  
  console.log('Testing Form Display and Registration Flow...\n');
  
  // Test 1: Check if the event exists
  console.log('1. Testing event retrieval...');
  try {
    // You'll need to replace this with an actual event ID from your database
    const eventId = 'your-event-id-here';
    const eventResponse = await fetch(`${baseUrl}/events/${eventId}`);
    const eventData = await eventResponse.json();
    
    if (eventData) {
      console.log('✅ Event found:', eventData.title);
      console.log('Event form configuration:', eventData.form ? 'Has form config' : 'No form config (using basic form)');
    } else {
      console.log('❌ Event not found');
    }
  } catch (error) {
    console.error('❌ Error testing event retrieval:', error.message);
  }
  
  // Test 2: Check center data functionality
  console.log('\n2. Testing center data functionality...');
  try {
    const centerResponse = await fetch(`${baseUrl}/centers/find-by-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: 'suthardarshan.ds27@gmail.com' 
      })
    });
    
    const centerData = await centerResponse.json();
    console.log('Center data found:', centerData.found);
    
    if (centerData.found) {
      console.log('✅ Center data available for auto-fill');
    } else {
      console.log('ℹ️ No center data - form should be empty for manual entry');
    }
  } catch (error) {
    console.error('❌ Error testing center data:', error.message);
  }
  
  // Test 3: Check visitor registration API
  console.log('\n3. Testing visitor registration API...');
  try {
    const testVisitorData = {
      eventId: 'test-event-id',
      email: 'test@example.com',
      name: 'Test User',
      phone: '1234567890',
      formData: {
        name: { label: 'Full Name', value: 'Test User' },
        email: { label: 'Email', value: 'test@example.com' },
        phone: { label: 'Phone Number', value: '1234567890' },
        company: { label: 'Company Name', value: 'Test Company' },
        city: { label: 'City', value: 'Test City' },
        state: { label: 'State', value: 'Test State' },
        country: { label: 'Country', value: 'Test Country' },
        pincode: { label: 'PIN Code', value: '123456' },
        address: { label: 'Address', value: 'Test Address' },
        interestedIn: { label: 'Interested In', value: 'Technology' },
        source: { label: 'Source', value: 'Website' }
      },
      source: 'Website'
    };
    
    const registrationResponse = await fetch(`${baseUrl}/visitors/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testVisitorData)
    });
    
    const registrationData = await registrationResponse.json();
    console.log('Registration API response:', registrationData);
    
    if (registrationData.visitor) {
      console.log('✅ Registration API working correctly');
    } else {
      console.log('❌ Registration API returned no visitor data');
    }
  } catch (error) {
    console.error('❌ Error testing registration API:', error.message);
  }
  
  console.log('\n4. Manual Testing Instructions:');
  console.log('To test the form display and auto-fill:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Navigate to an event registration page');
  console.log('3. Check browser console for debug logs');
  console.log('4. Test with email: suthardarshan.ds27@gmail.com (should auto-fill)');
  console.log('5. Test with a new email (should show empty form)');
  console.log('6. Check if form fields are visible and properly bound');
  console.log('7. Verify form submission works correctly');
  
  console.log('\nExpected behavior:');
  console.log('- Form should be visible at step 2 (Registration Details)');
  console.log('- If center data exists: Form should auto-fill');
  console.log('- If no center data: Form should be empty for manual entry');
  console.log('- Form submission should work without "Visitor information not found" error');
}

// Run the test
testFormDebug().catch(console.error); 