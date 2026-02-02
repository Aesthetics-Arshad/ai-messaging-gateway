'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: any[];
  isStreaming?: boolean;
  metadata?: any;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'streaming'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = useRef(`user-${Math.random().toString(36).substr(2, 9)}`);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setConnectionStatus('connecting');

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      steps: [],
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          userId: userId.current,
          platform: 'web',
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let currentSteps: any[] = [];

      setConnectionStatus('streaming');

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventType = line.match(/event: (\w+)/)?.[1];
            const dataMatch = line.match(/data: ({.+})/);
            
            if (dataMatch) {
              try {
                const data = JSON.parse(dataMatch[1]);
                
                switch (eventType) {
                  case 'status':
                    currentSteps.push({ type: 'status', ...data });
                    updateMessageSteps(assistantMessageId, currentSteps);
                    break;
                    
                  case 'step':
                    currentSteps.push(data);
                    updateMessageSteps(assistantMessageId, currentSteps);
                    break;
                    
                  case 'retrieval':
                    currentSteps.push({ type: 'retrieval', ...data });
                    updateMessageSteps(assistantMessageId, currentSteps);
                    break;
                    
                  case 'progress':
                    currentSteps.push({ type: 'progress', ...data });
                    updateMessageSteps(assistantMessageId, currentSteps);
                    break;
                    
                  case 'complete':
                    fullResponse = data.response;
                    completeMessage(assistantMessageId, fullResponse, data, currentSteps);
                    setConnectionStatus('idle');
                    break;
                    
                  case 'error':
                    completeMessage(assistantMessageId, `Error: ${data.message}`, null, currentSteps);
                    setConnectionStatus('idle');
                    break;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

    } catch (error) {
      completeMessage(assistantMessageId, 'Sorry, I encountered an error. Please try again.', null, []);
      setConnectionStatus('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMessageSteps = (id: string, steps: any[]) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, steps } : msg
    ));
  };

  const completeMessage = (id: string, content: string, metadata: any, steps: any[]) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { 
        ...msg, 
        content, 
        isStreaming: false, 
        metadata,
        steps 
      } : msg
    ));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex h-screen max-w-6xl flex-col px-4 py-6 md:px-8">
        <header className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">AI Agent Orchestrator</h1>
            <p className="mt-1 text-xs text-slate-400 md:text-sm">
              Orchestrated multi-step reasoning with RAG, tools, and platform webhooks.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs md:text-sm">
            <span
              className={`flex items-center gap-1 rounded-full px-3 py-1 ${
                connectionStatus === 'streaming'
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connectionStatus === 'streaming' ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
              />
              {connectionStatus === 'streaming' ? 'Streaming response' : 'Idle'}
            </span>
            <a
              href="/dashboard"
              className="hidden rounded-full border border-white/10 px-3 py-1 text-slate-100 hover:bg-white/5 md:inline-flex"
            >
              Dashboard
            </a>
          </div>
        </header>

        <div className="mt-4 flex flex-1 gap-4 md:gap-6">
          <aside className="hidden w-64 flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-200 shadow-sm md:flex">
            <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
              <span>Session</span>
              <span className="font-mono text-[10px] text-slate-500">ID: {userId.current.slice(-6)}</span>
            </div>
            <p className="text-xs text-slate-300">
              This panel can later show conversation history, platform breakdowns, or step-by-step traces for
              debugging.
            </p>
            <div className="mt-4 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>RAG</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Webhooks</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Inngest</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300">Jobs</span>
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-slate-900/60 shadow-sm">
            <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
              {messages.length === 0 && (
                <div className="mt-10 text-center text-slate-400">
                  <h2 className="text-xl font-medium text-slate-100 md:text-2xl">Welcome to your AI workspace</h2>
                  <p className="mt-2 text-sm md:text-base">
                    Ask a question to kick off a multi-step workflow. I’ll plan, retrieve, and respond.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xl rounded-2xl px-4 py-3 text-sm md:text-base ${
                      message.role === 'user'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'border border-white/10 bg-slate-900 text-slate-50'
                    }`}
                  >
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-300/80">
                      {message.role === 'user' ? 'You' : 'AI Agent'}
                    </div>

                    <div className="whitespace-pre-wrap leading-relaxed">
                      {message.content || (message.isStreaming && 'Thinking...')}
                    </div>

                    {message.steps && message.steps.length > 0 && (
                      <div className="mt-3 border-t border-white/10 pt-2 text-xs text-slate-300">
                        <div className="mb-1 font-medium text-slate-200/90">Recent reasoning steps</div>
                        <div className="space-y-1">
                          {message.steps.slice(-3).map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {step.type === 'status' && <span>⏳ {step.message}</span>}
                              {step.type === 'thought' && <span>💭 Thinking…</span>}
                              {step.type === 'action' && <span>🔧 Executing: {step.tool}</span>}
                              {step.type === 'retrieval' && <span>📚 Found {step.count} documents</span>}
                              {step.type === 'progress' && (
                                <span>
                                  🔄 Step {step.step}/{step.total}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.metadata && (
                      <div className="mt-2 text-[11px] text-slate-400">
                        Confidence: {Math.round(message.metadata.confidence * 100)}% ·{' '}
                        {message.metadata.executionTime}ms
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/10 bg-slate-950/70 p-3 md:p-4">
              <form onSubmit={handleSubmit} className="flex w-full max-w-3xl items-center gap-2 md:gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about your product, users, or data…"
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 md:px-4 md:py-2.5"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 md:px-5 md:py-2.5"
                >
                  {isLoading ? 'Processing…' : 'Send'}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}