import { createAndExecutePlan, ExecutionPlan, PlanStep } from './planner';
import { processImage, transcribeAudio, getTelegramFileUrl } from './multimodal';
import { queryPinecone } from './rag';
import { sql } from '@/lib/db';
import { EventEmitter } from 'events';

interface WorkflowState {
  id: string;
  userId: string;
  platform: string;
  status: 'initialized' | 'analyzing' | 'retrieving' | 'planning' | 'executing' | 'synthesizing' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  context: {
    originalMessage: string;
    processedMessage?: string;
    retrievedDocs?: any[];
    plan?: ExecutionPlan;
    multimodalData?: any;
  };
  results: any[];
  errors: string[];
  startTime: number;
  lastUpdate: number;
}

/**
 * Enterprise Workflow Orchestrator
 * Manages complex multi-step AI workflows with state persistence
 */
export class WorkflowOrchestrator extends EventEmitter {
  private activeWorkflows: Map<string, WorkflowState> = new Map();

  /**
   * Initialize a new workflow
   */
  async initializeWorkflow(
    messageId: string,
    userId: string,
    platform: string,
    content: string,
    metadata?: any
  ): Promise<WorkflowState> {
    const workflow: WorkflowState = {
      id: messageId,
      userId,
      platform,
      status: 'initialized',
      currentStep: 0,
      totalSteps: 0,
      context: {
        originalMessage: content,
      },
      results: [],
      errors: [],
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };

    // Handle multimodal preprocessing
    if (metadata?.file_id && (metadata?.message_type === 'image' || metadata?.message_type === 'audio')) {
      workflow.status = 'analyzing';
      try {
        const fileUrl = await getTelegramFileUrl(metadata.file_id);
        
        if (metadata.message_type === 'image') {
          workflow.context.multimodalData = await processImage(fileUrl, metadata.caption);
        } else if (metadata.message_type === 'audio') {
          workflow.context.multimodalData = await transcribeAudio(fileUrl);
        }
        
        workflow.context.processedMessage = workflow.context.multimodalData;
      } catch (error) {
        workflow.errors.push(`Multimodal processing failed: ${(error as Error).message}`);
        workflow.context.processedMessage = content;
      }
    } else {
      workflow.context.processedMessage = content;
    }

    this.activeWorkflows.set(messageId, workflow);
    return workflow;
  }

  /**
   * Execute workflow step by step with streaming updates
   */
  async *executeWorkflow(messageId: string): AsyncGenerator<{type: string; data: any}> {
    const workflow = this.activeWorkflows.get(messageId);
    if (!workflow) throw new Error('Workflow not found');

    const stepsBuffer: PlanStep[] = [];

    try {
      // Step 1: Retrieve Knowledge (RAG)
      yield { type: 'status', data: { status: 'retrieving', message: 'Searching knowledge base...' } };
      workflow.status = 'retrieving';
      
      const docs = await queryPinecone(workflow.context.processedMessage!, 3);
      workflow.context.retrievedDocs = docs;
      
      if (docs.length > 0) {
        yield { type: 'retrieval', data: { sources: docs.map(d => d.source), count: docs.length } };
      }

      // Step 2: Create Plan with step tracking via EventEmitter
      yield { type: 'status', data: { status: 'planning', message: 'Planning approach...' } };
      workflow.status = 'planning';

      const conversationHistory = await this.getConversationHistory(workflow.userId);
      
      // Create custom event handler to capture steps
      const handleStep = (step: PlanStep) => {
        stepsBuffer.push(step);
        // Emit for external listeners
        this.emit('step', { workflowId: messageId, step });
      };

      const plan = await createAndExecutePlan(
        workflow.context.processedMessage!,
        {
          userId: workflow.userId,
          conversationHistory,
          retrievedDocs: docs.map(d => d.text).join('\n\n'),
        },
        handleStep
      );

      workflow.context.plan = plan;
      workflow.totalSteps = plan.steps.length;

      // Yield all buffered steps
      for (const step of stepsBuffer) {
        yield { type: 'step', data: step };
      }

      // Step 3: Execute Plan
      yield { type: 'status', data: { status: 'executing', message: 'Executing plan...' } };
      workflow.status = 'executing';

      for (let i = 0; i < plan.steps.length; i++) {
        workflow.currentStep = i + 1;
        const step = plan.steps[i];
        
        yield { 
          type: 'progress', 
          data: { 
            step: i + 1, 
            total: plan.steps.length, 
            description: step.content 
          } 
        };

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Step 4: Final Response
      workflow.status = 'completed';
      workflow.results.push(plan.finalAnswer);

      yield { 
        type: 'complete', 
        data: { 
          response: plan.finalAnswer,
          confidence: plan.confidence,
          toolsUsed: plan.steps.filter(s => s.tool).length,
          executionTime: Date.now() - workflow.startTime
        } 
      };

    } catch (error) {
      workflow.status = 'failed';
      workflow.errors.push((error as Error).message);
      yield { type: 'error', data: { message: (error as Error).message } };
    } finally {
      workflow.lastUpdate = Date.now();
      setTimeout(() => this.activeWorkflows.delete(messageId), 300000);
    }
  }

  /**
   * Stream response tokens in real-time
   */
  async *streamResponse(messageId: string, response: string): AsyncGenerator<string> {
    const chunks = response.split(/(\s+)/);
    for (const chunk of chunks) {
      yield chunk;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }

  async getConversationHistory(userId: string, limit = 5): Promise<any[]> {
    try {
      const userResult = await sql`SELECT id FROM users WHERE platform_user_id = ${userId}`;
      if ((userResult as any[]).length === 0) return [];
      
      const userDbId = (userResult as any[])[0].id;
      
      const convResult = await sql`
        SELECT m.role, m.content 
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id = ${userDbId}
        ORDER BY m.created_at DESC
        LIMIT ${limit}
      `;
      
      return (convResult as any[]).reverse();
    } catch (error) {
      return [];
    }
  }

  getWorkflowStatus(messageId: string): WorkflowState | undefined {
    return this.activeWorkflows.get(messageId);
  }

  async cancelWorkflow(messageId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(messageId);
    if (workflow) {
      workflow.status = 'failed';
      workflow.errors.push('Cancelled by user');
      return true;
    }
    return false;
  }
}

// Singleton instance
export const orchestrator = new WorkflowOrchestrator();