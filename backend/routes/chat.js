const express = require('express');
const store = require('../utils/store');
const { askAI } = require('../utils/ai');

const router = express.Router();

// POST /api/chat/:threadId
router.post('/:threadId', async (req, res) => {
  const { threadId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const thread = store.getThread(threadId);
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' });
  }

  // Add user message to thread
  store.addMessage(threadId, 'user', message.trim());

  // Build conversation history for AI (last 10 messages for context)
  const history = thread.messages.slice(-10).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  try {
    const aiResponse = await askAI(thread.documentText, history, message.trim());
    
    // Add AI response to thread
    const aiMessage = store.addMessage(threadId, 'assistant', aiResponse);

    // Auto-generate thread title from first question
    if (thread.messages.length === 2) {
      const title = message.trim().length > 50 
        ? message.trim().substring(0, 50) + '...' 
        : message.trim();
      store.updateThreadTitle(threadId, title);
    }

    res.json({
      success: true,
      message: aiMessage,
      threadId
    });

  } catch (err) {
    console.error('AI error:', err);
    
    // Remove the user message if AI fails
    thread.messages.pop();
    
    let errorMsg = 'Failed to get AI response. ';
    if (err.message?.includes('API_KEY') || err.message?.includes('api key')) {
      errorMsg += 'Invalid API key. Please check your .env configuration.';
    } else if (err.message?.includes('quota') || err.message?.includes('limit')) {
      errorMsg += 'API quota exceeded. Please try again later.';
    } else {
      errorMsg += err.message;
    }

    res.status(500).json({ error: errorMsg });
  }
});

// GET /api/chat/:threadId/messages
router.get('/:threadId/messages', (req, res) => {
  const thread = store.getThread(req.params.threadId);
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' });
  }

  res.json({
    threadId: thread.id,
    fileName: thread.fileName,
    userName: thread.userName,
    messages: thread.messages,
    createdAt: thread.createdAt
  });
});

module.exports = router;
