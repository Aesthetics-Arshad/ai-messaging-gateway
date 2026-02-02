import axios from 'axios';

const API_URL = 'https://api.telegram.org/bot';

// Hardcode for local dev if env fails, use env for production
const getToken = () => {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  if (envToken && envToken.includes(':')) return envToken;
  
  // Fallback for local testing only
  console.warn('Using fallback token - set TELEGRAM_BOT_TOKEN in .env.local');
  return "8223017540:AAFpRgU3myX3xx8Cb-Kx8KrJPhjx2iB-dPU"; // Replace with yours
};

export async function sendTelegramMessage(chatId: string, message: string) {
  try {
    const token = getToken();
    
    await axios.post(
      `${API_URL}${token}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      },
      { timeout: 30000 }
    );
    
    console.log('✅ Telegram sent');
  } catch (error: any) {
    console.error('Telegram error:', error.response?.data || error.message);
  }
}