import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEVICES = [
  { ip: '192.168.1.1', mac: '00:1A:2B:3C:4D:5E', hostname: 'gateway-router', manufacturer: 'Cisco Systems', deviceType: 'router', os: 'IOS 15.7', status: 'online', riskScore: 15, signalStrength: 100 },
  { ip: '192.168.1.2', mac: '00:1A:2B:3C:4D:5F', hostname: 'core-switch-01', manufacturer: 'Cisco Systems', deviceType: 'switch', os: 'IOS-XE 16.9', status: 'online', riskScore: 10, signalStrength: 100 },
  { ip: '192.168.1.10', mac: 'A4:C3:F0:85:AC:23', hostname: 'web-server-01', manufacturer: 'Dell Inc.', deviceType: 'server', os: 'Ubuntu 22.04 LTS', status: 'online', riskScore: 45, signalStrength: 100 },
  { ip: '192.168.1.11', mac: 'B8:27:EB:12:34:56', hostname: 'db-server-prod', manufacturer: 'HP Enterprise', deviceType: 'server', os: 'RHEL 8.6', status: 'online', riskScore: 60, signalStrength: 100 },
  { ip: '192.168.1.12', mac: 'C4:34:6B:AC:55:1D', hostname: 'mail-server', manufacturer: 'Dell Inc.', deviceType: 'server', os: 'Debian 11', status: 'online', riskScore: 35, signalStrength: 100 },
  { ip: '192.168.1.20', mac: '3C:22:FB:4A:11:CC', hostname: 'analyst-ws-01', manufacturer: 'Apple Inc.', deviceType: 'laptop', os: 'macOS Ventura 13.5', status: 'online', riskScore: 20, signalStrength: 85 },
  { ip: '192.168.1.21', mac: '8C:85:90:1B:4D:E3', hostname: 'analyst-ws-02', manufacturer: 'Dell Inc.', deviceType: 'laptop', os: 'Windows 11 Pro', status: 'online', riskScore: 25, signalStrength: 78 },
  { ip: '192.168.1.22', mac: 'AC:DE:48:77:3B:CC', hostname: 'admin-laptop', manufacturer: 'Lenovo', deviceType: 'laptop', os: 'Windows 11 Pro', status: 'online', riskScore: 15, signalStrength: 92 },
  { ip: '192.168.1.30', mac: 'F4:F5:D8:23:BC:01', hostname: 'iphone-dilip', manufacturer: 'Apple Inc.', deviceType: 'phone', os: 'iOS 17.2', status: 'online', riskScore: 10, signalStrength: 72 },
  { ip: '192.168.1.31', mac: '98:01:A7:BC:22:DE', hostname: 'galaxy-s24-john', manufacturer: 'Samsung Electronics', deviceType: 'phone', os: 'Android 14', status: 'online', riskScore: 12, signalStrength: 68 },
  { ip: '192.168.1.40', mac: '50:C7:BF:AA:11:22', hostname: 'security-cam-01', manufacturer: 'Hikvision', deviceType: 'iot', os: 'Embedded Linux', status: 'online', riskScore: 75, signalStrength: 60 },
  { ip: '192.168.1.41', mac: '50:C7:BF:AA:33:44', hostname: 'security-cam-02', manufacturer: 'Hikvision', deviceType: 'iot', os: 'Embedded Linux', status: 'online', riskScore: 75, signalStrength: 55 },
  { ip: '192.168.1.42', mac: 'B0:4E:26:CD:11:AA', hostname: 'smart-thermostat', manufacturer: 'Nest Labs', deviceType: 'iot', os: 'Nest OS 5.6', status: 'online', riskScore: 30, signalStrength: 80 },
  { ip: '192.168.1.43', mac: 'CC:32:E5:01:22:BB', hostname: 'smart-printer', manufacturer: 'HP Inc.', deviceType: 'iot', os: 'HP FutureSmart 5', status: 'online', riskScore: 50, signalStrength: 75 },
  { ip: '192.168.1.50', mac: 'D4:6A:91:CC:DE:01', hostname: 'unknown-device-x1', manufacturer: 'Unknown', deviceType: 'unknown', os: 'Unknown', status: 'suspicious', riskScore: 90, signalStrength: 45, isRogue: true },
  { ip: '192.168.1.51', mac: '00:0C:29:FF:AA:BB', hostname: 'rogue-ap-01', manufacturer: 'TP-Link', deviceType: 'access_point', os: 'OpenWRT', status: 'suspicious', riskScore: 95, signalStrength: 70, isRogue: true },
  { ip: '192.168.2.10', mac: '10:BF:48:91:22:11', hostname: 'dev-server-01', manufacturer: 'HP Enterprise', deviceType: 'server', os: 'Ubuntu 20.04 LTS', status: 'online', riskScore: 40, signalStrength: 100 },
  { ip: '192.168.2.11', mac: '20:CF:30:AC:11:BC', hostname: 'staging-web', manufacturer: 'Dell Inc.', deviceType: 'server', os: 'CentOS 7', status: 'online', riskScore: 55, signalStrength: 100 },
  { ip: '192.168.2.20', mac: 'AC:BC:32:77:AA:01', hostname: 'backup-server', manufacturer: 'Synology', deviceType: 'server', os: 'DSM 7.2', status: 'offline', riskScore: 20, signalStrength: 0 },
  { ip: '192.168.2.30', mac: 'E4:5F:01:BC:12:AC', hostname: 'vpn-gateway', manufacturer: 'Fortinet', deviceType: 'server', os: 'FortiOS 7.4', status: 'online', riskScore: 25, signalStrength: 100 },
  { ip: '192.168.3.10', mac: '00:50:56:C0:00:08', hostname: 'vmware-host-01', manufacturer: 'VMware Inc.', deviceType: 'server', os: 'ESXi 8.0', status: 'online', riskScore: 35, signalStrength: 100 },
  { ip: '192.168.3.11', mac: 'B4:2E:99:DA:11:22', hostname: 'kubernetes-node-01', manufacturer: 'HP Enterprise', deviceType: 'server', os: 'Ubuntu 22.04 LTS', status: 'online', riskScore: 30, signalStrength: 100 },
  { ip: '192.168.1.100', mac: '7C:67:A2:01:BC:11', hostname: 'reception-pc', manufacturer: 'Lenovo', deviceType: 'laptop', os: 'Windows 10', status: 'online', riskScore: 35, signalStrength: 88 },
  { ip: '192.168.1.101', mac: '88:36:6C:BC:22:01', hostname: 'hr-laptop-01', manufacturer: 'HP Inc.', deviceType: 'laptop', os: 'Windows 11', status: 'online', riskScore: 28, signalStrength: 77 },
  { ip: '192.168.1.102', mac: '34:02:86:BC:01:23', hostname: 'cto-macbook', manufacturer: 'Apple Inc.', deviceType: 'laptop', os: 'macOS Sonoma 14.2', status: 'online', riskScore: 18, signalStrength: 95 },
];

const THREATS_DATA = [
  { type: 'port_scan', severity: 'high', sourceIp: '185.220.101.47', targetIp: '192.168.1.10', description: 'Systematic SYN scan across all ports from TOR exit node. 65,535 ports probed in under 60 seconds.', status: 'active', mitre: 'T1046' },
  { type: 'brute_force', severity: 'critical', sourceIp: '203.0.113.42', targetIp: '192.168.1.10', description: 'SSH brute force attack: 2,847 failed login attempts from botnet IP over 30 minutes.', status: 'active', mitre: 'T1110' },
  { type: 'mitm', severity: 'critical', sourceIp: '192.168.1.50', targetIp: '192.168.1.1', description: 'ARP poisoning detected from rogue device. Traffic between gateway and all hosts being intercepted.', status: 'investigating', mitre: 'T1557' },
  { type: 'arp_spoof', severity: 'high', sourceIp: '192.168.1.50', targetIp: '192.168.1.255', description: 'Gratuitous ARP flood with spoofed gateway MAC address. Network-wide ARP cache poisoning in progress.', status: 'active', mitre: 'T1557.002' },
  { type: 'suspicious_traffic', severity: 'high', sourceIp: '192.168.1.11', targetIp: '45.33.32.156', description: 'Large data exfiltration detected: 4.7GB transferred to known data broker IP over encrypted channel.', status: 'investigating', mitre: 'T1041' },
  { type: 'ddos', severity: 'medium', sourceIp: '198.51.100.0', targetIp: '192.168.1.10', description: 'Low-rate HTTP flood targeting web server. 12,000 requests/minute from distributed botnet.', status: 'active', mitre: 'T1499' },
  { type: 'dns_spoof', severity: 'medium', sourceIp: '192.168.1.51', targetIp: '192.168.1.0', description: 'Rogue DNS server responding to internal queries with forged A records for authentication services.', status: 'active', mitre: 'T1557.003' },
  { type: 'brute_force', severity: 'high', sourceIp: '77.88.55.66', targetIp: '192.168.2.30', description: 'VPN gateway targeted: 450 credential stuffing attempts using leaked password database.', status: 'resolved', mitre: 'T1110.004' },
  { type: 'port_scan', severity: 'low', sourceIp: '192.168.1.31', targetIp: '192.168.1.0', description: 'Internal host performing network reconnaissance. Scanning subnet for open services.', status: 'resolved', mitre: 'T1046' },
  { type: 'suspicious_traffic', severity: 'medium', sourceIp: '192.168.1.40', targetIp: '185.199.108.153', description: 'IoT camera establishing persistent connection to external C2 server. Beaconing every 60 seconds.', status: 'active', mitre: 'T1071' },
];

const VULNERABILITIES_DATA = [
  { cve: 'CVE-2024-21762', title: 'FortiOS SSL-VPN Remote Code Execution', severity: 'critical', description: 'An out-of-bounds write vulnerability in FortiOS SSL-VPN that allows unauthenticated remote attackers to execute arbitrary code or commands.', cvssScore: 9.6, solution: 'Upgrade to FortiOS 7.4.3 or later immediately.' },
  { cve: 'CVE-2024-3400', title: 'PAN-OS Command Injection via GlobalProtect', severity: 'critical', description: 'Command injection vulnerability in Palo Alto Networks PAN-OS software GlobalProtect feature allows unauthenticated attackers to execute arbitrary code.', cvssScore: 10.0, solution: 'Apply hotfix patches provided by Palo Alto Networks.' },
  { cve: 'CVE-2024-23897', title: 'Jenkins Arbitrary File Read via CLI', severity: 'high', description: 'Jenkins CLI feature allows attackers to read arbitrary files on the Jenkins controller file system.', cvssScore: 7.5, solution: 'Upgrade Jenkins to version 2.442 or later.' },
  { cve: 'CVE-2023-44487', title: 'HTTP/2 Rapid Reset Attack (DoS)', severity: 'high', description: 'The HTTP/2 protocol allows a denial of service attack (server resource consumption) because request cancellation can reset many streams quickly.', cvssScore: 7.5, solution: 'Update web server and apply vendor patches for HTTP/2 handling.' },
  { cve: 'CVE-2024-1086', title: 'Linux Kernel Use-After-Free in netfilter', severity: 'high', description: 'Use-after-free vulnerability in the Linux kernel netfilter subsystem allowing local privilege escalation to root.', cvssScore: 7.8, solution: 'Update Linux kernel to 6.7.3 or later.' },
  { cve: 'CVE-2023-4911', title: 'Looney Tunables - glibc Buffer Overflow', severity: 'high', description: 'Buffer overflow in the GNU C Library dynamic loader when processing the GLIBC_TUNABLES environment variable.', cvssScore: 7.8, solution: 'Update glibc to version 2.38-r7 or later.' },
  { cve: 'CVE-2024-0204', title: 'GoAnywhere Authentication Bypass', severity: 'critical', description: 'Authentication bypass vulnerability in Fortra GoAnywhere MFT that allows unauthorized users to create an administrator account.', cvssScore: 9.8, solution: 'Upgrade to GoAnywhere MFT version 7.4.1 or later.' },
  { cve: 'CVE-2023-46604', title: 'Apache ActiveMQ Remote Code Execution', severity: 'critical', description: 'Remote code execution vulnerability in Apache ActiveMQ that allows remote attackers to execute arbitrary shell commands.', cvssScore: 10.0, solution: 'Upgrade Apache ActiveMQ to version 5.15.16 or later.' },
  { cve: 'CVE-2024-21413', title: 'Microsoft Outlook NTLM Hash Disclosure', severity: 'high', description: 'Improper input validation in Microsoft Outlook allows attackers to leak NTLM hashes via malicious email links.', cvssScore: 9.8, solution: 'Apply Microsoft security update KB5002520.' },
  { cve: 'CVE-2023-42793', title: 'JetBrains TeamCity Authentication Bypass', severity: 'critical', description: 'Authentication bypass allowing unauthenticated attackers to create admin accounts on JetBrains TeamCity CI/CD servers.', cvssScore: 9.8, solution: 'Upgrade to TeamCity 2023.05.4 or apply security patch.' },
  { cve: null, title: 'Weak SSH Password Policy', severity: 'medium', description: 'SSH server accepts password authentication with no complexity requirements. Multiple accounts have passwords shorter than 8 characters.', cvssScore: 5.5, solution: 'Enforce SSH key-based authentication only. Disable password auth in sshd_config.' },
  { cve: null, title: 'Unencrypted HTTP Traffic', severity: 'medium', description: 'Web application serving sensitive content over HTTP without TLS/SSL encryption.', cvssScore: 5.3, solution: 'Configure HTTPS with valid TLS certificate. Redirect all HTTP to HTTPS.' },
  { cve: null, title: 'Open Telnet Port 23', severity: 'high', description: 'Telnet service running on IoT device transmitting credentials in plaintext. Service accessible from any network host.', cvssScore: 7.2, solution: 'Disable Telnet service. Use SSH for remote administration.' },
  { cve: 'CVE-2023-35078', title: 'Ivanti EPMM Authentication Bypass', severity: 'critical', description: 'Remote unauthenticated API access vulnerability in Ivanti Endpoint Manager Mobile allowing access to PII and backend changes.', cvssScore: 10.0, solution: 'Apply Ivanti security patch immediately.' },
  { cve: null, title: 'Default Credentials on IoT Device', severity: 'high', description: 'Security camera accessible using manufacturer default credentials (admin/admin). Device exposed to network without authentication hardening.', cvssScore: 8.1, solution: 'Change default credentials immediately. Enable account lockout policy.' },
];

const INCIDENTS_DATA = [
  { incidentId: 'INC-2024-0001', title: 'Ransomware Attempt on DB Server', severity: 'critical', status: 'investigating', description: 'Possible ransomware deployment attempt detected on production database server. Suspicious file encryption activity observed in /var/lib/postgresql.', resolution: null },
  { incidentId: 'INC-2024-0002', title: 'Rogue Access Point Detected', severity: 'high', status: 'in_progress', description: 'Unauthorized wireless access point detected on floor 2 of the main office. Device is broadcasting SSID matching corporate network name.', resolution: null },
  { incidentId: 'INC-2024-0003', title: 'Data Exfiltration from DB Server', severity: 'high', status: 'investigating', description: '4.7GB of data transferred to external IP 45.33.32.156 between 02:00-04:00 AM. Source identified as compromised service account.', resolution: null },
  { incidentId: 'INC-2024-0004', title: 'SSH Brute Force - Web Server', severity: 'high', status: 'open', description: 'Ongoing SSH brute force attack from TOR exit nodes targeting web-server-01. Current rate: 3000 attempts/minute.', resolution: null },
  { incidentId: 'INC-2024-0005', title: 'Phishing Campaign Targeting Staff', severity: 'medium', status: 'resolved', description: 'Coordinated phishing campaign detected targeting 12 staff members. 2 users clicked malicious links. No credential compromise confirmed.', resolution: 'Email gateway rules updated. Affected users passwords reset. Security awareness training scheduled.' },
  { incidentId: 'INC-2024-0006', title: 'Unauthorized Admin Account Created', severity: 'critical', status: 'open', description: 'Unauthorized administrator account "svc_backup_2024" created on Active Directory at 03:47 AM. Source IP traced to compromised workstation.', resolution: null },
  { incidentId: 'INC-2024-0007', title: 'DDoS Attack on Web Services', severity: 'high', status: 'in_progress', description: 'Layer 7 HTTP flood targeting public web services. Peak traffic: 85,000 requests/second. CDN rate limiting partially effective.', resolution: null },
  { incidentId: 'INC-2024-0008', title: 'IoT Camera Compromise Suspected', severity: 'medium', status: 'open', description: 'Two security cameras showing signs of compromise. Unusual outbound traffic to IP in Russia. Possible botnet recruitment.', resolution: null },
  { incidentId: 'INC-2024-0009', title: 'VPN Credential Stuffing Attack', severity: 'medium', status: 'resolved', description: '450 VPN login attempts using credentials from leaked database. 3 successful authentications detected and terminated.', resolution: 'Affected accounts locked. MFA enforced on all VPN accounts. IP blocklist updated with 847 attacker IPs.' },
  { incidentId: 'INC-2024-0010', title: 'Malware Detected on HR Laptop', severity: 'high', status: 'in_progress', description: 'Trojan.GenericKD malware detected on hr-laptop-01. Process: svchost32.exe making external connections to command and control server.', resolution: null },
];

async function main() {
  console.log('🌱 Seeding CyberSOC database...');

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.log.deleteMany();
  await prisma.whitelist.deleteMany();
  await prisma.blacklist.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.packet.deleteMany();
  await prisma.vulnerability.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.threat.deleteMany();
  await prisma.openPort.deleteMany();
  await prisma.deviceMetric.deleteMany();
  await prisma.device.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const adminHash = await bcrypt.hash('Admin@2024!', 12);
  const analystHash = await bcrypt.hash('Analyst@2024!', 12);
  const viewerHash = await bcrypt.hash('Viewer@2024!', 12);

  const admin = await prisma.user.create({
    data: { name: 'Dilip Gowda', email: 'admin@cybersoc.io', passwordHash: adminHash, role: 'super_admin', lastLogin: new Date() }
  });
  const analyst = await prisma.user.create({
    data: { name: 'Sarah Chen', email: 'analyst@cybersoc.io', passwordHash: analystHash, role: 'analyst' }
  });
  const viewer = await prisma.user.create({
    data: { name: 'Mike Johnson', email: 'viewer@cybersoc.io', passwordHash: viewerHash, role: 'viewer' }
  });

  console.log('✅ Users created');

  // Create devices
  const devices = [];
  for (const d of DEVICES) {
    const device = await prisma.device.create({
      data: {
        ...d,
        isRogue: (d as any).isRogue || false,
        firstSeen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        lastActive: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
        reputationScore: 100 - ((d as any).riskScore || 0),
        location: ['United States', 'India', 'United Kingdom', 'Germany', 'Singapore'][Math.floor(Math.random() * 5)],
        latitude: (Math.random() * 140) - 70,
        longitude: (Math.random() * 360) - 180,
      }
    });
    devices.push(device);

    // Add open ports for servers
    if (d.deviceType === 'server' || d.deviceType === 'router') {
      const ports = d.deviceType === 'server'
        ? [{ port: 22, service: 'SSH', protocol: 'TCP' }, { port: 80, service: 'HTTP', protocol: 'TCP' }, { port: 443, service: 'HTTPS', protocol: 'TCP' }, { port: 8080, service: 'HTTP-Alt', protocol: 'TCP' }]
        : [{ port: 80, service: 'HTTP', protocol: 'TCP' }, { port: 443, service: 'HTTPS', protocol: 'TCP' }, { port: 23, service: 'Telnet', protocol: 'TCP' }];
      for (const p of ports) {
        await prisma.openPort.create({ data: { deviceId: device.id, ...p } });
      }
    }

    // Add metrics for online devices
    if (d.status === 'online') {
      for (let i = 0; i < 20; i++) {
        await prisma.deviceMetric.create({
          data: {
            deviceId: device.id,
            cpu: Math.random() * 100,
            memory: Math.random() * 100,
            networkIn: Math.random() * 1000,
            networkOut: Math.random() * 500,
            packetCount: Math.floor(Math.random() * 1000),
            activeConnections: Math.floor(Math.random() * 50),
            timestamp: new Date(Date.now() - i * 5 * 60 * 1000),
          }
        });
      }
    }
  }
  console.log('✅ Devices created');

  // Create threats
  for (const t of THREATS_DATA) {
    await prisma.threat.create({ data: { ...t, detectedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) } });
  }
  console.log('✅ Threats created');

  // Create vulnerabilities (assign to servers/iot)
  const targetDevices = devices.filter(d => ['server', 'iot', 'router'].includes(d.deviceType));
  for (let i = 0; i < VULNERABILITIES_DATA.length; i++) {
    const v = VULNERABILITIES_DATA[i];
    const device = targetDevices[i % targetDevices.length];
    await prisma.vulnerability.create({
      data: {
        ...v,
        deviceId: device.id,
        status: Math.random() < 0.2 ? 'resolved' : 'open',
        detectedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      }
    });
  }
  console.log('✅ Vulnerabilities created');

  // Create alerts
  const alertMessages = [
    { type: 'new_device', severity: 'low', message: 'New device connected to network: 192.168.1.50' },
    { type: 'unauthorized_device', severity: 'high', message: 'Unauthorized device detected: Rogue AP broadcasting on floor 2' },
    { type: 'failed_login', severity: 'medium', message: 'Multiple failed SSH login attempts on web-server-01' },
    { type: 'traffic_anomaly', severity: 'high', message: 'Abnormal data transfer: 4.7GB uploaded to external IP' },
    { type: 'malware', severity: 'critical', message: 'Malware signature detected: Trojan.GenericKD on hr-laptop-01' },
    { type: 'traffic_anomaly', severity: 'medium', message: 'IoT device making unexpected outbound connections' },
    { type: 'failed_login', severity: 'low', message: 'Failed RDP authentication attempt on admin-laptop' },
    { type: 'new_device', severity: 'low', message: 'New device discovered: Galaxy S24 connecting to corporate WiFi' },
    { type: 'unauthorized_device', severity: 'critical', message: 'Rogue device actively performing ARP spoofing' },
    { type: 'traffic_anomaly', severity: 'high', message: 'DDoS pattern detected: 85,000 requests/second on web services' },
  ];

  for (const a of alertMessages) {
    await prisma.alert.create({
      data: {
        ...a,
        acknowledged: Math.random() < 0.4,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      }
    });
  }
  console.log('✅ Alerts created');

  // Create incidents
  for (const inc of INCIDENTS_DATA) {
    await prisma.incident.create({
      data: {
        ...inc,
        assignedTo: Math.random() < 0.7 ? analyst.id : undefined,
        createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        resolvedAt: inc.status === 'resolved' ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000) : null,
      }
    });
  }
  console.log('✅ Incidents created');

  // Create packets (500 realistic packets)
  const protocols = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS', 'SSH'];
  const commonPorts = [80, 443, 22, 53, 3389, 8080, 3306, 5432, 21, 25];
  for (let i = 0; i < 500; i++) {
    const srcDevice = devices[Math.floor(Math.random() * devices.length)];
    const dstDevice = devices[Math.floor(Math.random() * devices.length)];
    await prisma.packet.create({
      data: {
        sourceIp: Math.random() < 0.7 ? srcDevice.ip : `${Math.floor(Math.random() * 200 + 20)}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`,
        destIp: dstDevice.ip,
        sourcePort: Math.floor(Math.random() * 60000) + 1024,
        destPort: commonPorts[Math.floor(Math.random() * commonPorts.length)],
        protocol: protocols[Math.floor(Math.random() * protocols.length)],
        size: Math.floor(Math.random() * 1500) + 64,
        isSuspicious: Math.random() < 0.08,
        timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
      }
    });
  }
  console.log('✅ Packets created');

  // Create logs
  const logEntries = [
    { action: 'LOGIN', resource: 'auth', level: 'info', details: 'admin@cybersoc.io logged in successfully' },
    { action: 'THREAT_DETECTED', resource: 'threats', level: 'warn', details: 'Port scan detected from 185.220.101.47' },
    { action: 'DEVICE_BLACKLISTED', resource: 'devices', level: 'warn', details: 'Device 192.168.1.50 blacklisted: rogue device' },
    { action: 'VULNERABILITY_SCAN', resource: 'vulnerabilities', level: 'info', details: 'Vulnerability scan completed: 15 findings' },
    { action: 'INCIDENT_CREATED', resource: 'incidents', level: 'info', details: 'Incident INC-2024-0001 created: Ransomware Attempt' },
    { action: 'ALERT_ACKNOWLEDGED', resource: 'alerts', level: 'info', details: 'Alert acknowledged by analyst@cybersoc.io' },
    { action: 'LOGIN_FAILED', resource: 'auth', level: 'warn', details: 'Failed login attempt for unknown@example.com' },
    { action: 'CONFIG_CHANGED', resource: 'settings', level: 'warn', details: 'Firewall rules updated by admin@cybersoc.io' },
    { action: 'DEVICE_DISCOVERED', resource: 'devices', level: 'info', details: 'New device discovered: 192.168.1.50 (Unknown)' },
    { action: 'REPORT_GENERATED', resource: 'reports', level: 'info', details: 'Weekly security report generated' },
  ];

  for (const log of logEntries) {
    await prisma.log.create({
      data: { ...log, userId: admin.id, ip: '192.168.1.20', timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) }
    });
  }
  console.log('✅ Logs created');

  // Whitelist some devices
  await prisma.whitelist.create({ data: { ip: '192.168.1.1', mac: '00:1A:2B:3C:4D:5E', label: 'Main Gateway Router', addedBy: admin.id } });
  await prisma.whitelist.create({ data: { ip: '192.168.1.2', mac: '00:1A:2B:3C:4D:5F', label: 'Core Network Switch', addedBy: admin.id } });

  // Blacklist rogue devices
  await prisma.blacklist.create({ data: { ip: '192.168.1.50', mac: 'D4:6A:91:CC:DE:01', reason: 'Rogue device performing ARP spoofing', addedBy: admin.id } });
  await prisma.blacklist.create({ data: { ip: '192.168.1.51', mac: '00:0C:29:FF:AA:BB', reason: 'Unauthorized rogue access point', addedBy: admin.id } });

  console.log('\n🎉 Seed complete!\n');
  console.log('📋 Login credentials:');
  console.log('   Super Admin:  admin@cybersoc.io    / Admin@2024!');
  console.log('   Analyst:      analyst@cybersoc.io  / Analyst@2024!');
  console.log('   Viewer:       viewer@cybersoc.io   / Viewer@2024!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
