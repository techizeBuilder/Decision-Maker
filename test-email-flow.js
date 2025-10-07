// Test script to verify email functionality
const { sendDecisionMakerInvitation, sendWelcomeEmail, sendCallReminder } = require('./server/email-service');

async function testEmailFlow() {
  console.log('Testing email flow...');
  
  try {
    // Test 1: Decision Maker Invitation
    console.log('\n1. Testing Decision Maker Invitation Email...');
    const inviteResult = await sendDecisionMakerInvitation(
      'test@example.com',
      'John Doe',
      'Jane Smith',
      'invitation-token-123'
    );
    console.log('✓ Decision Maker Invitation Email sent successfully:', inviteResult.messageId);
    
    // Test 2: Welcome Email
    console.log('\n2. Testing Welcome Email...');
    const welcomeResult = await sendWelcomeEmail(
      'test@example.com',
      'John Doe',
      'sales_rep'
    );
    console.log('✓ Welcome Email sent successfully:', welcomeResult.messageId);
    
    // Test 3: Call Reminder
    console.log('\n3. Testing Call Reminder Email...');
    const reminderResult = await sendCallReminder(
      'test@example.com',
      'John Doe',
      {
        salesRepName: 'Jane Smith',
        decisionMakerName: 'John Doe',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        meetingLink: 'https://meet.google.com/abc-def-ghi'
      }
    );
    console.log('✓ Call Reminder Email sent successfully:', reminderResult.messageId);
    
    console.log('\n🎉 All email tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
  }
}

testEmailFlow();