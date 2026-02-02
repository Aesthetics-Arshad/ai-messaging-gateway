import { sql } from '@/lib/db';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  execute: (params: any) => Promise<any>;
}

/**
 * Available tools for the AI agent
 */
export const availableTools: Tool[] = [
  {
    name: 'query_user_orders',
    description: 'Retrieve order history for a specific user',
    parameters: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'The user ID to look up'
        },
        limit: {
          type: 'number',
          description: 'Number of orders to retrieve (default: 5)'
        }
      },
      required: ['user_id']
    },
    execute: async (params: { user_id: string; limit?: number }) => {
      try {
        const limit = params.limit || 5;
        const result = await sql`
          SELECT o.*, u.username, u.platform 
          FROM orders o
          JOIN users u ON o.user_id = u.id
          WHERE u.platform_user_id = ${params.user_id}
          ORDER BY o.created_at DESC
          LIMIT ${limit}
        `;
        return { success: true, data: result, count: result.length };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  },
  
  {
    name: 'get_user_info',
    description: 'Get user profile information',
    parameters: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'The user ID to look up'
        }
      },
      required: ['user_id']
    },
    execute: async (params: { user_id: string }) => {
      try {
        const result = await sql`
          SELECT id, platform, platform_user_id, username, created_at, metadata
          FROM users
          WHERE platform_user_id = ${params.user_id}
          LIMIT 1
        `;
        return { success: true, data: result[0] || null };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  },
  
  {
    name: 'search_conversations',
    description: 'Search through conversation history',
    parameters: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'User ID to search conversations for'
        },
        keyword: {
          type: 'string',
          description: 'Keyword to search for'
        }
      },
      required: ['user_id', 'keyword']
    },
    execute: async (params: { user_id: string; keyword: string }) => {
      try {
        const result = await sql`
          SELECT m.*, c.id as conv_id
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          JOIN users u ON c.user_id = u.id
          WHERE u.platform_user_id = ${params.user_id}
          AND m.content ILIKE ${`%${params.keyword}%`}
          ORDER BY m.created_at DESC
          LIMIT 10
        `;
        return { success: true, data: result, count: result.length };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  },
  
  {
    name: 'get_document_info',
    description: 'Get information about uploaded documents in knowledge base',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      try {
        const result = await sql`
          SELECT filename, chunk_count, pinecone_namespace, created_at
          FROM documents
          ORDER BY created_at DESC
          LIMIT 10
        `;
        return { success: true, data: result, count: result.length };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  }
];

/**
 * Execute a tool by name
 */
export async function executeTool(toolName: string, params: any): Promise<any> {
  const tool = availableTools.find(t => t.name === toolName);
  
  if (!tool) {
    throw new Error(`Tool ${toolName} not found`);
  }
  
  // Validate required parameters
  const missingParams = tool.parameters.required.filter(param => !(param in params));
  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
  }
  
  console.log(`[Tool] Executing ${toolName} with params:`, params);
  const result = await tool.execute(params);
  console.log(`[Tool] ${toolName} result:`, result.success ? 'Success' : 'Failed');
  
  return result;
}

/**
 * Check if message should trigger tool usage
 */
export function shouldUseTool(message: string): boolean {
  const toolKeywords = [
    'order', 'purchase', 'buy', 'shopping',
    'user info', 'profile', 'account',
    'history', 'previous', 'last time',
    'document', 'knowledge base', 'uploaded files'
  ];
  
  return toolKeywords.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Get tool descriptions for LLM context
 */
export function getToolDescriptions(): string {
  return availableTools.map(tool => 
    `- ${tool.name}: ${tool.description}`
  ).join('\n');
}