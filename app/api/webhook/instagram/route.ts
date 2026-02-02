import { NextRequest, NextResponse } from 'next/server';
import { normalizeMessage } from '@/lib/platforms/normalizer';
import { inngest } from '@/lib/inngest/client';

export async function GET(request: NextRequest) {
  // Instagram verification (similar to WhatsApp)
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge);
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = normalizeMessage(body, 'instagram');
    
    await inngest.send({
      name: 'ai/message.received',
      data: { message, platform: 'instagram' }
    });
    
    return NextResponse.json({ status: 'processing' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}