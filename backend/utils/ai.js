const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const SYSTEM_PROMPT = `You are DocuChat, an AI assistant that ONLY answers questions based on the document provided to you.

STRICT RULES:
1. You MUST only use information from the provided document to answer questions.
2. If the question can be answered from the document, provide a clear, helpful answer and reference the relevant section.
3. If the question is NOT related to or cannot be answered from the document, respond with something like:
   "The document doesn't mention anything about [topic]. Based on the document, I can only answer questions related to [what the doc covers]."
4. Never use your general knowledge to answer — only the document content.
5. If asked who you are, say you are DocuChat, a document-focused AI assistant.
6. Be conversational and helpful, but always ground answers in the document.
7. When quoting or referencing the document, be specific.`;

function buildDocumentContext(documentText) {
  return `Here is the document content you must base all your answers on:\n\n---DOCUMENT START---\n${documentText}\n---DOCUMENT END---\n\nOnly answer questions based on the above document.`;
}

async function askGemini(documentText, conversationHistory, userMessage) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const docContext = buildDocumentContext(documentText);
  
  // Build conversation for Gemini
  const history = conversationHistory.slice(0, -1).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + docContext }] },
      { role: 'model', parts: [{ text: 'Understood. I will only answer questions based on the provided document. Please ask your questions!' }] },
      ...history
    ],
    generationConfig: { maxOutputTokens: 1000, temperature: 0.3 }
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

async function askOpenAI(documentText, conversationHistory, userMessage) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const docContext = buildDocumentContext(documentText);
  
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + docContext },
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

async function askAI(documentText, conversationHistory, userMessage) {
  const provider = process.env.AI_PROVIDER || 'gemini';
  
  if (provider === 'openai') {
    return await askOpenAI(documentText, conversationHistory, userMessage);
  } else {
    return await askGemini(documentText, conversationHistory, userMessage);
  }
}

module.exports = { askAI };
