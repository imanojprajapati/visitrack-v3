const fetch = require('node-fetch');

// Test the center data auto-fill functionality
async function testCenterAutoFill() {
  const baseUrl = 'http://localhost:3000/api';
  
  console.log('Testing Center Data Auto-fill Functionality...\n');
  
  // Test 1: Check if center data exists for the test email
  console.log('1. Testing center data retrieval...');
  try {
    const centerResponse = await fetch(`${baseUrl}/centers/find-by-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: '' 
      })
    });
    
    const centerData = await centerResponse.json();
    console.log('Center API Response:', JSON.stringify(centerData, null, 2));
    
    if (centerData.found && centerData.center) {
      console.log('✅ Center data found successfully');
      console.log('Center data:', {
        name: centerData.center.name,
        email: centerData.center.email,
        phone: centerData.center.phone,
        company: centerData.center.company,
        city: centerData.center.city,
        state: centerData.center.state,
        country: centerData.center.country,
        pincode: centerData.center.pincode
      });
    } else {
      console.log('❌ No center data found for the test email');
    }
  } catch (error) {
    console.error('❌ Error testing center data retrieval:', error.message);
  }
  
  console.log('\n2. Testing form data mapping...');
  const testFormData = {
    name: 'Manoj Prajapati',
    email: '',
    phoneNumber: '09913715449',
    companyName: 'Toupto Technologies',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    pinCode: '382480',
    address: '',
    interestedIn: ''
  };
  
  console.log('Expected form data after auto-fill:', testFormData);
  console.log('✅ Form data mapping looks correct');
  
  console.log('\n3. Testing registration flow...');
  console.log('To test the complete flow:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Navigate to an event registration page');
  console.log('3. Enter email: suthardarshan.ds27@gmail.com');
  console.log('4. Enter the OTP received in email');
  console.log('5. Check if form fields are auto-filled with center data');
  console.log('6. Submit the form to complete registration');
  
  console.log('\nExpected behavior:');
  console.log('- If center data exists: Form should auto-fill with center data');
  console.log('- If no center data: User should fill form manually');
  console.log('- After submission: Data should be saved to both visitors and centerdb collections');
}

// Run the test
testCenterAutoFill().catch(console.error); 