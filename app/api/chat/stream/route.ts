import { NextRequest } from 'next/server';
import { orchestrator } from '@/lib/agents/orchestrator';
import { UnifiedMessage } from '@/types';

/**
 * Server-Sent Events (SSE) endpoint for real-time streaming
 * Works on Vercel Edge Runtime (better than WebSockets for serverless)
 */
//export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, userId, platform = 'web', messageId = crypto.randomUUID() }: {
    message: string;
    userId: string;
    platform?: string;
    messageId?: string;
  } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial acknowledgment
        controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ messageId })}\n\n`));

        // Initialize workflow
        await orchestrator.initializeWorkflow(
          messageId,
          userId,
          platform,
          message,
          {}
        );

        // Execute and stream steps
        const generator = orchestrator.executeWorkflow(messageId);
        
        for await (const event of generator) {
          const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        // Send completion
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        controller.close();

      } catch (error) {
        const errorData = `event: error\ndata: ${JSON.stringify({ message: (error as Error).message })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}

/**
 * Alternative: Simple token streaming for direct LLM responses
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q') || 'Hello';
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const Groq = (await import('groq-sdk')).default;
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
      
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: query }],
        model: 'llama-3.1-8b-instant',
        stream: true,
        max_tokens: 1024,
      });

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}