import { Server } from 'socket.io';
import { prisma } from '../db';

const THREAT_TYPES = ['port_scan', 'arp_spoof', 'dns_spoof', 'mitm', 'ddos', 'brute_force', 'suspicious_traffic'];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const PROTOCOLS = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS', 'SSH', 'FTP'];
const ALERT_TYPES = ['new_device', 'unauthorized_device', 'failed_login', 'traffic_anomaly', 'malware'];

const THREAT_DESCRIPTIONS: Record<string, string[]> = {
  port_scan: [
    'Systematic port scan detected from external host',
    'Rapid sequential port probing on multiple services',
    'SYN scan sweep targeting privileged ports 1-1024',
  ],
  arp_spoof: [
    'Duplicate ARP replies detected for gateway MAC',
    'ARP cache poisoning attempt targeting local subnet',
    'Gratuitous ARP broadcast with conflicting MAC mapping',
  ],
  dns_spoof: [
    'DNS response with mismatched TTL and forged records',
    'Unauthorized DNS server responding to internal queries',
    'DNS amplification attack pattern detected',
  ],
  mitm: [
    'Man-in-the-Middle attack pattern between two hosts',
    'SSL stripping attempt detected on HTTPS traffic',
    'Session hijacking via cookie theft detected',
  ],
  ddos: [
    'Volumetric DDoS flood targeting internal service',
    'HTTP flood with randomized user agents detected',
    'SYN flood exceeding 10,000 packets/second threshold',
  ],
  brute_force: [
    'SSH brute force: 500+ failed login attempts in 60s',
    'RDP credential stuffing attack in progress',
    'Web application login brute force via HTTP POST',
  ],
  suspicious_traffic: [
    'Unusual data exfiltration pattern to external IP',
    'Encrypted tunnel to known C2 server infrastructure',
    'Beaconing behavior with regular 60-second intervals',
  ],
};

function randomIp() {
  return `192.168.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 254) + 1}`;
}

function randomExternalIp() {
  return `${Math.floor(Math.random() * 200 + 20)}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function startSimulationEngine(io: Server) {
  // Generate packets every 500ms
  setInterval(async () => {
    try {
      const packet = {
        sourceIp: Math.random() > 0.3 ? randomIp() : randomExternalIp(),
        destIp: Math.random() > 0.3 ? randomIp() : randomExternalIp(),
        sourcePort: Math.floor(Math.random() * 60000) + 1024,
        destPort: pick([80, 443, 22, 3389, 53, 8080, 8443, 3306, 5432, 21]),
        protocol: pick(PROTOCOLS),
        size: Math.floor(Math.random() * 1500) + 64,
        isSuspicious: Math.random() < 0.05,
        timestamp: new Date(),
      };

      const saved = await prisma.packet.create({ data: packet });
      io.emit('packet:captured', saved);

      // Keep only last 5000 packets
      const count = await prisma.packet.count();
      if (count > 5000) {
        const oldest = await prisma.packet.findFirst({ orderBy: { timestamp: 'asc' } });
        if (oldest) await prisma.packet.delete({ where: { id: oldest.id } });
      }
    } catch { /* silent */ }
  }, 800);

  // Generate threats every 30-60 seconds
  setInterval(async () => {
    if (Math.random() < 0.4) {
      try {
        const type = pick(THREAT_TYPES);
        const severity = pick(SEVERITIES);
        const descriptions = THREAT_DESCRIPTIONS[type] || ['Security event detected'];
        const threat = await prisma.threat.create({
          data: {
            type,
            severity,
            sourceIp: randomExternalIp(),
            targetIp: randomIp(),
            description: pick(descriptions),
            status: 'active',
          }
        });
        io.emit('threat:detected', threat);

        // Create an alert too
        const alert = await prisma.alert.create({
          data: {
            type: 'traffic_anomaly',
            severity,
            message: `${type.replace('_', ' ').toUpperCase()} detected from ${threat.sourceIp}`,
            details: threat.description,
          }
        });
        io.emit('alert:created', alert);
      } catch { /* silent */ }
    }
  }, 35000);

  // Update device metrics every 5 seconds
  setInterval(async () => {
    try {
      const devices = await prisma.device.findMany({ where: { status: 'online' }, select: { id: true } });
      for (const device of devices.slice(0, 10)) { // update 10 at a time
        const metric = await prisma.deviceMetric.create({
          data: {
            deviceId: device.id,
            cpu: Math.random() * 100,
            memory: Math.random() * 100,
            networkIn: Math.random() * 1000,
            networkOut: Math.random() * 500,
            packetCount: Math.floor(Math.random() * 1000),
            activeConnections: Math.floor(Math.random() * 50),
          }
        });
        io.emit('metrics:update', { deviceId: device.id, metric });
      }
    } catch { /* silent */ }
  }, 5000);

  // Simulate occasional new device discovery
  setInterval(async () => {
    if (Math.random() < 0.1) {
      try {
        const ip = randomIp();
        const existing = await prisma.device.findUnique({ where: { ip } });
        if (!existing) {
          const device = await prisma.device.create({
            data: {
              ip,
              mac: `${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}`,
              hostname: `device-${Math.floor(Math.random() * 9999)}`,
              deviceType: pick(['laptop', 'phone', 'iot', 'server']),
              status: 'online',
              riskScore: Math.floor(Math.random() * 60),
              firstSeen: new Date(),
              lastActive: new Date(),
            }
          });
          const alert = await prisma.alert.create({
            data: {
              deviceId: device.id,
              type: 'new_device',
              severity: 'low',
              message: `New device discovered: ${ip}`,
            }
          });
          io.emit('device:new', device);
          io.emit('alert:created', alert);
        }
      } catch { /* silent */ }
    }
  }, 120000);
}

function randomHex() {
  return Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
}
