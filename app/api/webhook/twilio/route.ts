import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { processWithBrain } from '@/lib/agents/brain';

// Get MessagingResponse from twilio
const { MessagingResponse } = twilio.twiml;

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    
    const from = body.get('From') as string;
    const to = body.get('To') as string;
    const messageBody = body.get('Body') as string;
    const messageSid = body.get('MessageSid') as string;
    
    console.log('📩 Twilio WhatsApp:', { from, body: messageBody });

    // Process with AI
    const result = await processWithBrain({
      platform: 'whatsapp',
      user_id: from.replace('whatsapp:', ''),
      conversation_id: from.replace('whatsapp:', ''),
      message_id: messageSid,
      message_type: 'text',
      content: messageBody,
      timestamp: Date.now(),
      metadata: { twilio_number: to }
    });

    // Create Twilio XML response
    const twiml = new MessagingResponse();
    twiml.message(result.response);

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Twilio error:', error);
    
    const twiml = new MessagingResponse();
    twiml.message("Sorry, I couldn't process your message.");
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
      status: 500
    });
  }
}