import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import UploadZone from './UploadZone';
import ChatWindow from './ChatWindow';
import { getThreads, deleteThread, renameThread, starThread } from '../utils/api';

function normalizeThread(t) {
  return {
    ...t,
    fileName: t.fileName || t.file_name || '',
    file_name: t.file_name || t.fileName || '',
    // Display name: custom_title if set, otherwise file_name
    displayTitle: t.custom_title || t.file_name || t.fileName || '',
    is_starred: t.is_starred || false,
    last_message_at: t.last_message_at || t.created_at || new Date().toISOString(),
  };
}

export default function ChatLayout({ user, onLogout }) {
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const loadThreads = useCallback(async () => {
    try {
      const data = await getThreads();
      setThreads((data.threads || []).map(normalizeThread));
    } catch (e) { console.error('Failed to load threads:', e); }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  const handleUploadComplete = (uploadResult) => {
    const newThread = normalizeThread({
      id: uploadResult.threadId,
      title: `Chat about ${uploadResult.fileName}`,
      file_name: uploadResult.fileName,
      fileName: uploadResult.fileName,
      custom_title: null,
      is_starred: false,
      created_at: new Date().toISOString()
    });
    setThreads(prev => [newThread, ...prev]);
    setActiveThread(newThread);
    setActiveThreadId(newThread.id);
    setShowUpload(false);
  };

  const handleSelectThread = (threadId) => {
    const thread = threads.find(t => t.id === threadId);
    setActiveThread(thread ? normalizeThread(thread) : null);
    setActiveThreadId(threadId);
    setShowUpload(false);
  };

  const handleNewChat = () => {
    setActiveThread(null);
    setActiveThreadId(null);
    setShowUpload(true);
  };

  const handleDeleteThread = (threadId) => {
    const wasActive = activeThreadId === threadId;
    const previousThreads = threads;

    setThreads(prev => prev.filter(t => t.id !== threadId));
    if (wasActive) {
      setActiveThread(null);
      setActiveThreadId(null);
      setShowUpload(false);
    }

    deleteThread(threadId).catch(err => {
      console.error('Failed to delete thread:', err);
      setThreads(previousThreads);
      if (wasActive) {
        const thread = previousThreads.find(t => t.id === threadId);
        setActiveThread(thread || null);
        setActiveThreadId(threadId);
      }
    });
  };

  const handleRenameThread = (threadId, newTitle) => {
    // Optimistic update
    setThreads(prev => prev.map(t =>
      t.id === threadId
        ? normalizeThread({ ...t, custom_title: newTitle || null })
        : t
    ));
    if (activeThreadId === threadId) {
      setActiveThread(prev => prev ? normalizeThread({ ...prev, custom_title: newTitle || null }) : prev);
    }

    renameThread(threadId, newTitle).catch(err => {
      console.error('Failed to rename thread:', err);
      loadThreads(); // Reload on failure
    });
  };

  const handleStarThread = (threadId, currentlyStarred) => {
    const newStarred = !currentlyStarred;

    // Optimistic update — re-sort: starred float to top
    setThreads(prev => {
      const updated = prev.map(t =>
        t.id === threadId ? normalizeThread({ ...t, is_starred: newStarred }) : t
      );
      // Keep starred at top, then by created_at desc
      return [
        ...updated.filter(t => t.is_starred),
        ...updated.filter(t => !t.is_starred),
      ];
    });

    starThread(threadId, newStarred).catch(err => {
      console.error('Failed to star thread:', err);
      loadThreads();
    });
  };

  // Called by ChatWindow after each successful AI response — bumps
  // last_message_at and re-sorts so the thread rises to the top of
  // its group (starred threads stay pinned above unstarred ones).
  const handleMessageSent = (threadId) => {
    const now = new Date().toISOString();
    setThreads(prev => {
      const updated = prev.map(t =>
        t.id === threadId ? { ...t, last_message_at: now } : t
      );
      const sortByActivity = (a, b) =>
        new Date(b.last_message_at) - new Date(a.last_message_at);
      return [
        ...updated.filter(t => t.is_starred).sort(sortByActivity),
        ...updated.filter(t => !t.is_starred).sort(sortByActivity),
      ];
    });
  };

  const showingUpload = showUpload || (!activeThread && threads.length === 0);

  return (
    <div className="layout">
      <Sidebar
        user={user}
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
        onStarThread={handleStarThread}
        onLogout={onLogout}
      />
      <main className="chat-area">
        {showingUpload || !activeThread ? (
          <UploadZone user={user} onUploadComplete={handleUploadComplete} />
        ) : (
          <ChatWindow
            key={activeThread.id}
            thread={activeThread}
            user={user}
            onNewChat={handleNewChat}
            onMessageSent={handleMessageSent}
          />
        )}
      </main>
    </div>
  );
}
