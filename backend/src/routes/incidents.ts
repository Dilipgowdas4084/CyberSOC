import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { v4 as uuid } from 'uuid';

export const incidentsRouter = Router();
incidentsRouter.use(authenticate);

incidentsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, severity } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    const incidents = await prisma.incident.findMany({ where, include: { analyst: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
    res.json({ incidents });
  } catch {
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

incidentsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { title, severity, description, assignedTo } = req.body;
    const count = await prisma.incident.count();
    const incidentId = `INC-2024-${String(count + 1).padStart(4, '0')}`;
    const incident = await prisma.incident.create({
      data: { incidentId, title, severity: severity || 'medium', description, assignedTo: assignedTo || undefined, status: 'open' }
    });
    res.status(201).json(incident);
  } catch {
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

incidentsRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { status, resolution, assignedTo } = req.body;
    const data: Record<string, unknown> = {};
    if (status) { data.status = status; if (status === 'resolved') data.resolvedAt = new Date(); }
    if (resolution) data.resolution = resolution;
    if (assignedTo) data.assignedTo = assignedTo;
    const incident = await prisma.incident.update({ where: { id: req.params.id }, data });
    res.json(incident);
  } catch {
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

incidentsRouter.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [open, investigating, inProgress, resolved] = await Promise.all([
      prisma.incident.count({ where: { status: 'open' } }),
      prisma.incident.count({ where: { status: 'investigating' } }),
      prisma.incident.count({ where: { status: 'in_progress' } }),
      prisma.incident.count({ where: { status: 'resolved' } }),
    ]);
    res.json({ open, investigating, inProgress, resolved });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
