import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { sendMessage, getMessages } from '../utils/api';

// ── Timestamp formatter ───────────────────────────────────────────────────
function formatTimestamp(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  if (isYesterday) return `Yesterday · ${time}`;
  const sameYear = date.getFullYear() === now.getFullYear();
  const d = date.toLocaleDateString([], {
    day: 'numeric', month: 'short',
    year: sameYear ? undefined : 'numeric'
  });
  return `${d} · ${time}`;
}

// ── Thinking indicator — rotating status phrases with fade animation ──────
// Phrases are purely cosmetic, driven by elapsed time client-side.
// No extra API calls, no backend changes, zero cost.
const THINKING_PHASES = [
  { minMs: 0,    text: 'Reading your question…' },
  { minMs: 1500, text: 'Searching the document…' },
  { minMs: 3500, text: 'Finding relevant sections…' },
  { minMs: 6000, text: 'Putting the answer together…' },
  { minMs: 9000, text: 'Almost there…' },
];

function ThinkingIndicator({ startTime }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let next = 0;
      for (let i = THINKING_PHASES.length - 1; i >= 0; i--) {
        if (elapsed >= THINKING_PHASES[i].minMs) { next = i; break; }
      }
      if (next !== phaseIndex) {
        // Fade out, switch text, fade back in
        setVisible(false);
        setTimeout(() => {
          setPhaseIndex(next);
          setVisible(true);
        }, 200);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [startTime, phaseIndex]);

  return (
    <div className="message assistant">
      <div className="message__avatar">✦</div>
      <div className="message__content">
        <div className="thinking-status" style={{ opacity: visible ? 1 : 0 }}>
          <span className="thinking-status__dot" />
          <span className="thinking-status__text">{THINKING_PHASES[phaseIndex].text}</span>
        </div>
      </div>
    </div>
  );
}

// ── "Thought for N seconds" label shown under the AI response ─────────────
function ThoughtLabel({ durationMs }) {
  if (!durationMs || durationMs < 500) return null;
  const secs = Math.round(durationMs / 1000);
  const label = secs <= 1 ? 'Searched document · 1s'
    : secs < 10 ? `Searched document · ${secs}s`
    : 'Searched document';
  return <div className="thought-label">{label}</div>;
}

function WelcomeMessage({ fileName, userName }) {
  return (
    <div className="welcome-message">
      <div className="welcome-message__avatar">✦</div>
      <div className="welcome-message__bubble">
        <h3>Document loaded</h3>
        <p>
          Hi {userName}! I've read{' '}
          <span className="doc-name">"{fileName}"</span> and I'm ready.
        </p>
        <p>Ask me anything about it — I'll only use what's in the file.</p>
      </div>
    </div>
  );
}

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);

export default function ChatWindow({ thread, user, onNewChat }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (thread?.id) loadMessages();
  }, [thread?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) textareaRef.current?.focus();
  }, [loading]);

  const loadMessages = async () => {
    try {
      const data = await getMessages(thread.id);
      setMessages(data.messages || []);
    } catch {
      setError('Failed to load messages.');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    setError('');
    setLoading(true);
    const startTime = Date.now();
    setLoadingStartTime(startTime);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const tempMsg = { id: 'temp', role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const data = await sendMessage(thread.id, text);
      const durationMs = Date.now() - startTime;

      setMessages(prev => [
        ...prev.filter(m => m.id !== 'temp'),
        { id: Date.now() + '-u', role: 'user', content: text, timestamp: new Date().toISOString() },
        { ...data.message, durationMs }
      ]);
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== 'temp'));
      setError(err.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  const fileIcon = thread.fileName?.endsWith('.pdf') ? '📕'
                 : thread.fileName?.endsWith('.docx') ? '📘' : '📄';

  return (
    <>
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header__file-badge">
          <div className="chat-header__file-icon">{fileIcon}</div>
          <div className="chat-header__info">
            <div className="chat-header__filename">{thread.fileName}</div>
            <div className="chat-header__meta">Document Q&A</div>
          </div>
        </div>
        <button className="chat-header__new" onClick={onNewChat}>+ New</button>
      </div>

      {/* Messages */}
      <div className="messages-container">
        <div className="messages-inner">
          <WelcomeMessage fileName={thread.fileName} userName={user.firstName} />

          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message__avatar">
                {msg.role === 'user' ? initials : '✦'}
              </div>
              <div className="message__content">
                {msg.role === 'assistant' && msg.durationMs && (
                  <ThoughtLabel durationMs={msg.durationMs} />
                )}
                <div className="message__bubble">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                <div className="message__time">{formatTimestamp(msg.timestamp)}</div>
              </div>
            </div>
          ))}

          {loading && loadingStartTime && (
            <ThinkingIndicator startTime={loadingStartTime} />
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0 28px' }}>
          <div className="error-toast">⚠️ {error}</div>
        </div>
      )}

      {/* Input */}
      <div className="input-area">
        <div className="input-area-inner">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about "${thread.fileName}"…`}
              rows={1}
              disabled={loading}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              title="Send (Enter)"
            >
              <SendIcon />
            </button>
          </div>
          <div className="input-hint">Enter to send · Shift+Enter for new line</div>
        </div>
      </div>
    </>
  );
}
