import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import UploadZone from './UploadZone';
import ChatWindow from './ChatWindow';
import { getThreads, deleteThread } from '../utils/api';

export default function ChatLayout({ user, onLogout }) {
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const loadThreads = useCallback(async () => {
    try {
      const data = await getThreads();
      setThreads(data.threads || []);
    } catch (e) { console.error('Failed to load threads:', e); }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  const handleUploadComplete = (uploadResult) => {
    const newThread = {
      id: uploadResult.threadId,
      title: `Chat about ${uploadResult.fileName}`,
      file_name: uploadResult.fileName,
      created_at: new Date().toISOString()
    };
    setThreads(prev => [newThread, ...prev]);
    setActiveThread(newThread);
    setActiveThreadId(newThread.id);
    setShowUpload(false);
  };

  const handleSelectThread = (threadId) => {
    const thread = threads.find(t => t.id === threadId);
    setActiveThread(thread);
    setActiveThreadId(threadId);
    setShowUpload(false);
  };

  const handleNewChat = () => {
    setActiveThread(null);
    setActiveThreadId(null);
    setShowUpload(true);
  };

  const handleDeleteThread = async (threadId) => {
    try {
      await deleteThread(threadId);
      setThreads(prev => prev.filter(t => t.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThread(null);
        setActiveThreadId(null);
        setShowUpload(false);
      }
    } catch (e) { console.error('Failed to delete thread:', e); }
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
