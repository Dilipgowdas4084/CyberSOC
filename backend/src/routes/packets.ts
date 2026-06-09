import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const packetsRouter = Router();
packetsRouter.use(authenticate);

packetsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { protocol, sourceIp, destIp, suspicious, limit = '100' } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (protocol) where.protocol = protocol;
    if (sourceIp) where.sourceIp = { contains: sourceIp };
    if (destIp) where.destIp = { contains: destIp };
    if (suspicious === 'true') where.isSuspicious = true;
    const packets = await prisma.packet.findMany({ where, orderBy: { timestamp: 'desc' }, take: parseInt(limit) });
    res.json({ packets });
  } catch {
    res.status(500).json({ error: 'Failed to fetch packets' });
  }
});

packetsRouter.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [total, suspicious, byProtocol] = await Promise.all([
      prisma.packet.count(),
      prisma.packet.count({ where: { isSuspicious: true } }),
      prisma.packet.groupBy({ by: ['protocol'], _count: { protocol: true }, _sum: { size: true } }),
    ]);
    res.json({ total, suspicious, byProtocol });
  } catch {
    res.status(500).json({ error: 'Failed to fetch packet stats' });
  }
});
