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
      // Use EventSource for SSE
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
              const data = JSON.parse(dataMatch[1]);
              
              // Process different event types
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">AI Agent Orchestrator</h1>
          <p className="text-sm text-gray-500">
            Powered by Llama 3.1 • {connectionStatus === 'streaming' && 
              <span className="text-blue-500">● Streaming...</span>
            }
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard" className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
            Dashboard
          </a>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <h2 className="text-2xl mb-2">Welcome to the AI Gateway</h2>
            <p>I can help you with complex queries, search knowledge bases, and process images/audio.</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3xl rounded-lg p-4 ${
              message.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white border shadow-sm'
            }`}>
              <div className="text-sm opacity-70 mb-1">
                {message.role === 'user' ? 'You' : 'AI Agent'}
              </div>
              
              <div className="whitespace-pre-wrap">
                {message.content || (message.isStreaming && 'Thinking...')}
              </div>

              {/* Show execution steps */}
              {message.steps && message.steps.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs space-y-1">
                  {message.steps.slice(-3).map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gray-500">
                      {step.type === 'status' && <span>⏳ {step.message}</span>}
                      {step.type === 'thought' && <span>💭 {step.content?.substring(0, 50)}...</span>}
                      {step.type === 'action' && <span>🔧 Executing: {step.tool}</span>}
                      {step.type === 'retrieval' && <span>📚 Found {step.count} documents</span>}
                      {step.type === 'progress' && (
                        <span>🔄 Step {step.step}/{step.total}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Metadata */}
              {message.metadata && (
                <div className="mt-2 text-xs text-gray-400 flex gap-2">
                  <span>Confidence: {Math.round(message.metadata.confidence * 100)}%</span>
                  <span>•</span>
                  <span>{message.metadata.toolsUsed} tools used</span>
                  <span>•</span>
                  <span>{message.metadata.executionTime}ms</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything... (try: 'What's the status of my order?' or upload docs first)"
            className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isLoading ? 'Processing...' : 'Send'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-2">
          Complex queries are automatically decomposed into steps • RAG ensures zero hallucination
        </p>
      </div>
    </div>
  );
}