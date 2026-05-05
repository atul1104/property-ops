const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { QdrantVectorStore } = require('@langchain/qdrant');

const COLLECTION_NAME = 'lease-docs';

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'gemini-embedding-001',
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Parse, chunk, embed, and upsert a PDF into Qdrant.
 * Returns the number of chunks stored.
 */
const ingestDocument = async (pdfBuffer, documentId, filename) => {
  // pdf-parse is CJS — safe to require() here
  const pdfParse = require('pdf-parse');
  const parsed = await pdfParse(pdfBuffer);

  if (!parsed.text?.trim()) {
    throw new Error('PDF appears to be empty or image-only (no extractable text)');
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const docs = await splitter.createDocuments(
    [parsed.text],
    [{ documentId, filename, pageCount: parsed.numpages }]
  );

  await QdrantVectorStore.fromDocuments(docs, embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: COLLECTION_NAME,
  });

  return docs.length;
};

module.exports = { ingestDocument };
