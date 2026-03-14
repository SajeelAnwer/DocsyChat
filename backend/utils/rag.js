const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('./supabase');

// ── Chunk document into overlapping pieces ────────────────────────────────
function chunkDocument(text, chunkSize = 1500, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) { // skip tiny chunks
      chunks.push({ content: chunk, index: chunks.length });
    }
    if (end === text.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

// ── Generate embedding for a single text ─────────────────────────────────
async function getEmbedding(text) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// ── Embed and store all chunks for a document ────────────────────────────
async function embedAndStoreDocument(documentId, text) {
  const chunkSize = parseInt(process.env.RAG_CHUNK_SIZE) || 1500;
  const overlap = parseInt(process.env.RAG_CHUNK_OVERLAP) || 200;
  const chunks = chunkDocument(text, chunkSize, overlap);

  console.log(`📦 Embedding ${chunks.length} chunks for document ${documentId}...`);

  const rows = [];
  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk.content);
    rows.push({
      document_id: documentId,
      chunk_index: chunk.index,
      content: chunk.content,
      embedding
    });
    // small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  // Batch insert into Supabase
  const { error } = await supabase
    .from('document_chunks')
    .insert(rows);

  if (error) throw new Error(`Failed to store chunks: ${error.message}`);
  console.log(`✅ Stored ${rows.length} chunks`);
  return rows.length;
}

// ── Retrieve most relevant chunks for a query ────────────────────────────
async function retrieveRelevantChunks(documentId, query, topK = 5) {
  const queryEmbedding = await getEmbedding(query);

  const { data, error } = await supabase.rpc('match_chunks', {
    p_document_id: documentId,
    p_query_embedding: queryEmbedding,
    p_match_count: topK
  });

  if (error) throw new Error(`Failed to retrieve chunks: ${error.message}`);
  return data || [];
}

// ── Build context string from retrieved chunks ───────────────────────────
function buildContext(chunks) {
  return chunks
    .map((c, i) => `[Section ${i + 1}]\n${c.content}`)
    .join('\n\n---\n\n');
}

module.exports = { embedAndStoreDocument, retrieveRelevantChunks, buildContext, chunkDocument };
