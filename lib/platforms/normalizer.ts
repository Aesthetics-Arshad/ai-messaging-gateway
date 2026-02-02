import { UnifiedMessage, Platform } from '@/types';

export function normalizeMessage(body: any, platform: Platform): UnifiedMessage {
  switch (platform) {
    case 'whatsapp':
      return normalizeWhatsApp(body);
    case 'telegram':
      return normalizeTelegram(body);
    case 'instagram':
      return normalizeInstagram(body);
    case 'linkedin':
      return normalizeLinkedIn(body);
    case 'snapchat':
      return normalizeSnapchat(body);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

export function normalizeWhatsApp(body: any): UnifiedMessage {
  try {
    const entry = body.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    
    if (!message) throw new Error('No message in WhatsApp payload');
    
    let content = '';
    let type: 'text' | 'image' | 'audio' = 'text';
    let mediaId: string | undefined;
    
    if (message.type === 'text') {
      content = message.text?.body || '';
    } else if (message.type === 'image') {
      content = message.image?.caption || '[Image]';
      type = 'image';
      mediaId = message.image?.id;
    } else if (message.type === 'audio' || message.type === 'voice') {
      content = '[Audio Message]';
      type = 'audio';
      mediaId = message.voice?.id || message.audio?.id;
    } else if (message.type === 'video') {
      content = message.video?.caption || '[Video]';
      type = 'image'; // Treat as image for processing
      mediaId = message.video?.id;
    }
    
    return {
      platform: 'whatsapp',
      user_id: message.from,
      conversation_id: message.from,
      message_id: message.id,
      message_type: type,
      content: content,
      timestamp: parseInt(message.timestamp) * 1000,
      metadata: {
        phone_number_id: entry.metadata?.phone_number_id,
        display_name: entry.contacts?.[0]?.profile?.name,
        media_id: mediaId,
        caption: message.caption
      }
    };
  } catch (error) {
    console.error('WhatsApp normalization error:', error);
    throw error;
  }
}

export function normalizeTelegram(body: any): UnifiedMessage {
  try {
    const msg = body.message || body.edited_message;
    if (!msg) throw new Error('No message in Telegram payload');
    
    const chat = msg.chat;
    let content = '';
    let type: 'text' | 'image' | 'audio' = 'text';
    let fileId: string | undefined;
    
    if (msg.text) {
      content = msg.text;
      type = 'text';
    } else if (msg.photo && msg.photo.length > 0) {
      // Get the largest photo (best quality)
      const largestPhoto = msg.photo[msg.photo.length - 1];
      fileId = largestPhoto.file_id;
      content = msg.caption || '[Image]';
      type = 'image';
    } else if (msg.voice) {
      fileId = msg.voice.file_id;
      content = msg.caption || '[Voice Message]';
      type = 'audio';
    } else if (msg.audio) {
      fileId = msg.audio.file_id;
      content = msg.caption || '[Audio File]';
      type = 'audio';
    } else if (msg.video) {
      fileId = msg.video.file_id;
      content = msg.caption || '[Video]';
      type = 'image';
    } else if (msg.document) {
      fileId = msg.document.file_id;
      content = msg.document.file_name || '[Document]';
      type = 'text'; // Treat as text for now
    }
    
    return {
      platform: 'telegram',
      user_id: String(msg.from.id),
      conversation_id: String(chat.id),
      message_id: String(msg.message_id),
      message_type: type,
      content: content,
      timestamp: msg.date * 1000,
      metadata: {
        chat_type: chat.type,
        username: msg.from.username,
        first_name: msg.from.first_name,
        last_name: msg.from.last_name,
        file_id: fileId,
        caption: msg.caption,
        mime_type: msg.document?.mime_type || msg.audio?.mime_type || msg.voice?.mime_type,
        file_size: msg.document?.file_size || msg.audio?.file_size
      }
    };
  } catch (error) {
    console.error('Telegram normalization error:', error);
    throw error;
  }
}

export function normalizeInstagram(body: any): UnifiedMessage {
  try {
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    
    if (!messaging) throw new Error('No messaging in Instagram payload');
    
    const message = messaging.message;
    let type: 'text' | 'image' | 'audio' = 'text';
    let content = '';
    
    if (message.text) {
      content = message.text;
      type = 'text';
    } else if (message.attachments) {
      const attachment = message.attachments[0];
      if (attachment.type === 'image') {
        content = '[Image]';
        type = 'image';
      } else if (attachment.type === 'audio') {
        content = '[Audio]';
        type = 'audio';
      } else if (attachment.type === 'video') {
        content = '[Video]';
        type = 'image';
      }
    }
    
    return {
      platform: 'instagram',
      user_id: messaging.sender.id,
      conversation_id: messaging.sender.id,
      message_id: message.mid,
      message_type: type,
      content: content,
      timestamp: messaging.timestamp,
      metadata: {
        recipient_id: messaging.recipient.id,
        attachment_url: message.attachments?.[0]?.payload?.url
      }
    };
  } catch (error) {
    console.error('Instagram normalization error:', error);
    throw error;
  }
}

export function normalizeLinkedIn(body: any): UnifiedMessage {
  try {
    const event = body.event || body.value?.event;
    
    if (!event) throw new Error('No event in LinkedIn payload');
    
    return {
      platform: 'linkedin',
      user_id: event.createdBy || event.actor,
      conversation_id: event.conversation || event.conversationUrn,
      message_id: event.id,
      message_type: 'text',
      content: event.content?.message || event.body || '',
      timestamp: event.createdAt || Date.now(),
      metadata: {
        organization: body.organization,
        message_type: event.content?.type || 'text',
        subject: event.content?.subject
      }
    };
  } catch (error) {
    console.error('LinkedIn normalization error:', error);
    throw error;
  }
}

export function normalizeSnapchat(body: any): UnifiedMessage {
  try {
    const message = body.message || body;
    
    let type: 'text' | 'image' | 'audio' = 'text';
    let content = message.text || '';
    
    if (message.type === 'IMAGE' || message.snap_type === 'IMAGE') {
      type = 'image';
      content = content || '[Snap Image]';
    } else if (message.type === 'VIDEO' || message.snap_type === 'VIDEO') {
      type = 'image'; // Treat video as image for processing
      content = content || '[Snap Video]';
    } else if (message.type === 'AUDIO') {
      type = 'audio';
      content = content || '[Voice Note]';
    }
    
    return {
      platform: 'snapchat',
      user_id: message.from_id || message.sender_id,
      conversation_id: message.conversation_id || message.to_id,
      message_id: message.id || message.message_id,
      message_type: type,
      content: content,
      timestamp: message.timestamp || Date.now(),
      metadata: {
        snap_id: message.snap_id,
        media_url: message.media_url,
        screenshot_count: message.screenshot_count
      }
    };
  } catch (error) {
    console.error('Snapchat normalization error:', error);
    throw error;
  }
}