const express = require('express');
const supabase = require('../utils/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/threads
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
  const { data: thread } = await supabase
    .from('threads')
    .select('id, document_id, user_id')
    .eq('id', req.params.threadId)
    .eq('user_id', req.user.id)
    .single();

  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  // Delete messages and thread in parallel
  await Promise.all([
    supabase.from('messages').delete().eq('thread_id', req.params.threadId),
    supabase.from('threads').delete().eq('id', req.params.threadId)
  ]);

  // Respond immediately — user doesn't need to wait for document cleanup
  res.json({ success: true });

  // Clean up document data in the background after response is sent
  try {
    const { count } = await supabase
      .from('threads')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', thread.document_id);

    if (count === 0) {
      await Promise.all([
        supabase.from('document_chunks').delete().eq('document_id', thread.document_id),
        supabase.from('documents').delete().eq('id', thread.document_id)
      ]);
      console.log(`🗑️ Cleaned up document ${thread.document_id}`);
    }
  } catch (err) {
    console.error('Background cleanup error:', err.message);
  }
});

module.exports = router;
