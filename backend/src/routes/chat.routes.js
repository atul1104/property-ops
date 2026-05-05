const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { chat, getChatHistory, chatStream } = require('../controllers/chat.controller');

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: RAG-powered lease document chatbot
 */

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Ask a question about uploaded lease documents
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question]
 *             properties:
 *               question:
 *                 type: string
 *                 example: "What is the pet policy in my lease?"
 *               sessionId:
 *                 type: string
 *                 description: Optional session ID for history grouping
 *     responses:
 *       200:
 *         description: AI answer with source excerpts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       content:  { type: string }
 *                       metadata: { type: object }
 *                 sessionId:
 *                   type: string
 */
router.post('/', authenticate, chat);
router.post('/stream', authenticate, chatStream);

/**
 * @swagger
 * /chat/history/{sessionId}:
 *   get:
 *     summary: Get conversation history for a session
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of chat messages
 */
router.get('/history/:sessionId', authenticate, getChatHistory);

module.exports = router;
