import React from 'react';

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
      <div className="sidebar__header">
        <div className="sidebar__brand">
          <div className="sidebar__brand-icon">📄</div>
          <span className="sidebar__brand-name">DocuChat</span>
        </div>
        <div className="sidebar__user">
          <div className="sidebar__avatar">{initials}</div>
          <div className="sidebar__user-info">
            <div className="sidebar__username">{user.fullName}</div>
          </div>
          <button className="sidebar__logout" onClick={onLogout} title="Change user">
            ↩
          </button>
        </div>
      </div>

      <button className="sidebar__new-btn" onClick={onNewChat}>
        <span>＋</span>
        <span>New Document Chat</span>
      </button>

      <div className="sidebar__threads">
        {threads.length > 0 && (
          <div className="sidebar__threads-label">Recent Chats</div>
        )}

        {threads.length === 0 ? (
          <div className="threads-empty">
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
            <div>No chats yet.</div>
            <div style={{ marginTop: '4px', fontSize: '12px' }}>Upload a document to get started.</div>
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
                <span>📄</span>
                <span>{thread.fileName}</span>
                <span>·</span>
                <span>{timeAgo(thread.createdAt)}</span>
              </div>
              <button
                className="thread-item__delete"
                onClick={e => { e.stopPropagation(); onDeleteThread(thread.id); }}
                title="Delete chat"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
