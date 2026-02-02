import { NextRequest } from 'next/server';
import { orchestrator } from '@/lib/agents/orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WebSocket-like endpoint using Edge Runtime
 * Uses Server-Sent Events (SSE) instead of WebSockets
 */
export async function GET(req: NextRequest) {
  const upgrade = req.headers.get('upgrade');
  
  if (upgrade === 'websocket') {
    return new Response('WebSockets not supported in Edge Runtime. Use /api/chat/stream for SSE.', {
      status: 426,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'anonymous';
  const encoder = new TextEncoder();
  
  const responseStream = new ReadableStream({
    async start(controller) {
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode('event: ping\ndata: {}\n\n'));
      }, 30000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Handle messages with streaming or non-streaming response
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 
    message, 
    userId, 
    platform = 'web',
    messageId = crypto.randomUUID(),
    useStreaming = true 
  } = body;

  if (!useStreaming) {
    try {
      await orchestrator.initializeWorkflow(messageId, userId, platform, message, {});
      
      let fullResponse = '';
      const generator = orchestrator.executeWorkflow(messageId);
      
      for await (const event of generator) {
        if (event.type === 'complete') {
          fullResponse = event.data.response;
        }
      }
      
      return Response.json({ 
        response: fullResponse,
        messageId,
        status: 'complete'
      });
      
    } catch (error) {
      return Response.json(
        { error: (error as Error).message }, 
        { status: 500 }
      );
    }
  }

  // Streaming response via SSE
  const encoder = new TextEncoder();
  
  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        await orchestrator.initializeWorkflow(messageId, userId, platform, message, {});
        
        const generator = orchestrator.executeWorkflow(messageId);
        
        for await (const event of generator) {
          const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message: (error as Error).message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}