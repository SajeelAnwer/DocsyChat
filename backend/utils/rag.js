const supabase = require('./supabase');

// ── Document size thresholds ──────────────────────────────────────────────
// Small docs skip vector search entirely — all chunks sent directly.
// This is faster and eliminates retrieval misses on short documents.
const SMALL_DOC_THRESHOLD = 25; // chunks — docs with <= 25 chunks use full retrieval

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
  /\ball (projects?|topics?|sections?|parts?)\b/i,
  /\beverything (in|about|from) (this|the) (document|file)\b/i,
  /\bfull (document|file|content|picture)\b/i,
];

function isSummaryQuery(query) {
  return SUMMARY_PATTERNS.some(p => p.test(query));
}

// ── Sentence-aware chunking ───────────────────────────────────────────────
function chunkDocument(text, chunkSize = 1000, overlap = 100) {
  const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z\u0600-\u06FF])|(?<=\n)/g;
  const sentences = text.split(sentenceRegex).filter(s => s.trim().length > 0);

  const chunks = [];
  let current = '';
  let currentIndex = 0;

  for (const sentence of sentences) {
    const candidate = current ? current + ' ' + sentence : sentence;

    if (candidate.length <= chunkSize) {
      current = candidate;
    } else {
      if (current.trim().length > 50) {
        chunks.push({ content: current.trim(), index: currentIndex++ });
      }
      if (sentence.length > chunkSize) {
        let pos = 0;
        while (pos < sentence.length) {
          const piece = sentence.slice(pos, pos + chunkSize).trim();
          if (piece.length > 50) chunks.push({ content: piece, index: currentIndex++ });
          pos += chunkSize - overlap;
        }
        current = '';
      } else {
        const words = current.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 6)).join(' ');
        current = overlapWords ? overlapWords + ' ' + sentence : sentence;
      }
    }
  }

  if (current.trim().length > 50) {
    chunks.push({ content: current.trim(), index: currentIndex });
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

function averageVectors(v1, v2) {
  return v1.map((val, i) => (val + v2[i]) / 2);
}

async function getQueryEmbedding(query) {
  const lower = query.toLowerCase().trim();
  const original = query.trim();
  if (lower === original) return await getEmbedding(original);
  const [embOriginal, embLower] = await Promise.all([
    getEmbedding(original),
    getEmbedding(lower)
  ]);
  return averageVectors(embOriginal, embLower);
}

// ── Embed and store all chunks for a document ────────────────────────────
async function embedAndStoreDocument(documentId, text) {
  const chunkSize = parseInt(process.env.RAG_CHUNK_SIZE) || 1000;
  const overlap = parseInt(process.env.RAG_CHUNK_OVERLAP) || 100;
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

  const { error } = await supabase.from('document_chunks').insert(rows);
  if (error) throw new Error(`Failed to store chunks: ${error.message}`);
  console.log(`✅ Stored ${rows.length} chunks for document ${documentId}`);
  return rows.length;
}

// ── Retrieve ALL chunks ordered by position ───────────────────────────────
async function retrieveAllChunks(documentId) {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('id, content, chunk_index')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true });

  if (error) throw new Error(`Failed to retrieve all chunks: ${error.message}`);
  return data || [];
}

// ── Main retrieval function ───────────────────────────────────────────────
// Strategy:
//   Small doc (≤ 25 chunks)  → always send all chunks (faster, no misses)
//   Summary query            → always send all chunks
//   Large doc, normal query  → vector search with adaptive topK
async function retrieveChunks(documentId, query) {
  // Always fetch all chunks first (single query, no COUNT needed)
  const allChunks = await retrieveAllChunks(documentId);
  const totalChunks = allChunks.length;

  if (totalChunks === 0) return { chunks: [], strategy: 'empty' };

  // Small document OR summary query → send everything
  if (totalChunks <= SMALL_DOC_THRESHOLD || isSummaryQuery(query)) {
    const strategy = totalChunks <= SMALL_DOC_THRESHOLD ? 'small_doc_full' : 'summary_full';
    console.log(`📋 Strategy: ${strategy} (${totalChunks} chunks) — sending all`);
    return { chunks: allChunks, strategy };
  }

  // Large document → vector search with adaptive topK
  const topK = Math.max(4, Math.min(Math.ceil(totalChunks * 0.15), 10));
  console.log(`🔍 Strategy: vector_search — topK=${topK} of ${totalChunks} chunks`);

  const queryEmbedding = await getQueryEmbedding(query);
  const { data, error } = await supabase.rpc('match_chunks', {
    p_document_id: documentId,
    p_query_embedding: queryEmbedding,
    p_match_count: topK
  });

  if (error) throw new Error(`match_chunks RPC error: ${error.message}`);

  const MIN_SIMILARITY = parseFloat(process.env.RAG_MIN_SIMILARITY) || 0.35;
  const filtered = (data || []).filter(c => c.similarity >= MIN_SIMILARITY);
  const result = filtered.length >= 2 ? filtered : (data || []).slice(0, 3);

  console.log(`✅ Vector search: ${result.length} chunks returned`);
  return { chunks: result, strategy: 'vector_search' };
}

// ── Build context string from chunks ─────────────────────────────────────
function buildContext(chunks) {
  return chunks
    .map((c, i) => `[Section ${i + 1} of ${chunks.length}]\n${c.content}`)
    .join('\n\n---\n\n');
}

module.exports = {
  embedAndStoreDocument,
  retrieveChunks,
  retrieveAllChunks,
  buildContext,
  chunkDocument,
  isSummaryQuery
};
