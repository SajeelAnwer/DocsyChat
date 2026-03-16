import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import UploadZone from './UploadZone';
import ChatWindow from './ChatWindow';
import { getThreads, deleteThread } from '../utils/api';

function normalizeThread(t) {
  return {
    ...t,
    fileName: t.fileName || t.file_name || '',
    file_name: t.file_name || t.fileName || '',
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
    // Optimistic update — remove from UI immediately, don't wait for server
    const wasActive = activeThreadId === threadId;
    const previousThreads = threads;

    setThreads(prev => prev.filter(t => t.id !== threadId));
    if (wasActive) {
      setActiveThread(null);
      setActiveThreadId(null);
      setShowUpload(false);
    }

    // Fire delete in background — restore if it fails
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
          />
        )}
      </main>
    </div>
  );
}
