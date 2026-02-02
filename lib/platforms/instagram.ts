import axios from 'axios';

const API_URL = 'https://graph.facebook.com/v18.0';

export async function sendInstagramMessage(recipientId: string, message: string) {
  try {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.log('Instagram not configured');
      return;
    }
    
    await axios.post(
      `${API_URL}/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: message }
      },
      {
        params: { access_token: accessToken }
      }
    );
    
    console.log(`✅ Instagram message sent to ${recipientId}`);
  } catch (error: any) {
    console.error('Instagram error:', error.response?.data || error.message);
  }
}