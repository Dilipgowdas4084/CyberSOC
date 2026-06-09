import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const alertsRouter = Router();
alertsRouter.use(authenticate);

alertsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { severity, type, acknowledged, page = '1', limit = '50' } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (type) where.type = type;
    if (acknowledged !== undefined) where.acknowledged = acknowledged === 'true';
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({ where, include: { device: { select: { ip: true, hostname: true } } }, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.alert.count({ where }),
    ]);
    res.json({ alerts, total });
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

alertsRouter.get('/unread-count', async (_req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.alert.count({ where: { acknowledged: false } });
    res.json({ count });
  } catch {
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

alertsRouter.patch('/acknowledge-all', async (_req: AuthRequest, res: Response) => {
  try {
    await prisma.alert.updateMany({ where: { acknowledged: false }, data: { acknowledged: true, acknowledgedAt: new Date() } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to acknowledge all' });
  }
});

alertsRouter.patch('/:id/acknowledge', async (_req: AuthRequest, res: Response) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: _req.params.id },
      data: { acknowledged: true, acknowledgedAt: new Date(), isRead: true }
    });
    res.json(alert);
  } catch {
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

alertsRouter.patch('/:id/resolve', async (_req: AuthRequest, res: Response) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: _req.params.id },
      data: { acknowledged: true, resolvedAt: new Date(), isRead: true }
    });
    res.json(alert);
  } catch {
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});
