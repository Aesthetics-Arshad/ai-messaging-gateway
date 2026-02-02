export type Platform = 'whatsapp' | 'telegram' | 'instagram' | 'linkedin' | 'snapchat';

export interface UnifiedMessage {
  platform: Platform;
  user_id: string;
  conversation_id: string;
  message_id: string;
  message_type: 'text' | 'image' | 'audio' | 'video';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  conversation_id: string;
  response: string;
  sources?: string[];
  confidence: number;
  used_rag: boolean;
}