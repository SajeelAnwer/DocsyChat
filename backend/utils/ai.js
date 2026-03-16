const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const SYSTEM_PROMPT = `You are DocsyChat, a helpful AI assistant. Your job is to answer questions based on the document content provided to you in each message.

Guidelines:
- Answer questions using the document sections given. Be helpful, clear, and thorough.
- If the user asks for a summary or overview, summarize the content from the sections provided.
- If something is clearly not covered anywhere in the provided sections, say so briefly and naturally — for example: "I don't see anything about [topic] in the document."
- Do not repeat the rule about only using the document in every response. Just answer naturally.
- You may use your language ability to rephrase and present the information clearly, but always base your answers on the provided document content.
- If asked who you are, say you are DocsyChat, an AI assistant that helps users understand their documents.`;

function buildRAGContext(contextText) {
  return `The following are sections from the document relevant to the user's question:\n\n${contextText}\n\n---\nAnswer the user's question based on the above document content.`;
}

async function askGemini(contextText, conversationHistory, userMessage) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const ragContext = buildRAGContext(contextText);

  // Build history excluding the very last message (the current one)
  const history = conversationHistory.slice(0, -1).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood! I\'m ready to help answer questions about your document.' }] },
      ...history
    ],
    generationConfig: { maxOutputTokens: 1500, temperature: 0.4 }
  });

  // Send RAG context together with the user message so context is fresh per query
  const result = await chat.sendMessage(`${ragContext}\n\nUser question: ${userMessage}`);
  return result.response.text();
}

async function askOpenAI(contextText, conversationHistory, userMessage) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const ragContext = buildRAGContext(contextText);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(0, -1).map(msg => ({ role: msg.role, content: msg.content })),
    { role: 'user', content: `${ragContext}\n\nUser question: ${userMessage}` }
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
  if (provider === 'openai') {
    return await askOpenAI(contextText, conversationHistory, userMessage);
  }
  return await askGemini(contextText, conversationHistory, userMessage);
}

module.exports = { askAI };
