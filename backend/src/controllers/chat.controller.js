const { queryDocuments, streamQueryDocuments } = require('../services/rag.service');

// In-memory session history — swap for Redis in production
const sessionHistory = new Map();
const MAX_HISTORY = 50;

// RAG response cache — keyed by (documentId + question), TTL of 1 hour
const ragCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

const getCacheKey = (question, documentId) =>
  `${documentId || 'all'}::${question.toLowerCase().trim()}`;

const chat = async (req, res) => {
  const { question, sessionId, documentId, maxWords } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  const sid = sessionId || req.user.userId;

  // Pass the last 10 messages as context (5 turns) — keeps token usage manageable
  const history = sessionHistory.get(sid) || [];
  const recentHistory = history.slice(-10);

  const wordLimit = Number.isInteger(maxWords) && maxWords > 0 ? maxWords : 200;

  const cacheKey = getCacheKey(question.trim(), documentId || null);
  const cached = ragCache.get(cacheKey);
  let answer, sources;

  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    ({ answer, sources } = cached);
  } else {
    ({ answer, sources } = await queryDocuments(question.trim(), documentId || null, recentHistory, wordLimit));
    ragCache.set(cacheKey, { answer, sources, ts: Date.now() });
  }
  history.push(
    { role: 'user', content: question.trim(), documentId: documentId || null, timestamp: new Date().toISOString() },
    { role: 'assistant', content: answer, sources, timestamp: new Date().toISOString() }
  );

  // Cap history to avoid unbounded memory growth
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  sessionHistory.set(sid, history);

  res.json({ answer, sources, sessionId: sid });
};

const chatStream = async (req, res) => {
  const { question, sessionId, documentId, maxWords } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  const sid = sessionId || req.user.userId;
  const history = sessionHistory.get(sid) || [];
  const recentHistory = history.slice(-10);
  const wordLimit = Number.isInteger(maxWords) && maxWords > 0 ? maxWords : 200;

  try {
    const cacheKey = getCacheKey(question.trim(), documentId || null);
    const cached = ragCache.get(cacheKey);
    let fullAnswer = '';
    let sources = [];

    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      // Send cached answer as a single chunk so the frontend still animates it
      fullAnswer = cached.answer;
      sources = cached.sources;
      send({ chunk: fullAnswer });
    } else {
      for await (const event of streamQueryDocuments(question.trim(), documentId || null, recentHistory, wordLimit)) {
        if (event.chunk) {
          fullAnswer += event.chunk;
          send({ chunk: event.chunk });
        }
        if (event.done) {
          sources = event.sources;
        }
      }
      ragCache.set(cacheKey, { answer: fullAnswer, sources, ts: Date.now() });
    }

    history.push(
      { role: 'user', content: question.trim(), documentId: documentId || null, timestamp: new Date().toISOString() },
      { role: 'assistant', content: fullAnswer, sources, timestamp: new Date().toISOString() }
    );
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    sessionHistory.set(sid, history);

    send({ done: true, sources, sessionId: sid });
  } catch (err) {
    console.error('Stream error:', err.message);
    send({ error: err.message || 'Stream failed' });
  }

  res.end();
};

const getChatHistory = async (req, res) => {
  const { sessionId } = req.params;
  const history = sessionHistory.get(sessionId) || [];
  res.json(history);
};

module.exports = { chat, getChatHistory, chatStream };
