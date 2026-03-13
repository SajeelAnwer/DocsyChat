const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { extractText, truncateDocument } = require('../utils/extractor');
const store = require('../utils/store');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.docx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOCX, and TXT files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 }
});

// POST /api/upload
router.post('/', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, userName, firstName, lastName } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const fullName = `${firstName} ${lastName}`;
    const userIdentifier = userId || uuidv4();

    // Extract text from document
    const rawText = await extractText(req.file.path, req.file.mimetype);
    
    if (!rawText || rawText.trim().length < 10) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Could not extract text from document. Please ensure the file has readable content.' });
    }

    const documentText = truncateDocument(rawText);

    // Create thread
    const thread = store.createThread(
      userIdentifier,
      fullName,
      req.file.originalname,
      documentText
    );

    // Clean up uploaded file (text already extracted)
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      threadId: thread.id,
      userId: userIdentifier,
      userName: fullName,
      fileName: req.file.originalname,
      charCount: documentText.length,
      message: `Document "${req.file.originalname}" processed successfully. You can now ask questions!`
    });

  } catch (err) {
    console.error('Upload error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message || 'Failed to process document' });
  }
});

module.exports = router;
