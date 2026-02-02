import axios from 'axios';

export async function sendLinkedInMessage(recipientId: string, message: string) {
  try {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.log('LinkedIn not configured');
      return;
    }
    
    // LinkedIn Messaging API (requires specific permissions)
    await axios.post(
      'https://api.linkedin.com/v2/messages',
      {
        content: { content: message },
        recipients: [{ person: `urn:li:person:${recipientId}` }]
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );
    
    console.log(`✅ LinkedIn message sent to ${recipientId}`);
  } catch (error: any) {
    console.error('LinkedIn error:', error.response?.data || error.message);
  }
}