import axios from 'axios';

const API_URL = 'https://graph.facebook.com/v18.0';

export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    if (!phoneNumberId || !accessToken) {
      console.log('WhatsApp not configured');
      return;
    }
    
    await axios.post(
      `${API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ WhatsApp message sent to ${to}`);
  } catch (error: any) {
    console.error('WhatsApp error:', error.response?.data || error.message);
  }
}