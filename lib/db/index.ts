import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { Redis } from '@upstash/redis';

// Database connections
const sql: NeonQueryFunction<false, false> = neon(process.env.POSTGRES_URL!);

const kv = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export { sql, kv };

// Get or create user and conversation
export async function getOrCreateConversation(
  platform: string, 
  userId: string, 
  username?: string
): Promise<number> {
  try {
    // Check if user exists
    const userResult = await sql`
      SELECT id FROM users 
      WHERE platform = ${platform} AND platform_user_id = ${userId}
    `;
    
    let userId_db: number;
    
    if ((userResult as any[]).length === 0) {
      // Create new user
      const newUser = await sql`
        INSERT INTO users (platform, platform_user_id, username)
        VALUES (${platform}, ${userId}, ${username || null})
        RETURNING id
      `;
      userId_db = (newUser as any[])[0].id;
      console.log(`New user created: ${platform}:${userId}`);
    } else {
      userId_db = (userResult as any[])[0].id;
    }
    
    // Check for active conversation
    let convResult = await sql`
      SELECT id FROM conversations 
      WHERE user_id = ${userId_db} AND status = 'active'
      ORDER BY updated_at DESC LIMIT 1
    `;
    
    if ((convResult as any[]).length === 0) {
      // Create new conversation
      convResult = await sql`
        INSERT INTO conversations (user_id, platform, status)
        VALUES (${userId_db}, ${platform}, 'active')
        RETURNING id
      `;
    }
    
    return (convResult as any[])[0].id;
    
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

// Save message to database
export async function saveMessage(
  conversationId: number, 
  role: 'user' | 'assistant', 
  content: string,
  metadata?: any
): Promise<void> {
  try {
    await sql`
      INSERT INTO messages (conversation_id, role, content, metadata)
      VALUES (${conversationId}, ${role}, ${content}, ${metadata ? JSON.stringify(metadata) : null})
    `;
    
    // Update conversation timestamp
    await sql`
      UPDATE conversations 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${conversationId}
    `;
  } catch (error) {
    console.error('Save message error:', error);
    throw error;
  }
}

// Get recent messages for AI context
export async function getRecentMessages(
  conversationId: number, 
  limit = 5
): Promise<{role: string, content: string, metadata: any, created_at: any}[]> {
  try {
    const result = await sql`
      SELECT role, content, metadata, created_at 
      FROM messages 
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;
    return (result as any[]).reverse();
  } catch (error) {
    console.error('Get messages error:', error);
    return [];
  }
}