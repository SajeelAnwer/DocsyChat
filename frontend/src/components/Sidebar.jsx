import React from 'react';

const DocIcon = () => (
  <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7.414A2 2 0 0017.414 6L14 2.586A2 2 0 0012.586 2H4zm0 2h8v3a1 1 0 001 1h3v9H4V4zm9 .414L15.586 7H13V4.414z"/>
  </svg>
);

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Sidebar({ user, threads, activeThreadId, onSelectThread, onNewChat, onDeleteThread, onLogout }) {
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

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
        {threads.length > 0 && <div className="sidebar__threads-label">Recent</div>}
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
              className={`thread-item ${thread.id === activeThreadId ? 'active' : ''}`}
              onClick={() => onSelectThread(thread.id)}
            >
              <div className="thread-item__title">{thread.title}</div>
              <div className="thread-item__meta">
                <span className="thread-item__meta-file">{thread.file_name}</span>
                <span>·</span>
                <span style={{ flexShrink: 0 }}>{timeAgo(thread.created_at)}</span>
              </div>
              <button className="thread-item__delete"
                onClick={e => { e.stopPropagation(); onDeleteThread(thread.id); }}
                title="Delete">✕</button>
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
