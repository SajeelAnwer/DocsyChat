// Simple in-memory store for demo purposes
// For production: replace with a real database (PostgreSQL, MongoDB, etc.)

const threads = new Map();

module.exports = {
  // Get all threads for a user
  getUserThreads(userId) {
    const userThreads = [];
    for (const [id, thread] of threads.entries()) {
      if (thread.userId === userId) {
        userThreads.push({
          id,
          title: thread.title,
          fileName: thread.fileName,
          createdAt: thread.createdAt,
          messageCount: thread.messages.length
        });
      }
    }
    return userThreads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  // Create a new thread
  createThread(userId, userName, fileName, documentText) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const thread = {
      id,
      userId,
      userName,
      title: `Chat about ${fileName}`,
      fileName,
      documentText,
      messages: [],
      createdAt: new Date().toISOString()
    };
    threads.set(id, thread);
    return thread;
  },

  // Get a thread by ID
  getThread(threadId) {
    return threads.get(threadId) || null;
  },

  // Add a message to a thread
  addMessage(threadId, role, content) {
    const thread = threads.get(threadId);
    if (!thread) return null;
    const message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date().toISOString()
    };
    thread.messages.push(message);
    return message;
  },

  // Update thread title
  updateThreadTitle(threadId, title) {
    const thread = threads.get(threadId);
    if (thread) thread.title = title;
  },

  // Delete a thread
  deleteThread(threadId) {
    return threads.delete(threadId);
  }
};
