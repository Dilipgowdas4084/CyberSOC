import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const logsRouter = Router();
logsRouter.use(authenticate);

logsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { level, search, page = '1', limit = '100' } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (level) where.level = level;
    if (search) {
      where.OR = [
        { action: { contains: search } },
        { resource: { contains: search } },
        { details: { contains: search } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      prisma.log.findMany({ where, include: { user: { select: { name: true, email: true } } }, orderBy: { timestamp: 'desc' }, skip, take: parseInt(limit) }),
      prisma.log.count({ where }),
    ]);
    res.json({ logs, total });
  } catch {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});
