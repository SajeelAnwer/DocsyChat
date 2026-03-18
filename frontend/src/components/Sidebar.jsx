import React, { useState, useRef, useEffect } from 'react';

const DocIcon = () => (
  <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7.414A2 2 0 0017.414 6L14 2.586A2 2 0 0012.586 2H4zm0 2h8v3a1 1 0 001 1h3v9H4V4zm9 .414L15.586 7H13V4.414z"/>
  </svg>
);

// Claude-style pencil/edit icon
const RenameIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// Claude-style star icon — empty
const StarEmptyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// Filled star for starred threads
const StarFilledIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24"
    fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// Gemini-style bin icon
const BinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// Reusable icon button with instant tooltip
function ThreadAction({ icon, tooltip, onClick, className = '' }) {
  return (
    <div className={`thread-action-wrap ${className}`}>
      <button
        className="thread-action-btn"
        onClick={e => { e.stopPropagation(); onClick(); }}
        aria-label={tooltip}
      >
        {icon}
      </button>
      <span className="thread-action-tooltip">{tooltip}</span>
    </div>
  );
}

// Inline rename input — shown instead of title when editing
function RenameInput({ currentTitle, onSave, onCancel }) {
  const [value, setValue] = useState(currentTitle);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); onSave(value.trim()); }
    if (e.key === 'Escape') onCancel();
    e.stopPropagation();
  };

  return (
    <input
      ref={inputRef}
      className="thread-item__rename-input"
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(value.trim())}
      onClick={e => e.stopPropagation()}
      maxLength={80}
    />
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function Sidebar({ user, threads, activeThreadId, onSelectThread, onNewChat, onDeleteThread, onRenameThread, onStarThread, onLogout }) {
  const [editingId, setEditingId] = useState(null);
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  const handleRenameSubmit = (threadId, newTitle) => {
    setEditingId(null);
    onRenameThread(threadId, newTitle);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <div className="sidebar__brand">
          <div className="sidebar__brand-mark"><DocIcon /></div>
          <span className="sidebar__brand-name">DocsyChat</span>
        </div>
      </div>

      <button className="sidebar__new-btn" onClick={onNewChat}>
        <span className="sidebar__new-icon">+</span>
        <span>New Document Chat</span>
      </button>

      <div className="sidebar__threads">
        {threads.length > 0 && <div className="sidebar__threads-label">Your Chats</div>}
        {threads.length === 0 ? (
          <div className="threads-empty">
            <div className="threads-empty-icon">📂</div>
            <div>No chats yet.</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Upload a document to begin.</div>
          </div>
        ) : (
          threads.map(thread => (
            <div
              key={thread.id}
              className={`thread-item ${thread.id === activeThreadId ? 'active' : ''} ${thread.is_starred ? 'starred' : ''}`}
              onClick={() => editingId !== thread.id && onSelectThread(thread.id)}
            >
              {/* Title — inline input when editing, text otherwise */}
              {editingId === thread.id ? (
                <RenameInput
                  currentTitle={thread.displayTitle}
                  onSave={(val) => handleRenameSubmit(thread.id, val)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="thread-item__title">
                  {thread.displayTitle}
                </div>
              )}

              {/* Resting star — visible at far right on starred threads when not hovered */}
              {thread.is_starred && editingId !== thread.id && (
                <span className="thread-item__star-resting" aria-hidden="true">★</span>
              )}

              <div className="thread-item__meta">
                <span>{timeAgo(thread.last_message_at || thread.created_at)}</span>
              </div>

              {/* Action buttons — appear on hover */}
              {editingId !== thread.id && (
                <div className="thread-item__actions">
                  <ThreadAction
                    icon={thread.is_starred ? <StarFilledIcon /> : <StarEmptyIcon />}
                    tooltip={thread.is_starred ? 'Unstar chat' : 'Star chat'}
                    onClick={() => onStarThread(thread.id, thread.is_starred)}
                    className={thread.is_starred ? 'starred' : ''}
                  />
                  <ThreadAction
                    icon={<RenameIcon />}
                    tooltip="Rename"
                    onClick={() => setEditingId(thread.id)}
                  />
                  <ThreadAction
                    icon={<BinIcon />}
                    tooltip="Delete"
                    onClick={() => onDeleteThread(thread.id)}
                    className="delete"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="sidebar__bottom">
        <div className="sidebar__user">
          <div className="sidebar__avatar">{initials}</div>
          <div className="sidebar__user-info">
            <div className="sidebar__username">{user.fullName}</div>
            <div className="sidebar__useremail">{user.email}</div>
          </div>
          <button className="sidebar__logout" onClick={onLogout} title="Sign out">↩</button>
        </div>
      </div>
    </aside>
  );
}
