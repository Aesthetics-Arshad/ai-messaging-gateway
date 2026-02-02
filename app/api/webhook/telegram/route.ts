import { NextRequest, NextResponse } from 'next/server';
import { normalizeMessage } from '@/lib/platforms/normalizer';
import { processWithBrain } from '@/lib/agents/brain';
import { sendTelegramMessage } from '@/lib/platforms/telegram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Debug: Log full body to see what's coming
    console.log('📩 Webhook received:', JSON.stringify(body, null, 2));
    
    // Handle both regular messages and edited messages
    const telegramMsg = body.message || body.edited_message || body.callback_query?.message;
    
    if (!telegramMsg) {
      console.log('⚠️ No message found in body. Keys:', Object.keys(body));
      // Return 200 so Telegram doesn't retry, but indicate no action taken
      return NextResponse.json({ status: 'no_message' });
    }
    
    // Extract basic info for logging
    const chatId = telegramMsg.chat?.id;
    const text = telegramMsg.text || '[No text - possibly media]';
    
    console.log(`📩 Message from Chat ID ${chatId}: ${text.substring(0, 50)}...`);
    
    // Normalize
    let message;
    try {
      message = normalizeMessage(body, 'telegram');
    } catch (normError: any) {
      console.error('❌ Normalize error:', normError);
      return NextResponse.json({ error: 'Normalization failed' }, { status: 400 });
    }
    
    // Process
    console.log('🧠 Processing with Brain...');
    const result = await processWithBrain(message);
    
    // Send response
    console.log('📤 Sending Telegram response...');
    await sendTelegramMessage(message.user_id, result.response);
    
    return NextResponse.json({ 
      status: 'ok', 
      sent: true,
      message_type: message.message_type,
      used_rag: result.used_rag 
    });
    
  } catch (error: any) {
    console.error('❌ Webhook Error:', error.message, error.stack);
    return NextResponse.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Optional: Handle GET requests for webhook verification (if you use setWebhook with secret)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret === process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ status: 'webhook_active' });
  }
  
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}