const { PrismaClient } = require('@prisma/client');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { uploadPdf, deletePdf } = require('../services/storage.service');
const { ingestDocument } = require('../services/ingest.service');

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});
const COLLECTION_NAME = 'lease-docs';

const prisma = new PrismaClient();

const uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'A PDF file is required' });
  }

  const { originalname, buffer } = req.file;

  const storageKey = await uploadPdf(buffer, originalname);

  const document = await prisma.document.create({
    data: { filename: originalname, storageKey, vectorized: false },
  });

  // Ingest asynchronously — don't block the HTTP response
  ingestDocument(buffer, document.id, originalname)
    .then((chunkCount) => {
      console.log(`Ingested ${chunkCount} chunks for document ${document.id}`);
      return prisma.document.update({
        where: { id: document.id },
        data: { vectorized: true },
      });
    })
    .catch((err) => console.error(`Ingest failed for ${document.id}:`, err.message));

  res.status(201).json({
    ...document,
    message: 'Upload successful — document is being processed for AI search.',
  });
};

const getDocuments = async (req, res) => {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(documents);
};

const deleteDocument = async (req, res) => {
  const { id } = req.params;

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return res.status(404).json({ error: 'Document not found' });

  // Remove from Supabase Storage
  await deletePdf(document.storageKey);

  // Remove all Qdrant vectors that were ingested from this document
  if (document.vectorized) {
    try {
      await qdrant.delete(COLLECTION_NAME, {
        filter: {
          must: [{ key: 'metadata.documentId', match: { value: id } }],
        },
      });
    } catch (err) {
      console.error('Qdrant delete failed (non-fatal):', err.message);
    }
  }

  // Remove from DB
  await prisma.document.delete({ where: { id } });

  res.status(204).send();
};

module.exports = { uploadDocument, getDocuments, deleteDocument };
