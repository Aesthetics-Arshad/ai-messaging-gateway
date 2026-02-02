import Groq from 'groq-sdk';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

/**
 * Process image using Vision model (Llama 4 via Groq)
 */
export async function processImage(imageUrl: string, caption?: string): Promise<string> {
  const visionModels = [
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct'
  ];
  
  let lastError;
  
  for (const model of visionModels) {
    try {
      console.log(`🖼️ Processing image with model: ${model}`);
      
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: caption || 'Describe what you see in this image in detail.'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        model: model,
        max_tokens: 1024,
        temperature: 0.1,
      });
      
      const description = completion.choices[0]?.message?.content || "I couldn't analyze this image.";
      console.log('✅ Image analyzed:', description.substring(0, 100) + '...');
      return `[Image Analysis]: ${description}`;
      
    } catch (error: any) {
      console.error(`❌ Model ${model} failed:`, error.message || error);
      lastError = error;
      if (error.message?.includes('decommissioned') || error.message?.includes('not found')) {
        continue;
      } else {
        break;
      }
    }
  }
  
  return `[Error: Could not process image - ${lastError?.message || 'All vision models failed'}]`;
}

/**
 * Transcribe audio using Whisper (via Groq) with fallback models
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  // Telegram voice messages are .oga (Ogg Audio), but we need to handle them properly
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `audio-${Date.now()}.oga`);
  
  try {
    console.log('🎵 Downloading audio:', audioUrl);
    
    // Download audio file
    const response = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 20 * 1024 * 1024 // 20MB max
    });
    
    // Save to temp file (Groq SDK needs a file path or stream in Node.js)
    fs.writeFileSync(tempFile, Buffer.from(response.data));
    console.log('📁 Audio saved to:', tempFile);
    
    // Try multiple models in case one fails
    const models = ['whisper-large-v3', 'whisper-large-v3-turbo'];
    let lastError;
    
    for (const model of models) {
      try {
        console.log(`🎵 Transcribing with ${model}...`);
        
        const transcription = await groq.audio.transcriptions.create({
          file: fs.createReadStream(tempFile),
          model: model,
          response_format: 'text',
          language: 'en'
        });
        
        const text = transcription.text || '';
        console.log('✅ Audio transcribed:', text.substring(0, 100) + '...');
        
        // Cleanup
        fs.unlinkSync(tempFile);
        
        return `[Transcribed Audio]: ${text}`;
        
      } catch (err: any) {
        console.error(`❌ Model ${model} failed:`, err.message);
        lastError = err;
        if (err.message?.includes('decommissioned')) continue;
        break;
      }
    }
    
    fs.unlinkSync(tempFile);
    return `[Error: Could not transcribe audio - ${lastError?.message}]`;
    
  } catch (error: any) {
    // Cleanup on error
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    console.error('❌ Transcription error:', error);
    return `[Error: Could not transcribe audio - ${error.message}]`;
  }
}

/**
 * Process video by extracting audio and transcribing
 */
export async function processVideo(videoUrl: string, caption?: string): Promise<string> {
  const tempDir = os.tmpdir();
  const videoFile = path.join(tempDir, `video-${Date.now()}.mp4`);
  
  try {
    console.log('🎬 Processing video:', videoUrl);
    
    // Download video
    const response = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxContentLength: 50 * 1024 * 1024 // 50MB max
    });
    
    fs.writeFileSync(videoFile, Buffer.from(response.data));
    console.log('📁 Video downloaded to temporary storage');

    // NOTE: On Vercel, we avoid using ffmpeg or spawning child processes.
    // Whisper via Groq can often handle common video containers directly,
    // so we pass the video file as-is for audio transcription.
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(videoFile),
      model: 'whisper-large-v3',
      response_format: 'text',
      language: 'en'
    });
    
    const text = transcription.text || '';
    console.log('✅ Video audio transcribed:', text.substring(0, 100) + '...');
    
    // Cleanup
    fs.unlinkSync(videoFile);
    
    const captionText = caption ? `Caption: "${caption}"\n` : '';
    return `[Video Analysis]:\n${captionText}Audio Transcription: ${text}`;
    
  } catch (error: any) {
    // Cleanup
    if (fs.existsSync(videoFile)) fs.unlinkSync(videoFile);
    
    console.error('❌ Video processing error:', error);
    return `[Error: Could not process video - ${error.message}. Note: Video processing is limited in this environment and large or unsupported video formats may fail.]`;
  }
}

/**
 * Get file URL from Telegram
 */
export async function getTelegramFileUrl(fileId: string): Promise<string> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN || '';
    
    if (!token) {
      throw new Error('Telegram token not configured');
    }
    
    // FIXED: Removed space between 'bot' and token
    const response = await axios.get(
      `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`,
      { timeout: 30000 }
    );
    
    if (!response.data.ok) {
      throw new Error(`Telegram API error: ${response.data.description}`);
    }
    
    const filePath = response.data.result.file_path;
    // FIXED: Removed space here too
    const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    
    console.log('📁 File URL obtained:', fileUrl);
    return fileUrl;
  } catch (error) {
    console.error('❌ Error getting file URL:', error);
    throw error;
  }
}

/**
 * Check if content is multimodal
 */
export function isMultimodalMessage(type: string): boolean {
  return type === 'image' || type === 'audio' || type === 'video';
}

/**
 * Format multimodal content for AI processing
 */
export function formatMultimodalContent(
  originalContent: string, 
  processedContent: string,
  type: string
): string {
  if (type === 'image') {
    return `User sent an image${originalContent !== '[Image]' ? ` with caption: "${originalContent}"` : ''}\n\nImage description: ${processedContent}`;
  } else if (type === 'audio') {
    return `User sent a voice message. ${processedContent}`;
  } else if (type === 'video') {
    return `User sent a video. ${processedContent}`;
  }
  return processedContent;
}