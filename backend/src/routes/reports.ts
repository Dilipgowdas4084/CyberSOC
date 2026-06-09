import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const reportsRouter = Router();
reportsRouter.use(authenticate);

// Executive summary report
reportsRouter.get('/summary', async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalDevices, onlineDevices, rogueDevices,
      totalThreats, resolvedThreats, activeThreats,
      totalAlerts, unackAlerts,
      openVulns, criticalVulns, resolvedVulns,
      openIncidents, resolvedIncidents,
      newThreatsThisWeek, newThreatsLastWeek,
      newDevicesThisWeek,
    ] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({ where: { status: 'online' } }),
      prisma.device.count({ where: { isRogue: true } }),
      prisma.threat.count(),
      prisma.threat.count({ where: { status: 'resolved' } }),
      prisma.threat.count({ where: { status: 'active' } }),
      prisma.alert.count(),
      prisma.alert.count({ where: { acknowledged: false } }),
      prisma.vulnerability.count({ where: { status: 'open' } }),
      prisma.vulnerability.count({ where: { status: 'open', severity: 'critical' } }),
      prisma.vulnerability.count({ where: { status: 'resolved' } }),
      prisma.incident.count({ where: { status: { not: 'resolved' } } }),
      prisma.incident.count({ where: { status: 'resolved' } }),
      prisma.threat.count({ where: { detectedAt: { gte: weekAgo } } }),
      prisma.threat.count({ where: { detectedAt: { gte: monthAgo, lt: weekAgo } } }),
      prisma.device.count({ where: { firstSeen: { gte: weekAgo } } }),
    ]);

    const threatTrend = newThreatsLastWeek > 0
      ? Math.round(((newThreatsThisWeek - newThreatsLastWeek) / newThreatsLastWeek) * 100)
      : newThreatsThisWeek > 0 ? 100 : 0;

    const resolutionRate = totalThreats > 0 ? Math.round((resolvedThreats / totalThreats) * 100) : 0;

    // Threat by type breakdown
    const threatByType = await prisma.threat.groupBy({
      by: ['type'],
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
    });

    // Top 5 riskiest devices
    const riskyDevices = await prisma.device.findMany({
      orderBy: { riskScore: 'desc' },
      take: 5,
      select: { ip: true, hostname: true, deviceType: true, riskScore: true, status: true, _count: { select: { threats: true, vulnerabilities: true } } },
    });

    // Vulnerability severity breakdown
    const vulnBySeverity = await prisma.vulnerability.groupBy({
      by: ['severity'],
      where: { status: 'open' },
      _count: { severity: true },
    });

    // Recent critical threats (last 7 days)
    const recentCritical = await prisma.threat.findMany({
      where: { severity: 'critical', detectedAt: { gte: weekAgo } },
      orderBy: { detectedAt: 'desc' },
      take: 10,
      select: { type: true, description: true, sourceIp: true, targetIp: true, detectedAt: true, status: true },
    });

    res.json({
      generatedAt: new Date().toISOString(),
      period: 'Last 30 days',
      deviceSummary: { total: totalDevices, online: onlineDevices, rogue: rogueDevices, newThisWeek: newDevicesThisWeek },
      threatSummary: { total: totalThreats, active: activeThreats, resolved: resolvedThreats, thisWeek: newThreatsThisWeek, trend: threatTrend, resolutionRate },
      alertSummary: { total: totalAlerts, unacknowledged: unackAlerts },
      vulnerabilitySummary: { open: openVulns, critical: criticalVulns, resolved: resolvedVulns },
      incidentSummary: { open: openIncidents, resolved: resolvedIncidents },
      threatByType: threatByType.map(t => ({ type: t.type, count: t._count.type })),
      riskyDevices,
      vulnBySeverity: vulnBySeverity.map(v => ({ severity: v.severity, count: v._count.severity })),
      recentCritical,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});
