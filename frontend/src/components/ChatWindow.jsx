import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { sendMessage, getMessages } from '../utils/api';

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function TypingIndicator() {
  return (
    <div className="message assistant">
      <div className="message__avatar">🤖</div>
      <div className="message__content">
        <div className="typing-bubble">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

function WelcomeMessage({ fileName, userName }) {
  return (
    <div className="welcome-message">
      <div className="welcome-message__avatar">🤖</div>
      <div className="welcome-message__bubble">
        <h3>Document loaded!</h3>
        <p>Hi {userName}! I've read <span className="doc-name">"{fileName}"</span> and I'm ready to help.</p>
        <p>Ask me anything about this document — I'll answer based only on what's inside it.</p>
      </div>
    </div>
  );
}

export default function ChatWindow({ thread, user, onNewChat }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (thread?.id) {
      loadMessages();
    }
  }, [thread?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

    // Optimistic UI
    const tempMsg = { id: 'temp', role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const data = await sendMessage(thread.id, text);
      setMessages(prev => [
        ...prev.filter(m => m.id !== 'temp'),
        { id: Date.now() + '-u', role: 'user', content: text, timestamp: new Date().toISOString() },
        data.message
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
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
  };

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  return (
    <>
      <div className="chat-header">
        <div className="chat-header__file-icon">
          {thread.fileName?.endsWith('.pdf') ? '📕' : thread.fileName?.endsWith('.docx') ? '📘' : '📄'}
        </div>
        <div className="chat-header__info">
          <div className="chat-header__filename">{thread.fileName}</div>
          <div className="chat-header__meta">Document Q&A Session</div>
        </div>
        <button className="chat-header__new" onClick={onNewChat}>
          + New Document
        </button>
      </div>

      <div className="messages-container">
        <WelcomeMessage fileName={thread.fileName} userName={user.firstName} />

        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message__avatar">
              {msg.role === 'user' ? initials : '🤖'}
            </div>
            <div className="message__content">
              <div className="message__bubble">
                {msg.role === 'assistant' ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
              <div className="message__time">{formatTime(msg.timestamp)}</div>
            </div>
          </div>
        ))}

        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="error-toast">
          ⚠️ {error}
        </div>
      )}

      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={`Ask something about "${thread.fileName}"...`}
            rows={1}
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            title="Send (Enter)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <div className="input-hint">Press Enter to send · Shift+Enter for new line</div>
      </div>
    </>
  );
}
