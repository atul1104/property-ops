const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { uploadDocument, getDocuments, deleteDocument } = require('../controllers/document.controller');

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Lease PDF upload and management
 */

/**
 * @swagger
 * /documents/upload:
 *   post:
 *     summary: Upload a lease PDF — stores in Supabase and ingests into Qdrant (admin only)
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Document uploaded and queued for vectorization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       400:
 *         description: Missing file or not a PDF
 */
router.post('/upload', authenticate, requireAdmin, upload.single('file'), uploadDocument);

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: List all uploaded documents
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: Array of documents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 */
router.get('/', authenticate, getDocuments);

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Delete a document from DB, Supabase Storage, and Qdrant (admin only)
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Document not found
 */
router.delete('/:id', authenticate, requireAdmin, deleteDocument);

module.exports = router;
