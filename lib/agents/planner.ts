import Groq from 'groq-sdk';
import { availableTools, executeTool } from './tools';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Model fallbacks (same as brain.ts)
const ANALYSIS_MODELS = [
  'llama-3.3-8b-instant',
  'llama-3.1-8b-instant', 
  'gemma2-9b-it'
];

const PLANNING_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.3-70b-specdec',
  'mixtral-8x7b-32768'
];

export interface PlanStep {
  id: string;
  type: 'thought' | 'action' | 'observation' | 'final';
  content: string;
  tool?: string;
  toolParams?: any;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface ExecutionPlan {
  originalQuery: string;
  steps: PlanStep[];
  finalAnswer?: string;
  confidence: number;
}

export async function createAndExecutePlan(
  query: string, 
  context: {
    userId: string;
    conversationHistory: any[];
    retrievedDocs?: string;
  },
  onStep?: (step: PlanStep) => void
): Promise<ExecutionPlan> {
  
  const plan: ExecutionPlan = {
    originalQuery: query,
    steps: [],
    confidence: 0
  };

  console.log(`[Planner] Creating plan for: "${query}"`);

  // Step 1: Analyze complexity with fallback
  const complexity = await analyzeComplexity(query, context);
  
  if (complexity === 'simple') {
    const step: PlanStep = {
      id: '1',
      type: 'final',
      content: 'Direct response to simple query',
      status: 'pending'
    };
    plan.steps.push(step);
    onStep?.(step);
    
    const response = await generateDirectResponse(query, context);
    step.status = 'completed';
    step.result = response;
    plan.finalAnswer = response;
    plan.confidence = 0.8;
    
    return plan;
  }

  // Complex query - Decompose with fallback models
  const decomposition = await decomposeQuery(query, context);
  console.log(`[Planner] Decomposed into ${decomposition.steps.length} steps`);

  // Execute each step
  for (let i = 0; i < decomposition.steps.length; i++) {
    const stepDef = decomposition.steps[i];
    
    const thoughtStep: PlanStep = {
      id: `step-${i}-thought`,
      type: 'thought',
      content: stepDef.reasoning,
      status: 'running'
    };
    plan.steps.push(thoughtStep);
    onStep?.(thoughtStep);

    if (stepDef.tool) {
      const actionStep: PlanStep = {
        id: `step-${i}-action`,
        type: 'action',
        content: `Executing ${stepDef.tool}`,
        tool: stepDef.tool,
        toolParams: stepDef.params,
        status: 'running'
      };
      plan.steps.push(actionStep);
      onStep?.(actionStep);

      try {
        const toolResult = await executeTool(stepDef.tool, stepDef.params);
        actionStep.status = 'completed';
        actionStep.result = toolResult;
        onStep?.(actionStep);

        const obsStep: PlanStep = {
          id: `step-${i}-obs`,
          type: 'observation',
          content: `Tool returned data`,
          status: 'completed',
          result: toolResult
        };
        plan.steps.push(obsStep);
        onStep?.(obsStep);

      } catch (error) {
        actionStep.status = 'failed';
        actionStep.result = (error as Error).message;
        onStep?.(actionStep);
      }
    }
    
    thoughtStep.status = 'completed';
  }

  // Synthesize final answer with fallback
  const finalStep: PlanStep = {
    id: 'final',
    type: 'final',
    content: 'Synthesizing final response',
    status: 'running'
  };
  plan.steps.push(finalStep);
  onStep?.(finalStep);

  const finalAnswer = await synthesizeResponse(query, plan.steps, context);
  finalStep.status = 'completed';
  finalStep.result = finalAnswer;
  plan.finalAnswer = finalAnswer;
  plan.confidence = calculateConfidence(plan.steps);

  return plan;
}

async function analyzeComplexity(query: string, context: any): Promise<'simple' | 'complex'> {
  const prompt = `Analyze if this query requires multiple steps or external tools:
Query: "${query}"

Simple: Greeting, general knowledge, FAQ, opinion
Complex: Requires database lookup, calculations, multiple pieces of info, API calls

Respond with ONLY "simple" or "complex".`;

  for (const model of ANALYSIS_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: model,
        temperature: 0,
        max_tokens: 10,
      });

      const result = completion.choices[0]?.message?.content?.toLowerCase() || 'simple';
      if (!result.includes('decommissioned')) {
        return result.includes('complex') ? 'complex' : 'simple';
      }
    } catch (error: any) {
      if (error.message?.includes('decommissioned')) continue;
      return 'simple';
    }
  }
  return 'simple';
}

async function decomposeQuery(query: string, context: any) {
  const toolsDesc = availableTools.map(t => 
    `- ${t.name}: ${t.description}`
  ).join('\n');

  const prompt = `Break down this query into steps. Available tools:
${toolsDesc}

Query: "${query}"

Respond in JSON:
{
  "steps": [
    {
      "reasoning": "why this step",
      "tool": "tool_name or null",
      "params": { "param": "value" }
    }
  ]
}`;

  for (const model of PLANNING_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: model,
        temperature: 0.1,
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content || '{"steps":[]}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      return { steps: parsed.steps || [] };
      
    } catch (error: any) {
      if (error.message?.includes('decommissioned')) continue;
      return { steps: [{ reasoning: 'Direct response', tool: null, params: {} }] };
    }
  }
  
  return { steps: [{ reasoning: 'Direct response', tool: null, params: {} }] };
}

async function generateDirectResponse(query: string, context: any): Promise<string> {
  const messages = [
    { role: 'system', content: 'You are a helpful assistant. ' + (context.retrievedDocs || '') },
    ...context.conversationHistory.slice(-3),
    { role: 'user', content: query }
  ];

  for (const model of PLANNING_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        messages: messages as any,
        model: model,
        temperature: 0.7,
        max_tokens: 1024,
      });
      return completion.choices[0]?.message?.content || "I couldn't generate a response.";
    } catch (error: any) {
      if (error.message?.includes('decommissioned')) continue;
      return "I apologize, I couldn't process that request.";
    }
  }
  return "I apologize, I couldn't process that request.";
}

async function synthesizeResponse(query: string, steps: PlanStep[], context: any): Promise<string> {
  const toolResults = steps
    .filter(s => s.type === 'observation')
    .map(s => s.result);

  const prompt = `Synthesize final answer based on executed steps.

Original Query: "${query}"

Steps: ${steps.map(s => `- ${s.type}: ${s.content}`).join('\n')}

Tool Results: ${JSON.stringify(toolResults).substring(0, 500)}`;

  for (const model of PLANNING_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: model,
        temperature: 0.7,
        max_tokens: 1024,
      });
      return completion.choices[0]?.message?.content || "I've processed your request.";
    } catch (error: any) {
      if (error.message?.includes('decommissioned')) continue;
      return "I've processed your request.";
    }
  }
  return "I've processed your request.";
}

function calculateConfidence(steps: PlanStep[]): number {
  const completed = steps.filter(s => s.status === 'completed').length;
  const total = steps.length;
  if (total === 0) return 0;
  
  let score = completed / total;
  const hasFailures = steps.some(s => s.status === 'failed');
  if (!hasFailures) score += 0.1;
  
  return Math.min(score, 1.0);
}