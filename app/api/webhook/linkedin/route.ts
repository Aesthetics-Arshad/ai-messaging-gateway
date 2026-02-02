import { NextRequest, NextResponse } from 'next/server';
import { normalizeMessage } from '@/lib/platforms/normalizer';
import { inngest } from '@/lib/inngest/client';

// LinkedIn webhooks will generally be configured via LinkedIn's developer portal.
// This handler normalizes incoming events and forwards them into the Inngest pipeline.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('LinkedIn webhook received:', JSON.stringify(body));

    const message = normalizeMessage(body, 'linkedin');

    await inngest.send({
      name: 'ai/message.received',
      data: {
        message,
        platform: 'linkedin',
      },
    });

    return NextResponse.json({ status: 'processing' });
  } catch (error: any) {
    console.error('LinkedIn webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process LinkedIn webhook' },
      { status: 500 },
    );
  }
}

