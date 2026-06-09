import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const threatsRouter = Router();
threatsRouter.use(authenticate);

threatsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { severity, type, status, page = '1', limit = '50' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (type) where.type = type;
    if (status) where.status = status;
    const [threats, total] = await Promise.all([
      prisma.threat.findMany({ where, orderBy: { detectedAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.threat.count({ where }),
    ]);
    res.json({ threats, total });
  } catch {
    res.status(500).json({ error: 'Failed to fetch threats' });
  }
});

threatsRouter.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [total, critical, high, medium, low, active, byType] = await Promise.all([
      prisma.threat.count(),
      prisma.threat.count({ where: { severity: 'critical' } }),
      prisma.threat.count({ where: { severity: 'high' } }),
      prisma.threat.count({ where: { severity: 'medium' } }),
      prisma.threat.count({ where: { severity: 'low' } }),
      prisma.threat.count({ where: { status: 'active' } }),
      prisma.threat.groupBy({ by: ['type'], _count: { type: true }, orderBy: { _count: { type: 'desc' } } }),
    ]);
    res.json({ total, critical, high, medium, low, active, byType });
  } catch {
    res.status(500).json({ error: 'Failed to fetch threat stats' });
  }
});

threatsRouter.get('/timeline', async (_req: AuthRequest, res: Response) => {
  try {
    const threats = await prisma.threat.findMany({
      orderBy: { detectedAt: 'desc' },
      take: 100,
      select: { id: true, type: true, severity: true, detectedAt: true, status: true, description: true, sourceIp: true }
    });
    res.json(threats);
  } catch {
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

threatsRouter.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const threat = await prisma.threat.update({ where: { id: req.params.id }, data: { status } });
    res.json(threat);
  } catch {
    res.status(500).json({ error: 'Failed to update threat' });
  }
});
