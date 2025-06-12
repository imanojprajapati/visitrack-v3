// Test script to verify email functionality
const testEmailService = async () => {
  try {
    console.log('Testing email service...');
    
    const response = await fetch('http://localhost:3000/api/visitors/send-registration-success', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testMode: true
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Email service test successful:', result);
    } else {
      console.error('❌ Email service test failed:', result);
    }
  } catch (error) {
    console.error('❌ Error testing email service:', error);
  }
};

// Run the test
testEmailService(); 