const express = require('express');
const store = require('../utils/store');

const router = express.Router();

// GET /api/threads/:userId
router.get('/:userId', (req, res) => {
  const threads = store.getUserThreads(req.params.userId);
  res.json({ threads });
});

// DELETE /api/threads/:threadId
router.delete('/:threadId', (req, res) => {
  const deleted = store.deleteThread(req.params.threadId);
  if (!deleted) {
    return res.status(404).json({ error: 'Thread not found' });
  }
  res.json({ success: true, message: 'Thread deleted' });
});

module.exports = router;
