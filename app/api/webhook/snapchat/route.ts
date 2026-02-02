import { NextRequest, NextResponse } from 'next/server';
import { normalizeMessage } from '@/lib/platforms/normalizer';
import { inngest } from '@/lib/inngest/client';

// Snapchat webhook handler.
// Configure the callback URL in Snap Kit to point here.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Snapchat webhook received:', JSON.stringify(body));

    const message = normalizeMessage(body, 'snapchat');

    await inngest.send({
      name: 'ai/message.received',
      data: {
        message,
        platform: 'snapchat',
      },
    });

    return NextResponse.json({ status: 'processing' });
  } catch (error: any) {
    console.error('Snapchat webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process Snapchat webhook' },
      { status: 500 },
    );
  }
}

