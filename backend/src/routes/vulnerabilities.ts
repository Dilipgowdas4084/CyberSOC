import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const vulnerabilitiesRouter = Router();
vulnerabilitiesRouter.use(authenticate);

vulnerabilitiesRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { severity, status, deviceId, page = '1', limit = '50' } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (deviceId) where.deviceId = deviceId;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [vulns, total] = await Promise.all([
      prisma.vulnerability.findMany({
        where, include: { device: { select: { ip: true, hostname: true, deviceType: true } } },
        orderBy: { cvssScore: 'desc' }, skip, take: parseInt(limit)
      }),
      prisma.vulnerability.count({ where }),
    ]);
    res.json({ vulnerabilities: vulns, total });
  } catch {
    res.status(500).json({ error: 'Failed to fetch vulnerabilities' });
  }
});

vulnerabilitiesRouter.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [total, critical, high, medium, low, open] = await Promise.all([
      prisma.vulnerability.count(),
      prisma.vulnerability.count({ where: { severity: 'critical' } }),
      prisma.vulnerability.count({ where: { severity: 'high' } }),
      prisma.vulnerability.count({ where: { severity: 'medium' } }),
      prisma.vulnerability.count({ where: { severity: 'low' } }),
      prisma.vulnerability.count({ where: { status: 'open' } }),
    ]);
    res.json({ total, critical, high, medium, low, open });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

vulnerabilitiesRouter.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const vuln = await prisma.vulnerability.update({
      where: { id: req.params.id },
      data: { status, resolvedAt: status === 'resolved' ? new Date() : undefined }
    });
    res.json(vuln);
  } catch {
    res.status(500).json({ error: 'Failed to update vulnerability' });
  }
});
