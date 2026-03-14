const express = require('express');
const supabase = require('../utils/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/threads — get all threads for logged-in user
router.get('/', requireAuth, async (req, res) => {
  const { data: threads, error } = await supabase
    .from('threads')
    .select('id, title, file_name, created_at, document_id')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to load threads' });
  res.json({ threads: threads || [] });
});

// DELETE /api/threads/:threadId
router.delete('/:threadId', requireAuth, async (req, res) => {
  // Verify ownership
  const { data: thread } = await supabase
    .from('threads')
    .select('id, document_id, user_id')
    .eq('id', req.params.threadId)
    .eq('user_id', req.user.id)
    .single();

  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  // Delete messages, then thread
  await supabase.from('messages').delete().eq('thread_id', req.params.threadId);
  await supabase.from('threads').delete().eq('id', req.params.threadId);

  // Check if document has other threads — if not, clean up chunks + doc
  const { count } = await supabase
    .from('threads')
    .select('*', { count: 'exact', head: true })
    .eq('document_id', thread.document_id);

  if (count === 0) {
    await supabase.from('document_chunks').delete().eq('document_id', thread.document_id);
    await supabase.from('documents').delete().eq('id', thread.document_id);
  }

  res.json({ success: true });
});

module.exports = router;
