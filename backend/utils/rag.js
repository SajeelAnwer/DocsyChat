const supabase = require('./supabase');

// ── Token estimation ──────────────────────────────────────────────────────
// Gemini tokenisation is roughly 4 chars per token for English text.
// We use a conservative 3.5 chars/token so we never undercount.
const CHARS_PER_TOKEN = 3.5;

function estimateTokens(text) {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// ── Chunking constants ────────────────────────────────────────────────────
// Target ~400 tokens per chunk (≈1400 chars). This hits a sweet spot:
//  - Well under the 2048-token embedding model limit
//  - Small enough that vector search returns focused sections
//  - Large enough to contain meaningful context
// Overlap is ~15% of chunk size to preserve cross-boundary context.
const TARGET_CHUNK_TOKENS = 400;
const TARGET_CHUNK_CHARS  = Math.round(TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN); // 1400
const OVERLAP_CHARS       = Math.round(TARGET_CHUNK_CHARS * 0.15);             // ~210

// ── Embedding batch constants ─────────────────────────────────────────────
// Gemini embedding API allows up to 100 texts per batch request.
// We stay at 50 to stay safely under rate limits on the free tier.
const EMBED_BATCH_SIZE = 50;

// Free-tier RPM for gemini-embedding-001 is 1500 req/min for individual
// calls but the batch endpoint counts as 1 request per batch call.
// Adding a small inter-batch delay keeps us safe.
const INTER_BATCH_DELAY_MS = 500;

// ── Context budget ────────────────────────────────────────────────────────
// Maximum tokens we send to the chat model as retrieved context.
// gemini-2.5-flash-lite has a 1M token context window, but sending too
// much raises cost and hurts answer quality. 6000 tokens is generous
// for document Q&A while staying efficient.
const MAX_CONTEXT_TOKENS = 6000;

// ── Small-doc threshold ───────────────────────────────────────────────────
// Below this token count the whole document fits comfortably inside the
// context budget, so we skip vector search entirely. Token-based rather
// than chunk-count-based so it scales correctly regardless of chunk size.
const SMALL_DOC_TOKEN_LIMIT = MAX_CONTEXT_TOKENS; // 6000 tokens ≈ 21000 chars

// ── Summary query patterns ────────────────────────────────────────────────
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

// ── Quota / rate error helper ─────────────────────────────────────────────
function parseGeminiQuotaError(status, bodyText) {
  if (status !== 429 && status !== 503) return null;
  const lower = bodyText.toLowerCase();
  if (lower.includes('quota') && (lower.includes('day') || lower.includes('daily') || lower.includes('exhausted'))) {
    return { type: 'quota_daily', message: 'Daily API quota reached. Usage resets at midnight Pacific Time — please try again tomorrow.' };
  }
  if (lower.includes('rate') || lower.includes('per minute') || lower.includes('rpm') || lower.includes('resource_exhausted')) {
    return { type: 'quota_rpm', message: 'API rate limit reached. Please wait about a minute and try again.' };
  }
  if (status === 429) {
    return { type: 'quota_rpm', message: 'API rate limit reached. Please wait a moment and try again.' };
  }
  return null;
}

class QuotaError extends Error {
  constructor(type, message) {
    super(message);
    this.name = 'QuotaError';
    this.quotaType = type; // 'quota_daily' | 'quota_rpm'
  }
}

// ── Token-aware, sentence-respecting chunker ──────────────────────────────
// Splits on sentence boundaries first, then falls back to word boundaries
// for very long sentences. Never splits mid-sentence unless a single
// sentence exceeds the target chunk size.
function chunkDocument(text, targetChars = TARGET_CHUNK_CHARS, overlapChars = OVERLAP_CHARS) {
  const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z\u0600-\u06FF])|(?<=\n)/g;
  const sentences = text.split(sentenceRegex).filter(s => s.trim().length > 0);

  const chunks = [];
  let current = '';
  let currentIndex = 0;

  for (const sentence of sentences) {
    const candidate = current ? current + ' ' + sentence : sentence;

    if (candidate.length <= targetChars) {
      current = candidate;
    } else {
      if (current.trim().length > 50) {
        chunks.push({ content: current.trim(), index: currentIndex++ });
      }

      if (sentence.length > targetChars) {
        // Single sentence too long — split at word boundaries
        let pos = 0;
        while (pos < sentence.length) {
          let end = pos + targetChars;
          if (end < sentence.length) {
            const lastSpace = sentence.lastIndexOf(' ', end);
            if (lastSpace > pos) end = lastSpace;
          }
          const piece = sentence.slice(pos, end).trim();
          if (piece.length > 50) chunks.push({ content: piece, index: currentIndex++ });
          pos = end - overlapChars;
          if (pos <= 0) pos = end;
        }
        current = '';
      } else {
        // Start next chunk with overlap from end of previous chunk
        const words = current.split(' ');
        const overlapWordCount = Math.ceil(overlapChars / 8);
        const overlapWords = words.slice(-overlapWordCount).join(' ');
        current = overlapWords ? overlapWords + ' ' + sentence : sentence;
      }
    }
  }

  if (current.trim().length > 50) {
    chunks.push({ content: current.trim(), index: currentIndex });
  }

  return chunks;
}

// ── Batch embedding via direct fetch ─────────────────────────────────────
// Sends up to EMBED_BATCH_SIZE texts in a single API call using
// the batchEmbedContents endpoint. Counts as 1 request vs N requests.
async function embedBatch(texts) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model  = 'gemini-embedding-001';
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${apiKey}`;

  const requests = texts.map(text => ({
    model  : `models/${model}`,
    content: { parts: [{ text }] },
    output_dimensionality: 1536
  }));

  const response = await fetch(url, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ requests })
  });

  if (!response.ok) {
    const errText = await response.text();
    const quota   = parseGeminiQuotaError(response.status, errText);
    if (quota) throw new QuotaError(quota.type, quota.message);
    throw new Error(`Batch embedding API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.embeddings.map(e => e.values);
}

// ── Single embedding (used for query embedding only) ─────────────────────
async function getEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model  = 'gemini-embedding-001';
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      model  : `models/${model}`,
      content: { parts: [{ text }] },
      output_dimensionality: 1536
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    const quota   = parseGeminiQuotaError(response.status, errText);
    if (quota) throw new QuotaError(quota.type, quota.message);
    throw new Error(`Embedding API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

// ── Query embedding ───────────────────────────────────────────────────────
// Single call, lowercase-normalised. We dropped the original+lowercase
// averaging from v4.5 — it doubled RPM usage for marginal gain.
async function getQueryEmbedding(query) {
  return await getEmbedding(query.toLowerCase().trim());
}

// ── Embed and store document chunks ──────────────────────────────────────
async function embedAndStoreDocument(documentId, text) {
  const chunks = chunkDocument(text);

  const totalBatches = Math.ceil(chunks.length / EMBED_BATCH_SIZE);
  console.log(`📦 Embedding ${chunks.length} chunks for document ${documentId} in ${totalBatches} batch(es)...`);

  const rows = [];

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch    = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const texts    = batch.map(c => c.content);
    const batchNum = Math.floor(i / EMBED_BATCH_SIZE) + 1;

    console.log(`  Batch ${batchNum}/${totalBatches} — ${texts.length} chunks`);

    const vectors = await embedBatch(texts);

    for (let j = 0; j < batch.length; j++) {
      rows.push({
        document_id : documentId,
        chunk_index : batch[j].index,
        content     : batch[j].content,
        embedding   : vectors[j]
      });
    }

    if (i + EMBED_BATCH_SIZE < chunks.length) {
      await new Promise(r => setTimeout(r, INTER_BATCH_DELAY_MS));
    }
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

// ── Apply context token budget ────────────────────────────────────────────
// Trims a list of chunks so total estimated tokens stay within budget.
// For vector results: list is already sorted by relevance — most relevant first.
// For full-doc sends: list is sorted by chunk_index — reads in doc order.
function applyContextBudget(chunks) {
  let used   = 0;
  const result = [];

  for (const chunk of chunks) {
    const tokens = estimateTokens(chunk.content);
    if (used + tokens > MAX_CONTEXT_TOKENS) break;
    result.push(chunk);
    used += tokens;
  }

  if (result.length === 0 && chunks.length > 0) {
    // First chunk alone exceeds budget — truncate it
    const maxChars = Math.floor(MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN);
    result.push({ ...chunks[0], content: chunks[0].content.slice(0, maxChars) });
  }

  return result;
}

// ── Main retrieval function ───────────────────────────────────────────────
// Decision tree:
//   1. Fetch all chunks (always — needed for count + small-doc check).
//   2. Total tokens ≤ SMALL_DOC_TOKEN_LIMIT → send whole doc (no vector search).
//   3. Summary query → send whole doc, capped at context budget.
//   4. Otherwise → vector search with adaptive topK + context budget.
async function retrieveChunks(documentId, query) {
  const allChunks   = await retrieveAllChunks(documentId);
  const totalChunks = allChunks.length;

  if (totalChunks === 0) return { chunks: [], strategy: 'empty' };

  const totalTokens = allChunks.reduce((sum, c) => sum + estimateTokens(c.content), 0);

  // Small document — entire doc fits within context budget
  if (totalTokens <= SMALL_DOC_TOKEN_LIMIT) {
    const capped = applyContextBudget(allChunks);
    console.log(`📋 Strategy: small_doc_full (${totalChunks} chunks, ~${totalTokens} tokens)`);
    return { chunks: capped, strategy: 'small_doc_full' };
  }

  // Summary query — send as much of the document as the budget allows
  if (isSummaryQuery(query)) {
    const capped = applyContextBudget(allChunks);
    console.log(`📋 Strategy: summary_full (${capped.length}/${totalChunks} chunks fit in budget)`);
    return { chunks: capped, strategy: 'summary_full' };
  }

  // Large document + specific query → vector search
  const topK = Math.max(4, Math.min(Math.ceil(totalChunks * 0.12), 12));
  console.log(`🔍 Strategy: vector_search — topK=${topK} of ${totalChunks} chunks`);

  const queryEmbedding = await getQueryEmbedding(query);
  const { data, error } = await supabase.rpc('match_chunks', {
    p_document_id    : documentId,
    p_query_embedding: queryEmbedding,
    p_match_count    : topK
  });

  if (error) throw new Error(`match_chunks RPC error: ${error.message}`);

  const MIN_SIMILARITY = parseFloat(process.env.RAG_MIN_SIMILARITY) || 0.35;
  const filtered       = (data || []).filter(c => c.similarity >= MIN_SIMILARITY);
  const candidates     = filtered.length >= 3 ? filtered : (data || []).slice(0, 3);

  // Sort by position so the answer reads in document order
  const sorted   = [...candidates].sort((a, b) => (a.chunk_index ?? 0) - (b.chunk_index ?? 0));
  const budgeted = applyContextBudget(sorted);

  console.log(`✅ Vector search: ${budgeted.length} chunks returned`);
  return { chunks: budgeted, strategy: 'vector_search' };
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
  isSummaryQuery,
  estimateTokens,
  QuotaError
};
