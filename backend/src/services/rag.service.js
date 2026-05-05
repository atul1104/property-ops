const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { QdrantVectorStore } = require('@langchain/qdrant');
const { createHistoryAwareRetriever } = require('langchain/chains/history_aware_retriever');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { MultiQueryRetriever } = require('langchain/retrievers/multi_query');

const COLLECTION_NAME = 'lease-docs';

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'gemini-embedding-001',
  apiKey: process.env.GEMINI_API_KEY,
});

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash-lite',
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.2,
  maxOutputTokens: 1024,
});

// ── Prompts ───────────────────────────────────────────────────────────────────

const CONTEXTUALIZE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Given the conversation history and the user's latest question, rewrite the question as a fully self-contained question that can be understood without the history.
Do NOT answer it — only rephrase if needed, otherwise return it unchanged.`,
  ],
  new MessagesPlaceholder('chat_history'),
  ['human', '{input}'],
]);

// Pass 1 — extract only facts relevant to the question from retrieved chunks
const VERIFY_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a fact extractor for a property management assistant.
Given the lease document excerpts and the tenant's question, extract ONLY the specific facts, rules, figures, clause numbers, and deadlines that are directly relevant to answering the question.
Be precise: include exact percentages, dollar amounts, day counts, and section references.
If the excerpts contain no information relevant to the question, respond with exactly: INSUFFICIENT_CONTEXT`,
  ],
  ['human', 'Lease excerpts:\n{context}\n\nQuestion: {question}'],
]);

// Pass 2 — generate the final answer from verified facts only
const ANSWER_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful property management assistant. Today's date is {current_date}.
Use ONLY the verified lease facts below to answer the tenant's question precisely.
If the tenant provides personal figures (rent amount, payment date, number of days late, etc.), apply the lease policy from the facts to calculate a specific answer.
Keep your answer under {max_words} words. If longer, summarize without omitting critical facts.

Verified lease facts:
{verified_facts}`,
  ],
  new MessagesPlaceholder('chat_history'),
  ['human', '{input}'],
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatHistory = (history = []) =>
  history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => (m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)));

const docsToText = (docs) =>
  docs.map((d, i) => `[Excerpt ${i + 1}]\n${d.pageContent}`).join('\n\n');

// Safely extract text from an AIMessage or AIMessageChunk
const chunkText = (chunk) =>
  typeof chunk.content === 'string'
    ? chunk.content
    : Array.isArray(chunk.content)
    ? chunk.content.map((c) => c.text ?? '').join('')
    : '';

const COMPLEX_MARKERS = [' and ', 'also', 'additionally', 'compare', 'difference', 'versus', ' vs ', 'what if'];

const isComplexQuestion = (question) => {
  if (question.trim().split(/\s+/).length >= 10) return true;
  const lower = question.toLowerCase();
  return COMPLEX_MARKERS.some((m) => lower.includes(m));
};

const buildRetriever = (vectorStore, question) => {
  const complex = isComplexQuestion(question);
  const k = complex ? 6 : 3;
  const fetchK = complex ? 20 : 10;

  const mmrRetriever = vectorStore.asRetriever({
    searchType: 'mmr',
    searchKwargs: { fetchK, lambda: 0.6 },
    k,
  });

  if (!complex) return mmrRetriever;

  return MultiQueryRetriever.fromLLM({
    llm,
    retriever: mmrRetriever,
    queryCount: 3,
    verbose: false,
  });
};

/**
 * Pass 1: runs the verify prompt against retrieved docs.
 * Returns the extracted facts string, or null if the context is insufficient.
 */
const extractVerifiedFacts = async (question, docs) => {
  if (docs.length === 0) return null;
  const result = await VERIFY_PROMPT.pipe(llm).invoke({
    context: docsToText(docs),
    question,
  });
  const text = chunkText(result).trim();
  return text.startsWith('INSUFFICIENT_CONTEXT') ? null : text;
};

const currentDate = () =>
  new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// ── Main export ───────────────────────────────────────────────────────────────

const queryDocuments = async (question, documentId = null, history = [], maxWords = 200) => {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: COLLECTION_NAME,
  });

  const chat_history = formatHistory(history);
  const sharedArgs = { input: question, chat_history, max_words: maxWords, current_date: currentDate() };

  // ── Single-document mode ─────────────────────────────────────────────────
  if (documentId) {
    const candidates = await vectorStore.similaritySearch(question, 60);
    const docs = candidates.filter((d) => d.metadata?.documentId === documentId).slice(0, 6);
    const sources = docs.map((d) => ({ content: d.pageContent.slice(0, 300), metadata: d.metadata }));

    const verifiedFacts = await extractVerifiedFacts(question, docs);
    if (!verifiedFacts) {
      return { answer: "I couldn't find that information in your lease documents.", sources: [] };
    }

    const result = await ANSWER_PROMPT.pipe(llm).invoke({ ...sharedArgs, verified_facts: verifiedFacts });
    return { answer: chunkText(result), sources };
  }

  // ── All-documents mode ────────────────────────────────────────────────────
  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm,
    retriever: buildRetriever(vectorStore, question),
    rephrasePrompt: CONTEXTUALIZE_PROMPT,
  });

  // Step 1: retrieve
  const docs = await historyAwareRetriever.invoke({ input: question, chat_history });
  const sources = docs.map((d) => ({ content: d.pageContent.slice(0, 300), metadata: d.metadata }));

  // Step 2: verify
  const verifiedFacts = await extractVerifiedFacts(question, docs);
  if (!verifiedFacts) {
    return { answer: "I couldn't find that information in your lease documents.", sources: [] };
  }

  // Step 3: answer
  const result = await ANSWER_PROMPT.pipe(llm).invoke({ ...sharedArgs, verified_facts: verifiedFacts });
  return { answer: chunkText(result), sources };
};

// ── Streaming export ──────────────────────────────────────────────────────────

async function* streamQueryDocuments(question, documentId = null, history = [], maxWords = 200) {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: COLLECTION_NAME,
  });

  const chat_history = formatHistory(history);
  const sharedArgs = { input: question, chat_history, max_words: maxWords, current_date: currentDate() };

  // ── Single-document mode ─────────────────────────────────────────────────
  if (documentId) {
    const candidates = await vectorStore.similaritySearch(question, 60);
    const docs = candidates.filter((d) => d.metadata?.documentId === documentId).slice(0, 6);
    const sources = docs.map((d) => ({ content: d.pageContent.slice(0, 300), metadata: d.metadata }));

    const verifiedFacts = await extractVerifiedFacts(question, docs);
    if (!verifiedFacts) {
      yield { chunk: "I couldn't find that information in your lease documents." };
      yield { done: true, sources: [] };
      return;
    }

    const stream = await ANSWER_PROMPT.pipe(llm).stream({ ...sharedArgs, verified_facts: verifiedFacts });
    for await (const chunk of stream) {
      const text = chunkText(chunk);
      if (text) yield { chunk: text };
    }
    yield { done: true, sources };
    return;
  }

  // ── All-documents mode ────────────────────────────────────────────────────
  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm,
    retriever: buildRetriever(vectorStore, question),
    rephrasePrompt: CONTEXTUALIZE_PROMPT,
  });

  // Step 1: retrieve
  const docs = await historyAwareRetriever.invoke({ input: question, chat_history });
  const sources = docs.map((d) => ({ content: d.pageContent.slice(0, 300), metadata: d.metadata }));

  // Step 2: verify (must complete before streaming — gatekeeper step)
  const verifiedFacts = await extractVerifiedFacts(question, docs);
  if (!verifiedFacts) {
    yield { chunk: "I couldn't find that information in your lease documents." };
    yield { done: true, sources: [] };
    return;
  }

  // Step 3: stream answer
  const stream = await ANSWER_PROMPT.pipe(llm).stream({ ...sharedArgs, verified_facts: verifiedFacts });
  for await (const chunk of stream) {
    const text = chunkText(chunk);
    if (text) yield { chunk: text };
  }

  yield { done: true, sources };
}

module.exports = { queryDocuments, streamQueryDocuments };
