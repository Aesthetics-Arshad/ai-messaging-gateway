import Groq from 'groq-sdk';
import { UnifiedMessage, AgentResponse } from '@/types';
import { getOrCreateConversation, saveMessage, getRecentMessages } from '@/lib/db';
import { queryPinecone } from './rag';
import { 
  processImage, 
  transcribeAudio, 
  processVideo,
  getTelegramFileUrl, 
  isMultimodalMessage,
  formatMultimodalContent 
} from './multimodal';
import { shouldUseTool } from './tools';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Available models with fallback priority (matching multimodal.ts pattern)
const PRIMARY_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.3-70b-specdec',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768'
];

const FAST_MODELS = [
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'mixtral-8x7b-32768'
];

export async function processWithBrain(message: UnifiedMessage): Promise<AgentResponse> {
  const startTime = Date.now();
  
  try {
    console.log(`[Brain] Processing ${message.message_type} message from ${message.platform}`);
    
    // Step 1: Handle multimodal content (images/audio)
    let processedContent = message.content;
    let multimodalContext = '';
    
    if (isMultimodalMessage(message.message_type) && message.metadata?.file_id) {
      console.log('[Brain] Detected multimodal content, processing...');
      
      try {
        const fileUrl = await getTelegramFileUrl(message.metadata.file_id);
        
        if (message.message_type === 'image') {
          const imageAnalysis = await processImage(fileUrl, message.metadata.caption);
          multimodalContext = imageAnalysis;
          processedContent = formatMultimodalContent(
            message.content, 
            imageAnalysis, 
            'image'
          );
        } else if (message.message_type === 'audio') {
          const transcription = await transcribeAudio(fileUrl);
          multimodalContext = transcription;
          processedContent = formatMultimodalContent(
            message.content,
            transcription,
            'audio'
          );
        } else if (message.message_type === 'video') {
          const videoAnalysis = await processVideo(fileUrl, message.metadata.caption);
          multimodalContext = videoAnalysis;
          processedContent = formatMultimodalContent(
            message.content,
            videoAnalysis,
            'video'
          );
        }
      } catch (error) {
        console.error('[Brain] Multimodal processing error:', error);
        multimodalContext = '[Error processing media]';
      }
    }
    
    // Step 2: Get or create conversation
    const convId = await getOrCreateConversation(
      message.platform, 
      message.user_id,
      message.metadata?.username || message.metadata?.first_name
    );
    
    // Step 3: Get chat history
    const history = await getRecentMessages(convId, 5);
    
    // Step 4: Check if we need RAG (Retrieval Augmented Generation)
    let retrievedContext = '';
    let usedRag = false;
    
    if (shouldRetrieveContext(processedContent)) {
      console.log('[Brain] Retrieving knowledge base...');
      const retrieval = await queryPinecone(processedContent, 3);
      
      if (retrieval.length > 0) {
        retrievedContext = retrieval
          .map(r => `[Source: ${r.source} (Score: ${(r.score * 100).toFixed(1)}%)]\n${r.text}`)
          .join('\n\n');
        usedRag = true;
        console.log(`[Brain] Found ${retrieval.length} relevant documents`);
      } else {
        console.log('[Brain] No relevant documents found (zero-hallucination mode active)');
      }
    }
    
    // Step 5: Check if we need tools
    let toolResults: string[] = [];
    if (shouldUseTool(processedContent)) {
      console.log('[Brain] Tools may be needed');
    }
    
    // Step 6: Build system prompt with strict RAG enforcement
    const systemPrompt = buildSystemPrompt({
      context: retrievedContext,
      multimodal: multimodalContext,
      tools: toolResults,
      strictMode: true
    });
    
    // Step 7: Build conversation history
    const messages: Array<{role: string; content: string}> = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ 
        role: h.role, 
        content: h.content 
      })),
      { role: 'user', content: processedContent }
    ];
    
    // Step 8: Call LLM with fallback models (matching multimodal.ts pattern)
    console.log('[Brain] Calling LLM with fallback...');
    let response: string | null = null;
    let lastError: any;
    let successfulModel = '';
    
    for (const model of PRIMARY_MODELS) {
      try {
        console.log(`[Brain] Trying model: ${model}`);
        const completion = await groq.chat.completions.create({
          messages: messages as any,
          model: model,
          temperature: 0.1,
          max_tokens: 2048,
          top_p: 0.9,
        });
        
        response = completion.choices[0]?.message?.content || null;
        
        if (response) {
          console.log(`✅ Model ${model} succeeded`);
          successfulModel = model;
          break;
        }
        
      } catch (error: any) {
        console.error(`❌ Model ${model} failed:`, error.message);
        lastError = error;
        
        if (error.message?.includes('decommissioned') || 
            error.message?.includes('not found') ||
            error.message?.includes('deprecated') ||
            error.message?.includes('no longer supported')) {
          console.log(`⚠️ Model ${model} deprecated, trying next...`);
          continue;
        } else {
          break;
        }
      }
    }
    
    // If all primary models failed, try fast models
    if (!response) {
      console.log('[Brain] Primary models failed, trying fast models...');
      for (const model of FAST_MODELS) {
        try {
          const completion = await groq.chat.completions.create({
            messages: messages as any,
            model: model,
            temperature: 0.7,
            max_tokens: 1024,
          });
          
          response = completion.choices[0]?.message?.content || null;
          if (response) {
            successfulModel = model;
            break;
          }
        } catch (err) {
          continue;
        }
      }
    }
    
    // Final fallback
    if (!response) {
      response = "I apologize, but I'm experiencing technical difficulties. Please try again.";
    }
    
    console.log(`[Brain] Response generated (${response.length} chars) using ${successfulModel}`);
    
    // Step 9: Save to database with proper metadata typing (your fix)
    const userMetadata: Record<string, any> = {
      original_type: message.message_type,
      processed: processedContent !== message.content
    };
    
    await saveMessage(convId, 'user', message.content, userMetadata);
    
    const assistantMetadata: Record<string, any> = {
      used_rag: usedRag,
      used_multimodal: !!multimodalContext,
      processing_time: Date.now() - startTime,
      confidence: usedRag ? 'high' : 'medium',
      model_used: successfulModel
    };
    
    await saveMessage(convId, 'assistant', response, assistantMetadata);
    
    // Step 10: Return response
    return {
      conversation_id: String(convId),
      response: response,
      confidence: usedRag ? 0.95 : multimodalContext ? 0.9 : 0.75,
      used_rag: usedRag,
      sources: usedRag ? ['knowledge_base'] : undefined
    };
    
  } catch (error) {
    console.error('[Brain] Critical error:', error);
    
    return {
      conversation_id: '0',
      response: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
      confidence: 0,
      used_rag: false
    };
  }
}

function shouldRetrieveContext(query: string): boolean {
  const knowledgeKeywords = [
    'what', 'how', 'when', 'where', 'why', 'who',
    'price', 'cost', 'product', 'service', 'order',
    'company', 'business', 'help', 'support', 'faq',
    'policy', 'refund', 'shipping', 'warranty',
    'feature', 'specification', 'compare', 'difference'
  ];
  
  return knowledgeKeywords.some(k => 
    query.toLowerCase().includes(k.toLowerCase())
  ) && query.length > 3;
}

function buildSystemPrompt({
  context,
  multimodal,
  tools,
  strictMode = true
}: {
  context: string;
  multimodal: string;
  tools: string[];
  strictMode: boolean;
}): string {
  let prompt = `You are a helpful AI assistant for a business. You provide accurate, helpful responses based on available information.`;

  if (multimodal) {
    prompt += `\n\n[MEDIA CONTENT]: ${multimodal}`;
  }

  if (context) {
    prompt += `\n\n[KNOWLEDGE BASE]:\n${context}\n\n[INSTRUCTIONS]: Use ONLY the information in [KNOWLEDGE BASE] to answer. If the answer is not in the [KNOWLEDGE BASE], you MUST say: "I don't have specific information about that in my knowledge base. Please upload relevant documents or contact support for assistance." Do not make up information.`;
  } else if (strictMode) {
    prompt += `\n\n[INSTRUCTIONS]: No specific knowledge base documents are available for this query. Answer based on general conversation context only. If the user is asking specific factual questions about products, services, or company details that you don't have context for, suggest they upload documents or contact support.`;
  }

  if (tools.length > 0) {
    prompt += `\n\n[TOOL DATA]:\n${tools.join('\n')}`;
  }

  if (strictMode) {
    prompt += `\n\n[CRITICAL RULES]:
1. NEVER make up facts, prices, or specific details not in the knowledge base.
2. If uncertain, admit uncertainty rather than guessing.
3. Keep responses concise and professional.
4. If asked about uploading documents, mention you can process .txt and .md files.`;
  }

  return prompt;
}