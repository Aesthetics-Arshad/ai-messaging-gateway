import axios from 'axios';

export async function sendSnapchatMessage(userId: string, message: string) {
  try {
    const clientId = process.env.SNAPCHAT_CLIENT_ID;
    const clientSecret = process.env.SNAPCHAT_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.log('Snapchat not configured');
      return;
    }
    
    // Get access token first (OAuth2)
    const tokenResponse = await axios.post(
      'https://accounts.snapchat.com/login/oauth2/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      }
    );
    
    const accessToken = tokenResponse.data.access_token;
    
    // Send message via Snap Kit
    await axios.post(
      'https://kit.snapchat.com/v1/messages',
      {
        recipient_id: userId,
        text: message
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Snapchat message sent to ${userId}`);
  } catch (error: any) {
    console.error('Snapchat error:', error.response?.data || error.message);
  }
}