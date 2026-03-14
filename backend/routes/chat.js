const express = require('express');
const supabase = require('../utils/supabase');
const { askAI } = require('../utils/ai');
const { retrieveRelevantChunks, buildContext } = require('../utils/rag');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/chat/:threadId
router.post('/:threadId', requireAuth, async (req, res) => {
  const { threadId } = req.params;
  const { message } = req.body;

  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  // Fetch thread (verify ownership)
  const { data: thread, error: threadError } = await supabase
    .from('threads')
    .select('id, document_id, file_name, user_id')
    .eq('id', threadId)
    .eq('user_id', req.user.id)
    .single();

  if (threadError || !thread) return res.status(404).json({ error: 'Thread not found' });

  try {
    // Save user message
    const { data: userMsg } = await supabase
      .from('messages')
      .insert({ thread_id: threadId, role: 'user', content: message.trim() })
      .select('id, role, content, created_at')
      .single();

    // Get last 6 messages for conversation history
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(6);

    // RAG: retrieve only relevant chunks instead of full document
    const topK = parseInt(process.env.RAG_TOP_K) || 5;

    let contextText;
    try {
      const chunks = await retrieveRelevantChunks(thread.document_id, message.trim(), topK);
      if (chunks.length === 0) {
        // Chunks not ready yet (still embedding) — fall back gracefully
        contextText = 'The document is still being processed. Please try again in a few seconds.';
        console.warn(`⚠️ No chunks found for document ${thread.document_id} — may still be embedding`);
      } else {
        contextText = buildContext(chunks);
        console.log(`✅ Retrieved ${chunks.length} chunks for query`);
      }
    } catch (ragErr) {
      console.error('RAG retrieval error:', ragErr.message);
      throw ragErr;
    }

    // Call AI with only the relevant context
    const aiResponse = await askAI(
      contextText,
      (history || []).map(m => ({ role: m.role, content: m.content })),
      message.trim()
    );

    // Save assistant message
    const { data: aiMsg } = await supabase
      .from('messages')
      .insert({ thread_id: threadId, role: 'assistant', content: aiResponse })
      .select('id, role, content, created_at')
      .single();

    // Auto-title thread from first question
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('thread_id', threadId);

    if (count === 2) {
      const title = message.trim().length > 50
        ? message.trim().substring(0, 50) + '...'
        : message.trim();
      await supabase.from('threads').update({ title }).eq('id', threadId);
    }

    res.json({
      success: true,
      message: { ...aiMsg, timestamp: aiMsg.created_at },
      threadId
    });

  } catch (err) {
    console.error('❌ Chat error full message:', err.message);
    console.error('❌ Chat error stack:', err.stack);

    // Remove the user message on failure
    await supabase
      .from('messages')
      .delete()
      .eq('thread_id', threadId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(1);

    // Return the ACTUAL error message — not a masked one
    res.status(500).json({ error: `Failed to get AI response. ${err.message}` });
  }
});

// GET /api/chat/:threadId/messages
router.get('/:threadId/messages', requireAuth, async (req, res) => {
  const { data: thread } = await supabase
    .from('threads')
    .select('id, file_name, user_id')
    .eq('id', req.params.threadId)
    .eq('user_id', req.user.id)
    .single();

  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('thread_id', req.params.threadId)
    .order('created_at', { ascending: true });

  res.json({
    threadId: thread.id,
    fileName: thread.file_name,
    messages: (messages || []).map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.created_at
    }))
  });
});

module.exports = router;
