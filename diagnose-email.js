// Email Diagnostic Script for Visitrack
// This script helps diagnose email sending issues after registration

const diagnoseEmail = async () => {
  console.log('🔍 VISITRACK EMAIL DIAGNOSTIC TOOL');
  console.log('=====================================\n');

  // Check if server is running
  console.log('1. Checking if development server is running...');
  try {
    const healthResponse = await fetch('http://localhost:3000/api/test-connection');
    if (healthResponse.ok) {
      console.log('✅ Development server is running');
    } else {
      console.log('⚠️ Development server responded with status:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ Development server is not running or not accessible');
    console.log('   Please run: npm run dev');
    return;
  }

  // Test basic email service
  console.log('\n2. Testing basic email service configuration...');
  try {
    const testResponse = await fetch('http://localhost:3000/api/visitors/send-registration-success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testMode: true })
    });

    const testResult = await testResponse.json();
    
    if (testResponse.ok) {
      console.log('✅ Email service is properly configured');
      console.log('   Test email sent successfully at:', testResult.timestamp);
    } else {
      console.log('❌ Email service configuration issue:');
      console.log('   Error:', testResult.message);
      
      if (testResult.message.includes('not configured')) {
        console.log('\n🔧 SOLUTION:');
        console.log('   You need to set up Gmail credentials in your environment variables:');
        console.log('   1. Create a .env.local file in your project root');
        console.log('   2. Add the following lines:');
        console.log('      GMAIL_USER=your-email@gmail.com');
        console.log('      GMAIL_APP_PASSWORD=your-gmail-app-password');
        console.log('   3. Restart your development server');
        return;
      }
    }
  } catch (error) {
    console.log('❌ Failed to test email service:', error.message);
    return;
  }

  // Check for existing visitors
  console.log('\n3. Checking for existing visitors to test with...');
  try {
    const visitorsResponse = await fetch('http://localhost:3000/api/visitors');
    
    if (!visitorsResponse.ok) {
      console.log('❌ Failed to fetch visitors');
      return;
    }

    const visitorsData = await visitorsResponse.json();
    
    if (!visitorsData.visitors || visitorsData.visitors.length === 0) {
      console.log('⚠️ No visitors found in database');
      console.log('   Please register at least one visitor to test email functionality');
      console.log('   Go to: http://localhost:3000/events and register for an event');
      return;
    }

    console.log(`✅ Found ${visitorsData.visitors.length} visitor(s) in database`);
    
    // Test with the first visitor
    const testVisitor = visitorsData.visitors[0];
    console.log(`   Testing with visitor: ${testVisitor.name} (${testVisitor.email})`);

    console.log('\n4. Testing registration email with real visitor...');
    const emailResponse = await fetch('http://localhost:3000/api/visitors/send-registration-success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: testVisitor._id })
    });

    const emailResult = await emailResponse.json();
    
    if (emailResponse.ok) {
      console.log('✅ Registration email sent successfully!');
      console.log('   Email sent to:', testVisitor.email);
      console.log('   Event:', emailResult.eventTitle);
      console.log('   PDF attached:', emailResult.pdfAttached ? 'Yes' : 'No');
    } else {
      console.log('❌ Failed to send registration email:');
      console.log('   Status:', emailResponse.status);
      console.log('   Error:', emailResult.message || emailResult.error);
    }

  } catch (error) {
    console.log('❌ Error during visitor test:', error.message);
  }

  console.log('\n=====================================');
  console.log('🏁 DIAGNOSTIC COMPLETE');
  console.log('=====================================');
};

// Run the diagnostic
diagnoseEmail().catch(console.error); 