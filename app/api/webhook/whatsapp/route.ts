import { NextRequest, NextResponse } from 'next/server';
import { normalizeMessage } from '@/lib/platforms/normalizer';
import { inngest } from '@/lib/inngest/client';

// Verification for Meta (GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    return new NextResponse(challenge);
  }
  
  return new NextResponse('Forbidden', { status: 403 });
}

// Receive messages (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('WhatsApp webhook received:', JSON.stringify(body));
    
    // Normalize
    const message = normalizeMessage(body, 'whatsapp');
    
    // Send to background job (Inngest)
    await inngest.send({
      name: 'ai/message.received',
      data: {
        message,
        platform: 'whatsapp'
      }
    });
    
    return NextResponse.json({ status: 'processing' });
    
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}