const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { extractText } = require('../utils/extractor');
const { embedAndStoreDocument } = require('../utils/rag');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../utils/supabase');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.docx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error('Only PDF, DOCX, and TXT files are allowed'));
};

const upload = multer({
  storage, fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 }
});

// POST /api/upload
router.post('/', requireAuth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Extract text
    const rawText = await extractText(req.file.path, req.file.mimetype);
    if (!rawText || rawText.trim().length < 10) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Could not extract text from document.' });
    }

    // Store document metadata in Supabase
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: req.user.id,
        file_name: req.file.originalname,
        char_count: rawText.length,
        chunk_count: 0 // updated after embedding
      })
      .select('id')
      .single();

    if (docError) throw docError;

    // Create thread
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .insert({
        user_id: req.user.id,
        document_id: doc.id,
        title: `Chat about ${req.file.originalname}`,
        file_name: req.file.originalname
      })
      .select('id')
      .single();

    if (threadError) throw threadError;

    // Clean up file before embedding (text already extracted)
    fs.unlinkSync(req.file.path);

    // Embed and store document chunks (async — happens after response for speed)
    embedAndStoreDocument(doc.id, rawText)
      .then(async (chunkCount) => {
        await supabase.from('documents').update({ chunk_count: chunkCount }).eq('id', doc.id);
        console.log(`✅ Document ${doc.id} embedded with ${chunkCount} chunks`);
      })
      .catch(err => console.error('Embedding error:', err));

    res.json({
      success: true,
      threadId: thread.id,
      documentId: doc.id,
      fileName: req.file.originalname,
      charCount: rawText.length,
      message: `"${req.file.originalname}" uploaded! Embedding in background...`
    });

  } catch (err) {
    console.error('Upload error:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message || 'Failed to process document' });
  }
});

module.exports = router;
