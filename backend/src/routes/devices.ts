import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { discoverNetworkDevices, getLocalIP, getGateway, macToVendor, guessDeviceType } from '../services/networkScanner';

export const devicesRouter = Router();
devicesRouter.use(authenticate);

// GET /api/devices
devicesRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, search, page = '1', limit = '50' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.deviceType = type;
    if (search) {
      where.OR = [
        { ip: { contains: search } },
        { hostname: { contains: search } },
        { mac: { contains: search } },
        { manufacturer: { contains: search } },
      ];
    }
    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        where,
        include: { openPorts: true, _count: { select: { vulnerabilities: true, alerts: true, threats: true } } },
        orderBy: { lastActive: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.device.count({ where }),
    ]);
    res.json({ devices, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// GET /api/devices/:id
devicesRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: {
        openPorts: true,
        vulnerabilities: { orderBy: { detectedAt: 'desc' }, take: 20 },
        alerts: { orderBy: { createdAt: 'desc' }, take: 10 },
        threats: { orderBy: { detectedAt: 'desc' }, take: 10 },
        metrics: { orderBy: { timestamp: 'desc' }, take: 30 },
      },
    });
    if (!device) { res.status(404).json({ error: 'Device not found' }); return; }
    res.json(device);
  } catch {
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// GET /api/devices/:id/metrics
devicesRouter.get('/:id/metrics', async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await prisma.deviceMetric.findMany({
      where: { deviceId: req.params.id },
      orderBy: { timestamp: 'desc' },
      take: 60,
    });
    res.json(metrics.reverse());
  } catch {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// PATCH /api/devices/:id/blacklist
devicesRouter.patch('/:id/blacklist', async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const device = await prisma.device.update({
      where: { id: req.params.id },
      data: { isBlacklisted: true, isWhitelisted: false, status: 'suspicious' },
    });
    if (req.user) {
      await prisma.blacklist.create({ data: { ip: device.ip, mac: device.mac || undefined, reason: reason || 'Manual block', addedBy: req.user.id } });
    }
    res.json(device);
  } catch {
    res.status(500).json({ error: 'Failed to blacklist device' });
  }
});

// PATCH /api/devices/:id/whitelist
devicesRouter.patch('/:id/whitelist', async (req: AuthRequest, res: Response) => {
  try {
    const { label } = req.body;
    const device = await prisma.device.update({
      where: { id: req.params.id },
      data: { isWhitelisted: true, isBlacklisted: false },
    });
    if (req.user) {
      await prisma.whitelist.create({ data: { ip: device.ip, mac: device.mac || undefined, label: label || device.hostname || undefined, addedBy: req.user.id } });
    }
    res.json(device);
  } catch {
    res.status(500).json({ error: 'Failed to whitelist device' });
  }
});

// GET /api/devices/scan/live — Real WiFi network scan using ARP
devicesRouter.get('/scan/live', async (req: AuthRequest, res: Response) => {
  try {
    const [scanned, localInfo, gateway] = await Promise.all([
      discoverNetworkDevices(),
      getLocalIP(),
      getGateway(),
    ]);

    // Upsert each discovered device into DB
    const results = [];
    for (const d of scanned) {
      const vendor = d.vendor || macToVendor(d.mac || '');
      const deviceType = d.ip === gateway ? 'router' : guessDeviceType(vendor, d.hostname);
      const isThisMachine = localInfo?.ip === d.ip;

      const existing = await prisma.device.findUnique({ where: { ip: d.ip } });
      if (existing) {
        // Update lastActive
        const updated = await prisma.device.update({
          where: { ip: d.ip },
          data: {
            lastActive: new Date(),
            mac: d.mac || existing.mac,
            hostname: d.hostname || existing.hostname,
            manufacturer: vendor !== 'Unknown Vendor' ? vendor : existing.manufacturer,
            status: 'online',
          },
          include: { openPorts: true, _count: { select: { vulnerabilities: true, alerts: true, threats: true } } },
        });
        results.push({ ...updated, isThisMachine });
      } else {
        // Create new device
        const created = await prisma.device.create({
          data: {
            ip: d.ip,
            mac: d.mac,
            hostname: d.hostname || `device-${d.ip.split('.').pop()}`,
            manufacturer: vendor,
            deviceType,
            os: isThisMachine ? 'macOS' : undefined,
            status: 'online',
            firstSeen: new Date(),
            lastActive: new Date(),
            riskScore: deviceType === 'unknown' ? 60 : deviceType === 'iot' ? 40 : 15,
            signalStrength: isThisMachine ? 100 : Math.floor(Math.random() * 40) + 50,
          },
          include: { openPorts: true, _count: { select: { vulnerabilities: true, alerts: true, threats: true } } },
        });
        // Create new device alert
        await prisma.alert.create({
          data: {
            deviceId: created.id,
            type: 'new_device',
            severity: deviceType === 'unknown' ? 'high' : 'low',
            message: `New device discovered on WiFi: ${d.ip} (${vendor})`,
            details: `MAC: ${d.mac || 'unknown'}, Type: ${deviceType}`,
          }
        });
        results.push({ ...created, isThisMachine });
      }
    }

    res.json({
      scanned: results.length,
      localIP: localInfo?.ip,
      gateway,
      devices: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Network scan failed' });
  }
});

// GET /api/devices/stats/summary
devicesRouter.get('/stats/summary', async (_req: AuthRequest, res: Response) => {
  try {
    const [total, online, offline, suspicious, rogue] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({ where: { status: 'online' } }),
      prisma.device.count({ where: { status: 'offline' } }),
      prisma.device.count({ where: { status: 'suspicious' } }),
      prisma.device.count({ where: { isRogue: true } }),
    ]);
    res.json({ total, online, offline, suspicious, rogue });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// PATCH /api/devices/:id — Update device details (hostname, deviceType, location, owner)
devicesRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { hostname, deviceType, location, owner } = req.body;
    const device = await prisma.device.update({
      where: { id: req.params.id },
      data: {
        hostname: hostname !== undefined ? hostname : undefined,
        deviceType: deviceType !== undefined ? deviceType : undefined,
        location: location !== undefined ? location : undefined,
        owner: owner !== undefined ? owner : undefined,
      },
      include: { openPorts: true, _count: { select: { vulnerabilities: true, alerts: true, threats: true } } },
    });
    res.json(device);
  } catch (err) {
    console.error('Failed to update device:', err);
    res.status(500).json({ error: 'Failed to update device details' });
  }
});
