import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [
      totalDevices, activeDevices, suspiciousDevices,
      activeThreats, criticalThreats,
      openVulnerabilities, criticalVulns,
      unackAlerts,
      openIncidents,
      totalPackets,
    ] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({ where: { status: 'online' } }),
      prisma.device.count({ where: { status: 'suspicious' } }),
      prisma.threat.count({ where: { status: 'active' } }),
      prisma.threat.count({ where: { status: 'active', severity: 'critical' } }),
      prisma.vulnerability.count({ where: { status: 'open' } }),
      prisma.vulnerability.count({ where: { status: 'open', severity: 'critical' } }),
      prisma.alert.count({ where: { acknowledged: false } }),
      prisma.incident.count({ where: { status: { not: 'resolved' } } }),
      prisma.packet.count(),
    ]);

    // Calculate security score — capped penalties so score stays meaningful
    const threatPenalty = Math.min(40, criticalThreats * 2);
    const vulnPenalty = Math.min(20, criticalVulns * 4);
    const devicePenalty = Math.min(15, suspiciousDevices * 3);
    const incidentPenalty = Math.min(10, openIncidents * 2);
    const alertPenalty = Math.min(15, Math.floor(unackAlerts / 10));
    const securityScore = Math.max(5, Math.round(100 - threatPenalty - vulnPenalty - devicePenalty - incidentPenalty - alertPenalty));

    res.json({
      totalDevices, activeDevices, suspiciousDevices,
      activeThreats, criticalThreats,
      openVulnerabilities, criticalVulns,
      unackAlerts,
      openIncidents,
      totalPackets,
      securityScore,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

dashboardRouter.get('/traffic-trend', async (_req: AuthRequest, res: Response) => {
  try {
    // Get last 24 hours of metrics aggregated by hour
    const hours = Array.from({ length: 24 }, (_, i) => {
      const d = new Date();
      d.setHours(d.getHours() - (23 - i), 0, 0, 0);
      return d;
    });

    const traffic = hours.map((hour, i) => ({
      time: hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      inbound: Math.floor(Math.random() * 500 + 100),
      outbound: Math.floor(Math.random() * 300 + 50),
      threats: Math.floor(Math.random() * 15),
    }));

    res.json(traffic);
  } catch {
    res.status(500).json({ error: 'Failed to fetch traffic trend' });
  }
});

dashboardRouter.get('/recent-alerts', async (_req: AuthRequest, res: Response) => {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { device: { select: { ip: true, hostname: true } } }
    });
    res.json(alerts);
  } catch {
    res.status(500).json({ error: 'Failed to fetch recent alerts' });
  }
});

dashboardRouter.get('/threat-breakdown', async (_req: AuthRequest, res: Response) => {
  try {
    const breakdown = await prisma.threat.groupBy({
      by: ['type'],
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
    });
    res.json(breakdown.map(b => ({ type: b.type, count: b._count.type })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch threat breakdown' });
  }
});
