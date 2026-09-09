'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { ChatMessage } from '@/types';
import { generateId } from '@/lib/utils';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, addMessage, isLoading, setIsLoading, clearMessages, updateMessage } = useChatStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    addMessage(userMessage);
    setInputValue('');
    setIsLoading(true);

    try {
      // send conversation context so the assistant has history
      const payload = {
        messages: [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: inputValue },
        ],
        stream: true,
      };

      // create assistant message placeholder so we can stream into it
      const assistantId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      addMessage(assistantMessage);

      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        // fallback to non-stream behavior
        const data = await response.json().catch(() => null);
        const text = data?.response || 'Sorry, something went wrong.';
        updateMessage(assistantId, { content: text });
        return;
      }

      // Read streaming chunks and update assistant message incrementally
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';
      let assistantContent = '';
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = !!readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });

          // process lines (OpenAI sends `data: {...}` lines)
          const parts = buffer.split(/\n\n/);
          buffer = parts.pop() || '';
          for (const part of parts) {
            const line = part.trim();
            if (!line) continue;
            const prefix = 'data: ';
            const startsWithData = line.startsWith(prefix) ? line.slice(prefix.length) : line;
            if (startsWithData === '[DONE]') {
              done = true;
              break;
            }
            try {
              const json = JSON.parse(startsWithData);
              const delta = json?.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
                updateMessage(assistantId, { content: assistantContent });
              }
            } catch (err) {
              console.error('Failed to parse stream chunk', err);
            }
          }
        }
      }

      // finalize: if buffer contains a remaining JSON chunk, try to parse
      if (buffer.trim()) {
        const line = buffer.trim().startsWith('data: ') ? buffer.trim().slice(6) : buffer.trim();
        if (line !== '[DONE]') {
          try {
            const json = JSON.parse(line);
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              updateMessage(assistantId, { content: assistantContent });
            }
          } catch {}
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chatbot Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 z-40"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 w-96 bg-white rounded-lg shadow-2xl flex flex-col z-50 h-96 max-w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-bold text-lg">Ease Assistant</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => clearMessages()}
                className="bg-white text-orange-600 px-2 py-1 rounded hover:opacity-90 text-sm"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-orange-700 p-1 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageCircle size={32} className="mb-2 opacity-50" />
                <p className="text-sm text-center">
                  Hello! I&apos;m Ease Assistant. I can help you with inventory management and business questions.
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-orange-500 text-white rounded-br-none'
                          : 'bg-gray-200 text-gray-900 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="border-t p-4 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
