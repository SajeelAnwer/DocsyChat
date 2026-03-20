import React, { useState, useRef, useEffect } from 'react';
import { deleteAccount } from '../utils/api';

const DocIcon = () => (
  <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7.414A2 2 0 0017.414 6L14 2.586A2 2 0 0012.586 2H4zm0 2h8v3a1 1 0 001 1h3v9H4V4zm9 .414L15.586 7H13V4.414z"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const RenameIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const StarEmptyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const StarFilledIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24"
    fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

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

// Three-dot (ellipsis) icon
const DotsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

// Google-style sign out icon (person leaving a door)
const SignOutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// Trash icon for delete account
const DeleteAccountIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

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
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Refs for click-outside detection
  const searchInputRef = useRef(null);
  const searchBoxRef = useRef(null);
  const threadsRef = useRef(null);
  const menuRef = useRef(null);

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  // Close search when user clicks outside the search box and the thread list
  useEffect(() => {
    if (!searchActive) return;
    const handleMouseDown = (e) => {
      const inSearch = searchBoxRef.current?.contains(e.target);
      const inThreads = threadsRef.current?.contains(e.target);
      if (!inSearch && !inThreads) {
        setSearchActive(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [searchActive]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleMouseDown = (e) => {
      if (!menuRef.current?.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [menuOpen]);

  const handleSearchFocus = () => setSearchActive(true);

  const handleSearchKey = (e) => {
    if (e.key === 'Escape') {
      setSearchActive(false);
      setSearchQuery('');
      searchInputRef.current?.blur();
    }
  };

  const handleSelectThread = (threadId) => {
    setSearchActive(false);
    setSearchQuery('');
    onSelectThread(threadId);
  };

  const handleRenameSubmit = (threadId, newTitle) => {
    setEditingId(null);
    onRenameThread(threadId, newTitle);
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      localStorage.removeItem('docsychat_token');
      localStorage.removeItem('docsychat_user');
      onLogout();
    } catch (err) {
      console.error('Failed to delete account:', err);
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const filteredThreads = searchActive && searchQuery.trim()
    ? threads.filter(t => {
        const q = searchQuery.toLowerCase();
        return (
          t.displayTitle?.toLowerCase().includes(q) ||
          t.file_name?.toLowerCase().includes(q)
        );
      })
    : threads;

  return (
    <>
      <aside className="sidebar">
      <div className="sidebar__top">
        <div className="sidebar__brand">
          <div className="sidebar__brand-mark"><DocIcon /></div>
          <span className="sidebar__brand-name">DocsyChat</span>
        </div>
      </div>

      {/* New Document Chat — flat Claude-style button */}
      <button className="sidebar__new-btn" onClick={onNewChat}>
        <span className="sidebar__new-icon"><PlusIcon /></span>
        <span>New Document Chat</span>
      </button>

      {/* Search box — always visible, activates on focus */}
      <div
        ref={searchBoxRef}
        className={`sidebar__search-box ${searchActive ? 'active' : ''}`}
      >
        <span className="sidebar__search-box-icon"><SearchIcon /></span>
        <input
          ref={searchInputRef}
          className="sidebar__search-box-input"
          type="text"
          placeholder="Search chats"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={handleSearchFocus}
          onKeyDown={handleSearchKey}
        />
      </div>

      <div className="sidebar__threads" ref={threadsRef}>
        {threads.length > 0 && (
          <div className="sidebar__threads-label">
            {searchActive && searchQuery.trim()
              ? `${filteredThreads.length} result${filteredThreads.length !== 1 ? 's' : ''}`
              : 'Your Chats'}
          </div>
        )}

        {threads.length === 0 ? (
          <div className="threads-empty">
            <div className="threads-empty-icon">📂</div>
            <div>No chats yet.</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Upload a document to begin.</div>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="threads-empty">
            <div className="threads-empty-icon">🔍</div>
            <div>No chats found.</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Try a different search term.</div>
          </div>
        ) : (
          filteredThreads.map(thread => (
            <div
              key={thread.id}
              className={`thread-item ${thread.id === activeThreadId ? 'active' : ''} ${thread.is_starred ? 'starred' : ''}`}
              onClick={() => editingId !== thread.id && handleSelectThread(thread.id)}
            >
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

              {thread.is_starred && editingId !== thread.id && (
                <span className="thread-item__star-resting" aria-hidden="true">★</span>
              )}

              <div className="thread-item__meta">
                <span>{timeAgo(thread.last_message_at || thread.created_at)}</span>
              </div>

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

      {/* Bottom — user info + three-dot menu */}
      <div className="sidebar__bottom">
        <div className="sidebar__user">
          <div className="sidebar__avatar">{initials}</div>
          <div className="sidebar__user-info">
            <div className="sidebar__username">{user.fullName}</div>
            <div className="sidebar__useremail">{user.email}</div>
          </div>

          {/* Three-dot menu */}
          <div className="sidebar__menu-wrap" ref={menuRef}>
            {/* Dropdown — pops upward */}
            {menuOpen && (
              <div className="sidebar__menu">
                <button
                  className="sidebar__menu-item"
                  onClick={() => { setMenuOpen(false); onLogout(); }}
                >
                  <SignOutIcon />
                  <span>Sign out</span>
                </button>
                <button
                  className="sidebar__menu-item sidebar__menu-item--delete"
                  onClick={() => { setMenuOpen(false); setShowDeleteModal(true); }}
                >
                  <DeleteAccountIcon />
                  <span>Delete account</span>
                </button>
              </div>
            )}

            <div className="sidebar__dots-wrap">
              <button
                className="sidebar__dots-btn"
                onClick={() => { setMenuOpen(o => !o); setShowDeleteModal(false); }}
                aria-label="More options"
              >
                <DotsIcon />
              </button>
              <span className="sidebar__dots-tooltip">More options</span>
            </div>
          </div>
        </div>
      </div>
      </aside>

      {/* Delete account confirmation modal */}
      {showDeleteModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <h3 className="delete-modal__title">Delete your account?</h3>
            <p className="delete-modal__body">
              This will permanently delete your account and everything associated with it —
              all chats, uploaded documents, and message history. This action is final and
              cannot be undone.
            </p>
            <div className="delete-modal__actions">
              <button
                className="delete-modal__btn delete-modal__btn--cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
              >
                No, keep my account
              </button>
              <button
                className="delete-modal__btn delete-modal__btn--confirm"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
