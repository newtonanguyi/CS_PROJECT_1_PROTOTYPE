import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { advisoryAPI } from '../services/api';
import { ArrowUpRight, Loader2 } from 'lucide-react';

const ChatAdvisory = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      system: true,
      content:
        'Ask about treatment, prevention, or next steps. If you arrived from a diagnosis, your result context is already included.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const bootstrapDoneRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendToAdvisor = useCallback(
    async (payload) => {
      setLoading(true);
      try {
        const response = await advisoryAPI.chat(payload);
        const botMessage = {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      } catch {
        const errorMessage = {
          role: 'assistant',
          content: 'Could not load advice right now. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (bootstrapDoneRef.current) return;
    const raw = sessionStorage.getItem('tomato_advisory_bootstrap');
    if (!raw) return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (!data?.autoSend || !data?.message) return;
    bootstrapDoneRef.current = true;
    sessionStorage.removeItem('tomato_advisory_bootstrap');

    const userMessage = {
      role: 'user',
      content: data.message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    sendToAdvisor({
      message: data.message,
      location: user?.location || '',
      disease_name: data.disease_name || '',
      from_detection: !!data.from_detection,
      detection_context: data.detection_context || data.message,
    });
  }, [sendToAdvisor, user?.location]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const text = input.trim();
    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await advisoryAPI.chat({
        message: text,
        location: user?.location || '',
      });
      const botMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const errorMessage = {
        role: 'assistant',
        content: 'Could not load advice right now. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900">Advisory</h1>
        <p className="mt-2 text-slate-700">
          Ask about treatment, prevention, or next steps...
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 240px)' }}>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const bubble =
              isUser
                ? 'bg-white border border-slate-200 text-slate-900'
                : m.system
                ? 'bg-accent-50 border border-accent-200 text-slate-900'
                : 'bg-primary-50 border border-primary-100 text-slate-900';
            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${bubble}`}>
                  {m.content}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-primary-50 border border-primary-100 text-slate-900 inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about treatment, prevention, or next steps..."
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={loading || !input.trim()}
              className="h-11 w-11 rounded-2xl bg-primary-600 text-white inline-flex items-center justify-center hover:bg-primary-700 disabled:opacity-60"
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatAdvisory;
