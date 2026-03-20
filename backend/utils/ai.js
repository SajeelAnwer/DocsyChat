const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const { QuotaError } = require('./rag');

// Parse Gemini SDK errors for quota/rate issues
function extractGeminiQuota(err) {
  const msg = (err?.message || '').toLowerCase();
  const status = err?.status || err?.httpStatus || (err?.response?.status);
  // Daily quota
  if (msg.includes('quota') && (msg.includes('day') || msg.includes('exhausted') || msg.includes('daily'))) {
    return new QuotaError('quota_daily', 'Daily API quota reached. Usage resets at midnight Pacific Time — please try again tomorrow.');
  }
  // Rate limit (RPM)
  if (status === 429 || msg.includes('rate') || msg.includes('per minute') || msg.includes('rpm') || msg.includes('resource_exhausted')) {
    return new QuotaError('quota_rpm', 'API rate limit reached. Please wait about a minute and try again.');
  }
  return null;
}

const SYSTEM_PROMPT = `You are DocsyChat, an AI assistant that helps users understand and explore documents.

Your job:
- Answer questions using ONLY the document sections provided to you in each message.
- Be helpful, clear, and thorough. Use the information available to give the best answer you can.
- If a user asks for a summary, overview, or to cover everything, give a complete summary of all the sections provided.
- If the user asks about a topic that is genuinely not in the provided sections, say so briefly — for example: "The document doesn't cover [topic]." Do not repeat this disclaimer on every message.
- Stay strictly focused on the document section content given. Do not bring in outside knowledge.

What you cannot do:
- You cannot create, generate, or export files of any kind (no DOCX, PDF, PowerPoint, CSV, etc.).
- You cannot create presentations or slides, but you CAN write out slide content or structured outlines as plain text if asked.
- You cannot browse the internet or access external information.

About yourself:
- If asked which AI model or technology powers you, say: "I'm DocsyChat — I'm not able to share details about the underlying model."
- If asked who made you, say you were built as a document Q&A tool.

Language:
- Always respond in the same language the user is writing in. If they write in Urdu, respond in Urdu. If they switch languages mid-conversation, switch with them.`;

function buildRAGContext(contextText) {
  return `The following are the most relevant sections from the document for this question:\n\n${contextText}\n\n---\nAnswer using only the above document sections.`;
}

async function askGemini(contextText, conversationHistory, userMessage) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const ragContext = buildRAGContext(contextText);

  const history = conversationHistory.slice(0, -1).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood. I\'m ready to help with your document.' }] },
      ...history
    ],
    generationConfig: { maxOutputTokens: 1500, temperature: 0.4 }
  });

  try {
    const result = await chat.sendMessage(`${ragContext}\n\nUser: ${userMessage}`);
    return result.response.text();
  } catch (err) {
    const quota = extractGeminiQuota(err);
    if (quota) throw quota;
    throw err;
  }
}

async function askOpenAI(contextText, conversationHistory, userMessage) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const ragContext = buildRAGContext(contextText);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(0, -1).map(msg => ({ role: msg.role, content: msg.content })),
    { role: 'user', content: `${ragContext}\n\nUser: ${userMessage}` }
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    max_tokens: 1500,
    temperature: 0.4
  });

  return completion.choices[0].message.content;
}

async function askAI(contextText, conversationHistory, userMessage) {
  const provider = process.env.AI_PROVIDER || 'gemini';
  if (provider === 'openai') return await askOpenAI(contextText, conversationHistory, userMessage);
  return await askGemini(contextText, conversationHistory, userMessage);
}

module.exports = { askAI };
