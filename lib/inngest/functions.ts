import { inngest } from './client';
import { processWithBrain } from '@/lib/agents/brain';
import { sendTelegramMessage } from '@/lib/platforms/telegram';
import { sendWhatsAppMessage } from '@/lib/platforms/whatsapp';
import { sendInstagramMessage } from '@/lib/platforms/instagram';
import { sendLinkedInMessage } from '@/lib/platforms/linkedin';
import { sendSnapchatMessage } from '@/lib/platforms/snapchat';

export const processMessageFunction = inngest.createFunction(
  { 
    id: 'process-ai-message',
    name: 'Process AI Message',
    retries: 2,
    concurrency: 10,
  },
  { event: 'ai/message.received' },
  async ({ event, step }) => {
    const { message, platform } = event.data;
    
    console.log(`[Inngest] Processing ${platform} message from ${message.user_id}`);
    
    // Step 1: Process with AI Brain
    const result = await step.run('process-with-brain', async () => {
      return await processWithBrain(message);
    });
    
    // Step 2: Send response based on platform
    await step.run('send-response', async () => {
      switch (platform) {
        case 'telegram':
          await sendTelegramMessage(message.user_id, result.response);
          break;
        case 'whatsapp':
          await sendWhatsAppMessage(message.user_id, result.response);
          break;
        case 'instagram':
          await sendInstagramMessage(message.user_id, result.response);
          break;
        case 'linkedin':
          await sendLinkedInMessage(message.user_id, result.response);
          break;
        case 'snapchat':
          await sendSnapchatMessage(message.user_id, result.response);
          break;
        default:
          throw new Error(`Unknown platform: ${platform}`);
      }
    });
    
    // Step 3: Log analytics (optional)
    await step.run('log-analytics', async () => {
      console.log(`[Analytics] Message processed - Platform: ${platform}, RAG: ${result.used_rag}`);
    });
    
    return { 
      success: true, 
      platform,
      response_length: result.response.length,
      used_rag: result.used_rag 
    };
  }
);

// Cleanup old conversations (runs daily)
export const cleanupFunction = inngest.createFunction(
  { id: 'cleanup-old-conversations', name: 'Cleanup Old Conversations' },
  { cron: '0 0 * * *' }, // Daily at midnight
  async () => {
    const { sql } = await import('@/lib/db');
    
    // Archive conversations inactive for 30 days
    await sql`
      UPDATE conversations 
      SET status = 'archived' 
      WHERE updated_at < NOW() - INTERVAL '30 days' 
      AND status = 'active'
    `;
    
    return { cleaned: true };
  }
);