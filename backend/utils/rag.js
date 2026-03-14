const supabase = require('./supabase');

// ── Chunk document into overlapping pieces ────────────────────────────────
function chunkDocument(text, chunkSize = 1500, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push({ content: chunk, index: chunks.length });
    }
    if (end === text.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

// ── Generate embedding via direct fetch ───────────────────────────────────
// Model: gemini-embedding-001 with output_dimensionality: 1536
// 1536 dims = high quality, under Supabase's 2000-dim ivfflat limit
async function getEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = 'gemini-embedding-001';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text }] },
      output_dimensionality: 1536
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.embedding.values;
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
    await new Promise(r => setTimeout(r, 200));
  }

  const { error } = await supabase
    .from('document_chunks')
    .insert(rows);

  if (error) throw new Error(`Failed to store chunks: ${error.message}`);
  console.log(`✅ Stored ${rows.length} chunks for document ${documentId}`);
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

  if (error) throw new Error(`match_chunks RPC error: ${error.message}`);
  return data || [];
}

// ── Build context string from retrieved chunks ───────────────────────────
function buildContext(chunks) {
  return chunks
    .map((c, i) => `[Section ${i + 1}]\n${c.content}`)
    .join('\n\n---\n\n');
}

module.exports = { embedAndStoreDocument, retrieveRelevantChunks, buildContext, chunkDocument };
