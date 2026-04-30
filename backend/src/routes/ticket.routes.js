const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { getTickets, createTicket, updateTicket, deleteTicket } = require('../controllers/ticket.controller');

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Maintenance request management
 */

/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: List tickets (tenant sees own; admin sees all)
 *     tags: [Tickets]
 *     responses:
 *       200:
 *         description: Array of tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ticket'
 */
router.get('/', authenticate, getTickets);

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Submit a new maintenance request (AI-triaged automatically)
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:       { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Ticket created with AI priority and tag
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 */
router.post('/', authenticate, createTicket);

/**
 * @swagger
 * /tickets/{id}:
 *   patch:
 *     summary: Update ticket status / priority (admin only)
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:   { type: string, enum: [OPEN, IN_PROGRESS, RESOLVED, CLOSED] }
 *               priority: { type: string, enum: [URGENT, ROUTINE, COSMETIC] }
 *               aiTag:    { type: string }
 *     responses:
 *       200:
 *         description: Updated ticket
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 */
router.patch('/:id', authenticate, requireAdmin, updateTicket);

/**
 * @swagger
 * /tickets/{id}:
 *   delete:
 *     summary: Delete a ticket (admin only)
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete('/:id', authenticate, requireAdmin, deleteTicket);

module.exports = router;
