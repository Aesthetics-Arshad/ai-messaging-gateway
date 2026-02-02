import { Inngest } from 'inngest';

export const inngest = new Inngest({ 
  id: 'ai-messaging-gateway',
  name: 'AI Messaging Gateway',
  eventKey: process.env.INNGEST_EVENT_KEY || 'local',
});