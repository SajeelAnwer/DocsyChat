const supabase = require('./supabase');

// ── Queries that should use the full document instead of vector search ────
const SUMMARY_PATTERNS = [
  /\bsummar(y|ize|ise)\b/i,
  /\boverview\b/i,
  /\bwhat('?s| is) (this|the) (document|file|text|about)\b/i,
  /\btell me about (this|the) (document|file)\b/i,
  /\bwhat does (this|the) (document|file) (say|cover|contain|discuss|talk)\b/i,
  /\bmain (points?|ideas?|topics?|themes?)\b/i,
  /\bkey (points?|ideas?|topics?|takeaways?)\b/i,
  /\bbriefly describe\b/i,
  /\bgive me an? (outline|summary|overview|brief)\b/i,
];

function isSummaryQuery(query) {
  return SUMMARY_PATTERNS.some(p => p.test(query));
}

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

// ── Average two vectors (used for query expansion) ────────────────────────
function averageVectors(v1, v2) {
  return v1.map((val, i) => (val + v2[i]) / 2);
}

// ── Get a robust query embedding using query expansion ────────────────────
// Embeds both the original query and a lowercase version, then averages.
// This prevents case-sensitive misses (e.g. "sociolums" vs "SocioLums").
async function getQueryEmbedding(query) {
  const lower = query.toLowerCase().trim();
  const original = query.trim();

  if (lower === original) {
    // Already lowercase — single embedding is enough
    return await getEmbedding(original);
  }

  // Embed both and average for a case-robust vector
  const [embOriginal, embLower] = await Promise.all([
    getEmbedding(original),
    getEmbedding(lower)
  ]);
  return averageVectors(embOriginal, embLower);
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
async function retrieveRelevantChunks(documentId, query, topK = 8) {
  // Use expanded, case-robust query embedding
  const queryEmbedding = await getQueryEmbedding(query);

  const { data, error } = await supabase.rpc('match_chunks', {
    p_document_id: documentId,
    p_query_embedding: queryEmbedding,
    p_match_count: topK
  });

  if (error) throw new Error(`match_chunks RPC error: ${error.message}`);
  return data || [];
}

// ── Retrieve ALL chunks for a document (used for summary queries) ────────
async function retrieveAllChunks(documentId) {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('id, content, chunk_index')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true });

  if (error) throw new Error(`Failed to retrieve all chunks: ${error.message}`);
  return data || [];
}

// ── Build context string from retrieved chunks ───────────────────────────
function buildContext(chunks) {
  return chunks
    .map((c, i) => `[Section ${i + 1}]\n${c.content}`)
    .join('\n\n---\n\n');
}

module.exports = {
  embedAndStoreDocument,
  retrieveRelevantChunks,
  retrieveAllChunks,
  buildContext,
  chunkDocument,
  isSummaryQuery
};
