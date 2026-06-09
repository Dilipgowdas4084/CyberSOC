'use client';
import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

interface Stats {
  totalDevices: number; activeDevices: number; suspiciousDevices: number;
  activeThreats: number; criticalThreats: number;
  openVulnerabilities: number; criticalVulns: number;
  unackAlerts: number; openIncidents: number; securityScore: number; totalPackets: number;
}

interface TrafficData { time: string; inbound: number; outbound: number; threats: number; }
interface ThreatBreakdown { type: string; count: number; }
interface RecentAlert { id: string; type: string; severity: string; message: string; createdAt: string; device?: { ip: string; hostname: string; } }

const THREAT_COLORS: Record<string, string> = {
  port_scan: '#00d4ff', brute_force: '#ff3366', mitm: '#ff8c42',
  arp_spoof: '#ffd23f', ddos: '#bd93f9', dns_spoof: '#00ff9d', suspicious_traffic: '#6272a4',
};

const SEV_COLORS: Record<string, string> = { critical: '#ff3366', high: '#ff8c42', medium: '#ffd23f', low: '#00ff9d' };

function SecurityScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#00ff9d' : score >= 60 ? '#ffd23f' : score >= 40 ? '#ff8c42' : '#ff3366';
  const label = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : score >= 40 ? 'FAIR' : 'CRITICAL';
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto' }}>
        <svg viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="80" cy="80" r="65" fill="none" stroke="var(--bg-elevated)" strokeWidth="12" />
          <circle cx="80" cy="80" r="65" fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={`${2 * Math.PI * 65 * score / 100} ${2 * Math.PI * 65}`}
            style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 8px ${color})` }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 36, fontWeight: 900, color, textShadow: `0 0 20px ${color}` }}>{score}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 2 }}>{label}</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Overall Security Score</div>
    </div>
  );
}

export default function DashboardPage() {
  const { token, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [traffic, setTraffic] = useState<TrafficData[]>([]);
  const [threatBreakdown, setThreatBreakdown] = useState<ThreatBreakdown[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);

  const fetchData = useCallback(async () => {
    if (authLoading || !token) return;
    try {
      const [s, t, tb, ra] = await Promise.all([
        apiFetch('/api/dashboard/stats', token),
        apiFetch('/api/dashboard/traffic-trend', token),
        apiFetch('/api/dashboard/threat-breakdown', token),
        apiFetch('/api/dashboard/recent-alerts', token),
      ]);
      setStats(s); setTraffic(t); setThreatBreakdown(tb); setRecentAlerts(ra);
    } catch {}
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Socket.io for live updates
  useEffect(() => {
    const socket = io(WS_URL);
    socket.on('threat:detected', () => fetchData());
    socket.on('alert:created', (alert: RecentAlert) => {
      setRecentAlerts(prev => [alert, ...prev.slice(0, 9)]);
      setStats(prev => prev ? { ...prev, unackAlerts: prev.unackAlerts + 1 } : prev);
    });
    socket.on('device:new', () => fetchData());
    return () => { socket.disconnect(); };
  }, [fetchData]);

  const deviceData = stats ? [
    { name: 'Online', value: stats.activeDevices, color: '#00ff9d' },
    { name: 'Suspicious', value: stats.suspiciousDevices, color: '#ff8c42' },
    { name: 'Offline', value: stats.totalDevices - stats.activeDevices - stats.suspiciousDevices, color: '#4a6a8a' },
  ] : [];

  return (
    <AppLayout title="Security Operations Dashboard" subtitle="Real-time network monitoring and threat intelligence">
      {/* Metric cards */}
      <div className="metric-grid">
        <div className="metric-card cyan">
          <div className="metric-icon">💻</div>
          <div className="metric-label">Total Devices</div>
          <div className="metric-value cyan">{stats?.totalDevices ?? '—'}</div>
          <div className="metric-sub">{stats?.activeDevices} online · {stats?.suspiciousDevices} suspicious</div>
        </div>
        <div className="metric-card red">
          <div className="metric-icon">⚡</div>
          <div className="metric-label">Active Threats</div>
          <div className="metric-value red">{stats?.activeThreats ?? '—'}</div>
          <div className="metric-sub">{stats?.criticalThreats} critical severity</div>
        </div>
        <div className="metric-card orange">
          <div className="metric-icon">🛡</div>
          <div className="metric-label">Vulnerabilities</div>
          <div className="metric-value orange">{stats?.openVulnerabilities ?? '—'}</div>
          <div className="metric-sub">{stats?.criticalVulns} critical CVEs</div>
        </div>
        <div className="metric-card yellow">
          <div className="metric-icon">🔔</div>
          <div className="metric-label">Unack Alerts</div>
          <div className="metric-value yellow">{stats?.unackAlerts ?? '—'}</div>
          <div className="metric-sub">Require attention</div>
        </div>
        <div className="metric-card purple">
          <div className="metric-icon">🎯</div>
          <div className="metric-label">Open Incidents</div>
          <div className="metric-value purple">{stats?.openIncidents ?? '—'}</div>
          <div className="metric-sub">Awaiting resolution</div>
        </div>
        <div className="metric-card green">
          <div className="metric-icon">📡</div>
          <div className="metric-label">Packets Captured</div>
          <div className="metric-value green">{stats?.totalPackets ? (stats.totalPackets > 999 ? `${(stats.totalPackets/1000).toFixed(1)}K` : stats.totalPackets) : '—'}</div>
          <div className="metric-sub">Network traffic analyzed</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Traffic chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📈 Network Traffic (24h)</div>
            <div className="live-indicator"><span className="live-dot" />LIVE</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={traffic} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff9d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: '#4a6a8a', fontSize: 10 }} interval={3} />
              <YAxis tick={{ fill: '#4a6a8a', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0d1f38', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="inbound" stroke="#00d4ff" fill="url(#inGrad)" strokeWidth={2} name="Inbound (MB/s)" />
              <Area type="monotone" dataKey="outbound" stroke="#00ff9d" fill="url(#outGrad)" strokeWidth={2} name="Outbound (MB/s)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Device status + security score */}
        <div className="grid-2" style={{ gap: 0 }}>
          <div className="card" style={{ borderRadius: '12px 0 0 12px', borderRight: 'none' }}>
            <div className="card-header">
              <div className="card-title">💻 Device Status</div>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={deviceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {deviceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0d1f38', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {deviceData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600, color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ borderRadius: '0 12px 12px 0' }}>
            <SecurityScoreGauge score={stats?.securityScore ?? 0} />
          </div>
        </div>
      </div>

      {/* Threat breakdown + Live alerts */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚡ Threat Breakdown</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={threatBreakdown} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 60 }}>
              <XAxis type="number" tick={{ fill: '#4a6a8a', fontSize: 10 }} />
              <YAxis dataKey="type" type="category" tick={{ fill: '#8ba3bc', fontSize: 11 }} width={80} />
              <Tooltip contentStyle={{ background: '#0d1f38', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Count">
                {threatBreakdown.map((entry, i) => (
                  <Cell key={i} fill={THREAT_COLORS[entry.type] || '#6272a4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">🔔 Live Alert Feed</div>
            <a href="/alerts" style={{ fontSize: 12, color: 'var(--cyan)', textDecoration: 'none' }}>View All →</a>
          </div>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            {recentAlerts.length === 0 && <div className="empty-state" style={{ padding: 30 }}><div>No recent alerts</div></div>}
            {recentAlerts.map(alert => (
              <div key={alert.id} className="live-feed-item">
                <span style={{ fontSize: 18, flexShrink: 0 }}>
                  {alert.severity === 'critical' ? '🔴' : alert.severity === 'high' ? '🟠' : alert.severity === 'medium' ? '🟡' : '🟢'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                    <span className={`badge ${alert.severity}`} style={{ padding: '1px 6px', fontSize: 10 }}>{alert.severity}</span>
                    <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
                    {alert.device && <span className="mono">{alert.device.ip}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
