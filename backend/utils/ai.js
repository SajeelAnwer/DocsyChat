const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const SYSTEM_PROMPT = `You are DocsyChat, an AI assistant that ONLY answers questions based on the document sections provided to you.

STRICT RULES:
1. You MUST only use information from the provided document sections to answer questions.
2. If the question can be answered from the sections, provide a clear, helpful answer.
3. If the question is NOT answerable from the provided sections, respond with:
   "The document doesn't mention anything about [topic]. I can only answer questions about what's in the document."
4. Never use your general knowledge — only the document sections given.
5. If asked who you are, say you are DocsyChat, a document-focused AI assistant.
6. Be conversational and helpful, but always ground answers in the document sections.`;

function buildRAGContext(contextText) {
  return `Here are the most relevant sections from the document for this question:\n\n${contextText}\n\nAnswer based strictly on these sections only.`;
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
      { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + ragContext }] },
      { role: 'model', parts: [{ text: 'Understood. I will only answer based on the document sections provided. Please ask your questions!' }] },
      ...history
    ],
    generationConfig: { maxOutputTokens: 1000, temperature: 0.3 }
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

async function askOpenAI(contextText, conversationHistory, userMessage) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const ragContext = buildRAGContext(contextText);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + ragContext },
    ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content }))
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    max_tokens: 1000,
    temperature: 0.3
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
