'use client';
import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

interface Threat {
  id: string; type: string; severity: string; sourceIp?: string; targetIp?: string;
  description: string; detectedAt: string; status: string; mitre?: string;
}

interface Stats { total: number; critical: number; high: number; medium: number; low: number; active: number; byType: { type: string; _count: { type: number } }[] }

const THREAT_TYPE_LABELS: Record<string, string> = {
  port_scan: 'Port Scan', arp_spoof: 'ARP Spoof', dns_spoof: 'DNS Spoof',
  mitm: 'MITM Attack', ddos: 'DDoS', brute_force: 'Brute Force',
  suspicious_traffic: 'Suspicious Traffic', rogue_device: 'Rogue Device',
};

const SEV_EMOJI: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
const TYPE_COLORS: Record<string, string> = {
  port_scan: '#00d4ff', brute_force: '#ff3366', mitm: '#ff8c42',
  arp_spoof: '#ffd23f', ddos: '#bd93f9', dns_spoof: '#00ff9d', suspicious_traffic: '#6272a4',
};

export default function ThreatsPage() {
  const { token, loading: authLoading } = useAuth();
  const [threats, setThreats] = useState<Threat[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    if (authLoading || !token) return;
    const params = new URLSearchParams({ limit: '100' });
    if (severityFilter) params.set('severity', severityFilter);
    if (statusFilter) params.set('status', statusFilter);
    const [d, s] = await Promise.all([
      apiFetch(`/api/threats?${params}`, token).catch(() => ({ threats: [], total: 0 })),
      apiFetch('/api/threats/stats', token).catch(() => null),
    ]);
    setThreats(d.threats); setTotal(d.total); setStats(s);
  }, [token, severityFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const socket = io(WS_URL);
    socket.on('threat:detected', (t: Threat) => {
      setThreats(prev => [t, ...prev.slice(0, 99)]);
      setTotal(prev => prev + 1);
    });
    return () => { socket.disconnect(); };
  }, []);

  async function updateStatus(id: string, status: string) {
    if (!token) return;
    await apiFetch(`/api/threats/${id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) });
    fetchData();
  }

  const chartData = stats?.byType.map(b => ({ name: THREAT_TYPE_LABELS[b.type] || b.type, count: b._count.type })) || [];

  return (
    <AppLayout title="Threat Intelligence" subtitle="Real-time security threat detection and monitoring">
      {/* Stats row */}
      <div className="metric-grid" style={{ marginBottom: 20 }}>
        <div className="metric-card red"><div className="metric-label">Total Threats</div><div className="metric-value red">{stats?.total ?? 0}</div></div>
        <div className="metric-card red"><div className="metric-label">Critical</div><div className="metric-value red" style={{ fontSize: 28 }}>{stats?.critical ?? 0}</div></div>
        <div className="metric-card orange"><div className="metric-label">High</div><div className="metric-value orange" style={{ fontSize: 28 }}>{stats?.high ?? 0}</div></div>
        <div className="metric-card yellow"><div className="metric-label">Medium</div><div className="metric-value yellow" style={{ fontSize: 28 }}>{stats?.medium ?? 0}</div></div>
        <div className="metric-card green"><div className="metric-label">Low</div><div className="metric-value green" style={{ fontSize: 28 }}>{stats?.low ?? 0}</div></div>
        <div className="metric-card cyan"><div className="metric-label">Active Now</div><div className="metric-value cyan" style={{ fontSize: 28 }}>{stats?.active ?? 0}</div></div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚡ Threats by Type</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#4a6a8a', fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: '#4a6a8a', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0d1f38', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Threats">
                {chartData.map((entry, i) => <Cell key={i} fill={TYPE_COLORS[stats?.byType[i]?.type || ''] || '#6272a4'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">🎯 MITRE ATT&CK Reference</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { technique: 'T1046', name: 'Network Service Discovery', tactic: 'Discovery' },
              { technique: 'T1110', name: 'Brute Force', tactic: 'Credential Access' },
              { technique: 'T1557', name: 'Adversary-in-the-Middle', tactic: 'Collection' },
              { technique: 'T1499', name: 'Endpoint Denial of Service', tactic: 'Impact' },
              { technique: 'T1041', name: 'Exfiltration Over C2 Channel', tactic: 'Exfiltration' },
            ].map(m => (
              <div key={m.technique} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="mono" style={{ color: 'var(--cyan)', fontSize: 11, minWidth: 50 }}>{m.technique}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)' }}>{m.name}</span>
                <span style={{ fontSize: 10, background: 'var(--purple-dim)', color: 'var(--purple)', padding: '2px 6px', borderRadius: 4 }}>{m.tactic}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Threats table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="live-indicator"><span className="live-dot" />LIVE FEED</div>
          <select className="select" style={{ maxWidth: 140 }} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="select" style={{ maxWidth: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{total} total</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Type</th>
                <th>Source IP</th>
                <th>Target IP</th>
                <th>Description</th>
                <th>MITRE</th>
                <th>Detected</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {threats.map(threat => (
                <tr key={threat.id}>
                  <td>
                    <span className={`badge ${threat.severity}`}>{SEV_EMOJI[threat.severity]} {threat.severity}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: TYPE_COLORS[threat.type] || 'var(--text-secondary)' }}>
                      {THREAT_TYPE_LABELS[threat.type] || threat.type}
                    </span>
                  </td>
                  <td><span className="mono" style={{ color: 'var(--cyan)', fontSize: 12 }}>{threat.sourceIp || '—'}</span></td>
                  <td><span className="mono" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{threat.targetIp || '—'}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{threat.description}</td>
                  <td>{threat.mitre ? <span className="mono" style={{ fontSize: 11, color: 'var(--purple)' }}>{threat.mitre}</span> : '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(threat.detectedAt).toLocaleString()}</td>
                  <td>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: threat.status === 'active' ? 'var(--red-dim)' : threat.status === 'investigating' ? 'var(--orange-dim)' : 'var(--green-dim)', color: threat.status === 'active' ? 'var(--red)' : threat.status === 'investigating' ? 'var(--orange)' : 'var(--green)' }}>
                      {threat.status}
                    </span>
                  </td>
                  <td>
                    {threat.status === 'active' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(threat.id, 'investigating')}>Investigate</button>
                    )}
                    {threat.status === 'investigating' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(threat.id, 'resolved')}>Resolve</button>
                    )}
                  </td>
                </tr>
              ))}
              {threats.length === 0 && (
                <tr><td colSpan={9}><div className="empty-state"><div className="empty-icon">✅</div><div className="empty-title">No threats detected</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
