const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.pdf' || mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return cleanText(data.text);
    }

    if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      return cleanText(result.value);
    }

    if (ext === '.txt' || mimeType === 'text/plain') {
      const text = fs.readFileSync(filePath, 'utf8');
      return cleanText(text);
    }

    throw new Error(`Unsupported file type: ${ext}`);
  } catch (err) {
    throw new Error(`Failed to extract text: ${err.message}`);
  }
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// Truncate document to fit within token limits (roughly 30k chars ~ 7500 tokens)
function truncateDocument(text, maxChars = 30000) {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '\n\n[Document truncated due to length...]';
}

module.exports = { extractText };
