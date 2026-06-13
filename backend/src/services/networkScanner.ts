import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ScannedDevice {
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
}

// MAC vendor prefix lookup (top manufacturers)
const MAC_VENDORS: Record<string, string> = {
  '00:1a:2b': 'Cisco Systems', '00:50:56': 'VMware', '00:0c:29': 'VMware',
  '34:e8:94': 'TP-Link', '8c:83:94': 'Apple Inc.', '42:5e:e5': 'Apple Inc.',
  'b8:27:eb': 'Raspberry Pi', 'dc:a6:32': 'Raspberry Pi',
  'f4:f5:d8': 'Apple Inc.', 'ac:de:48': 'Apple Inc.',
  '00:1b:63': 'Apple Inc.', '3c:22:fb': 'Apple Inc.',
  '38:f9:d3': 'Apple Inc.', 'a4:c3:f0': 'Dell Inc.',
  '00:1a:a0': 'Dell Inc.', '18:66:da': 'Dell Inc.',
  'b4:2e:99': 'HP Enterprise', '3c:d9:2b': 'HP Inc.',
  '00:25:b3': 'HP Inc.', 'b0:4e:26': 'Samsung Electronics',
  '98:01:a7': 'Samsung Electronics', '50:c7:bf': 'Hikvision',
  'cc:32:e5': 'TP-Link', '64:70:02': 'TP-Link',
  'a0:c5:89': 'Xiaomi', 'f8:a2:d6': 'Xiaomi',
  'd4:6a:91': 'Unknown Vendor', '00:11:22': 'Generic',
};

function macToVendor(mac: string): string {
  if (!mac) return 'Unknown';
  const prefix = mac.toLowerCase().substring(0, 8);
  return MAC_VENDORS[prefix] || 'Unknown Vendor';
}

// Guess device type from MAC/vendor
function guessDeviceType(vendor: string, hostname?: string): string {
  const v = vendor.toLowerCase();
  const h = (hostname || '').toLowerCase();
  if (v.includes('apple') && (h.includes('iphone') || h.includes('ipad'))) return 'phone';
  if (v.includes('apple')) return 'laptop';
  if (v.includes('samsung') || v.includes('xiaomi') || h.includes('phone') || h.includes('android')) return 'phone';
  if (v.includes('cisco') || v.includes('juniper') || v.includes('fortinet')) return 'router';
  if (v.includes('tp-link') || v.includes('asus') || v.includes('netgear') || h.includes('router') || h.includes('gateway')) return 'router';
  if (v.includes('raspberry') || v.includes('hikvision') || h.includes('cam') || h.includes('iot')) return 'iot';
  if (v.includes('vmware') || h.includes('server') || h.includes('vm')) return 'server';
  if (v.includes('dell') || v.includes('hp') || v.includes('lenovo')) return 'laptop';
  return 'unknown';
}

// Parse ARP table (macOS: arp -a)
async function scanArpTable(): Promise<ScannedDevice[]> {
  try {
    const { stdout } = await execAsync('arp -a');
    const devices: ScannedDevice[] = [];
    const lines = stdout.split('\n');

    for (const line of lines) {
      // Match: ? (192.168.0.1) at 34:e8:94:69:3c:6f on en0
      // or: hostname (ip) at mac on iface
      const match = line.match(/^(\S+)\s+\(([0-9.]+)\)\s+at\s+([0-9a-f:]+)\s+on\s+(\S+)/i);
      if (!match) continue;

      const [, rawHostname, ip, mac, iface] = match;
      // Skip broadcast/multicast
      if (mac === 'ff:ff:ff:ff:ff:ff') continue;
      if (ip.endsWith('.255') || ip.startsWith('224.') || ip.startsWith('239.')) continue;
      // Only local network interfaces (en0 = WiFi on Mac)
      if (!['en0', 'en1', 'en2', 'eth0', 'eth1'].includes(iface)) continue;

      const hostname = rawHostname === '?' ? undefined : rawHostname;
      const vendor = macToVendor(mac);

      devices.push({ ip, mac, hostname, vendor });
    }

    return devices;
  } catch {
    return [];
  }
}

// Get this machine's own IP on en0 (WiFi)
async function getLocalIP(): Promise<{ ip: string; mac: string } | null> {
  try {
    const { stdout: ip } = await execAsync("ipconfig getifaddr en0 2>/dev/null || echo ''");
    const { stdout: mac } = await execAsync("ifconfig en0 | grep ether | awk '{print $2}'");
    return { ip: ip.trim(), mac: mac.trim() };
  } catch {
    return null;
  }
}

// Get gateway IP
async function getGateway(): Promise<string | null> {
  try {
    const { stdout } = await execAsync("route get default | grep gateway | awk '{print $2}'");
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function performPingSweep(subnetPrefix: string): Promise<void> {
  try {
    // Try using fping first (extremely fast parallel ping)
    await execAsync(`fping -g ${subnetPrefix}.1 ${subnetPrefix}.254 -r 1 -t 100 -q`);
  } catch (err: any) {
    // fping returns exit code 1 if some targets are unreachable, which is normal behavior.
    // If fping isn't found (exit code 127/ENOENT), fall back to manual parallel ping.
    if (err.code === 127 || err.message?.includes('not found') || err.message?.includes('ENOENT')) {
      const ips = Array.from({ length: 254 }, (_, i) => `${subnetPrefix}.${i + 1}`);
      const concurrency = 40;
      for (let i = 0; i < ips.length; i += concurrency) {
        const batch = ips.slice(i, i + concurrency);
        await Promise.all(
          batch.map(ip =>
            execAsync(`ping -c 1 -t 1 ${ip}`)
              .then(() => {})
              .catch(() => {})
          )
        );
      }
    }
  }
}

export async function discoverNetworkDevices(): Promise<ScannedDevice[]> {
  const localInfo = await getLocalIP();
  const gateway = await getGateway();

  if (localInfo?.ip) {
    const parts = localInfo.ip.split('.');
    if (parts.length === 4) {
      const prefix = parts.slice(0, 3).join('.');
      await performPingSweep(prefix);
    }
  }

  const arpDevices = await scanArpTable();
  const results: ScannedDevice[] = [...arpDevices];

  // Add this machine if not already in list
  if (localInfo?.ip && !results.find(d => d.ip === localInfo.ip)) {
    results.push({
      ip: localInfo.ip,
      mac: localInfo.mac,
      hostname: require('os').hostname(),
      vendor: 'Apple Inc.',
    });
  }

  // Mark gateway
  if (gateway) {
    const gw = results.find(d => d.ip === gateway);
    if (!gw) {
      const arpGw = arpDevices.find(d => d.ip === gateway);
      if (!arpGw) {
        results.push({ ip: gateway, hostname: 'Gateway Router', vendor: 'Router' });
      }
    }
  }

  return results;
}

export { getLocalIP, getGateway, macToVendor, guessDeviceType };
