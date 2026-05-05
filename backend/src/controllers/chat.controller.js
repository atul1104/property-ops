const { queryDocuments } = require('../services/rag.service');

// In-memory session history — swap for Redis in production
const sessionHistory = new Map();
const MAX_HISTORY = 50;

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
  const { answer, sources } = await queryDocuments(question.trim(), documentId || null, recentHistory, wordLimit);
  history.push(
    { role: 'user', content: question.trim(), documentId: documentId || null, timestamp: new Date().toISOString() },
    { role: 'assistant', content: answer, sources, timestamp: new Date().toISOString() }
  );

  // Cap history to avoid unbounded memory growth
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  sessionHistory.set(sid, history);

  res.json({ answer, sources, sessionId: sid });
};

const getChatHistory = async (req, res) => {
  const { sessionId } = req.params;
  const history = sessionHistory.get(sessionId) || [];
  res.json(history);
};

module.exports = { chat, getChatHistory };
