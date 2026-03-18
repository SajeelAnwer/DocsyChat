const express = require('express');
const supabase = require('../utils/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/threads — starred first, then by last activity desc
router.get('/', requireAuth, async (req, res) => {
  const { data: threads, error } = await supabase
    .from('threads')
    .select('id, title, file_name, custom_title, is_starred, created_at, document_id')
    .eq('user_id', req.user.id)
    .order('is_starred', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to load threads' });

  // Fetch last message timestamp for each thread in parallel
  const threadsWithActivity = await Promise.all(
    (threads || []).map(async (thread) => {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('created_at')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return {
        ...thread,
        last_message_at: lastMsg?.created_at || thread.created_at
      };
    })
  );

  res.json({ threads: threadsWithActivity });
});

// PATCH /api/threads/:threadId — rename or star/unstar
router.patch('/:threadId', requireAuth, async (req, res) => {
  const { custom_title, is_starred } = req.body;

  // Verify ownership
  const { data: thread } = await supabase
    .from('threads')
    .select('id, user_id')
    .eq('id', req.params.threadId)
    .eq('user_id', req.user.id)
    .single();

  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  const updates = {};
  if (custom_title !== undefined) updates.custom_title = custom_title || null;
  if (is_starred !== undefined) updates.is_starred = is_starred;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const { data: updated, error } = await supabase
    .from('threads')
    .update(updates)
    .eq('id', req.params.threadId)
    .select('id, title, file_name, custom_title, is_starred, created_at, document_id')
    .single();

  if (error) return res.status(500).json({ error: 'Failed to update thread' });

  // Preserve last_message_at from the request body if provided, else re-fetch
  const { data: lastMsg } = await supabase
    .from('messages')
    .select('created_at')
    .eq('thread_id', req.params.threadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  res.json({ success: true, thread: { ...updated, last_message_at: lastMsg?.created_at || updated.created_at } });
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

  await Promise.all([
    supabase.from('messages').delete().eq('thread_id', req.params.threadId),
    supabase.from('threads').delete().eq('id', req.params.threadId)
  ]);

  res.json({ success: true });

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
