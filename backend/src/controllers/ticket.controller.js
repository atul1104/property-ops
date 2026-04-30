const { PrismaClient } = require('@prisma/client');
const { triageTicket } = require('../services/triage.service');

const prisma = new PrismaClient();

const getTickets = async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : { userId: req.user.userId };

  const tickets = await prisma.ticket.findMany({
    where,
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json(tickets);
};

const createTicket = async (req, res) => {
  const { title, description } = req.body;

  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  // Fire-and-forget AI triage — never blocks ticket creation
  let priority = null;
  let aiTag = null;

  try {
    const triage = await triageTicket(title, description);
    priority = triage.priority;
    aiTag = triage.tag;
  } catch (err) {
    console.error('AI triage failed (non-fatal):', err.message);
  }

  const ticket = await prisma.ticket.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      priority,
      aiTag,
      userId: req.user.userId,
    },
    include: { user: { select: { email: true } } },
  });

  res.status(201).json(ticket);
};

const updateTicket = async (req, res) => {
  const { id } = req.params;
  const { status, priority, aiTag } = req.body;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(aiTag !== undefined && { aiTag }),
    },
    include: { user: { select: { email: true } } },
  });

  res.json(updated);
};

const deleteTicket = async (req, res) => {
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  await prisma.ticket.delete({ where: { id } });
  res.status(204).send();
};

const retriageTicket = async (req, res) => {
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const triage = await triageTicket(ticket.title, ticket.description);

  const updated = await prisma.ticket.update({
    where: { id },
    data: { priority: triage.priority, aiTag: triage.tag },
    include: { user: { select: { email: true } } },
  });

  res.json(updated);
};

module.exports = { getTickets, createTicket, updateTicket, deleteTicket, retriageTicket };
