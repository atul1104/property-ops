const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { QdrantVectorStore } = require('@langchain/qdrant');
const { createRetrievalChain } = require('langchain/chains/retrieval');
const { createHistoryAwareRetriever } = require('langchain/chains/history_aware_retriever');
const { createStuffDocumentsChain } = require('langchain/chains/combine_documents');
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

// Rewrites a follow-up question into a standalone question using chat history
const CONTEXTUALIZE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Given the conversation history and the user's latest question, rewrite the question as a fully self-contained question that can be understood without the history.
Do NOT answer it — only rephrase if needed, otherwise return it unchanged.`,
  ],
  new MessagesPlaceholder('chat_history'),
  ['human', '{input}'],
]);

// Final answer prompt
const RAG_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful property management assistant. Use only the lease document excerpts below to answer the tenant's question precisely. Cite relevant clause numbers or section headings when visible. If the answer is not in the context, say "I couldn't find that information in your lease documents."

Context:
{context}`,
  ],
  new MessagesPlaceholder('chat_history'),
  ['human', '{input}'],
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert raw history [{role, content}] → LangChain message objects */
const formatHistory = (history = []) =>
  history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => (m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)));

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Answer a question using RAG with:
 *   - History-aware retrieval (handles follow-up questions)
 *   - Multi-query retrieval (better recall via query variations)
 *   - MMR (diverse, non-redundant chunks)
 *   - Optional single-document filter (client-side)
 *
 * @param {string}   question
 * @param {string|null} documentId  — restrict search to one document
 * @param {Array}    history        — [{role, content}] conversation so far
 */
const queryDocuments = async (question, documentId = null, history = []) => {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: COLLECTION_NAME,
  });

  const chat_history = formatHistory(history);
  const documentChain = await createStuffDocumentsChain({ llm, prompt: RAG_PROMPT });

  // ── Single-document mode ─────────────────────────────────────────────────
  if (documentId) {
    // Fetch wide candidate set, filter client-side (avoids Qdrant Query API filter issues)
    const candidates = await vectorStore.similaritySearch(question, 60);
    const context = candidates
      .filter((doc) => doc.metadata?.documentId === documentId)
      .slice(0, 6);

    if (context.length === 0) {
      return {
        answer: "I couldn't find relevant content in that document for your question.",
        sources: [],
      };
    }

    const answer = await documentChain.invoke({ input: question, context, chat_history });
    return {
      answer,
      sources: context.map((doc) => ({
        content: doc.pageContent.slice(0, 300),
        metadata: doc.metadata,
      })),
    };
  }

  // ── All-documents mode ────────────────────────────────────────────────────

  // MMR base retriever — diversity over pure similarity
  const mmrRetriever = vectorStore.asRetriever({
    searchType: 'mmr',
    searchKwargs: { fetchK: 20, lambda: 0.6 }, // lambda: 0=max diversity, 1=max similarity
    k: 6,
  });

  // Multi-query wraps MMR: generates 3 query variants, retrieves for each, unions results
  const multiQueryRetriever = MultiQueryRetriever.fromLLM({
    llm,
    retriever: mmrRetriever,
    queryCount: 3,
    verbose: false,
  });

  // History-aware retriever: rewrites follow-up questions before hitting Qdrant
  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm,
    retriever: multiQueryRetriever,
    rephrasePrompt: CONTEXTUALIZE_PROMPT,
  });

  const retrievalChain = await createRetrievalChain({
    retriever: historyAwareRetriever,
    combineDocsChain: documentChain,
  });

  const result = await retrievalChain.invoke({ input: question, chat_history });

  return {
    answer: result.answer,
    sources: (result.context || []).map((doc) => ({
      content: doc.pageContent.slice(0, 300),
      metadata: doc.metadata,
    })),
  };
};

module.exports = { queryDocuments };
