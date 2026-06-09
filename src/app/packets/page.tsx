'use client';
import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

interface Packet {
  id: string; sourceIp: string; destIp: string; sourcePort?: number; destPort?: number;
  protocol: string; size: number; flags?: string; isSuspicious: boolean; timestamp: string;
}

const PROTOCOL_COLORS: Record<string, string> = {
  TCP: '#00d4ff', UDP: '#00ff9d', ICMP: '#ffd23f', HTTP: '#ff8c42', HTTPS: '#bd93f9',
  DNS: '#6272a4', SSH: '#ff3366', FTP: '#ff8c42',
};

export default function PacketsPage() {
  const { token, loading: authLoading } = useAuth();
  const [packets, setPackets] = useState<Packet[]>([]);
  const [protocolFilter, setProtocolFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState<{ total: number; suspicious: number; byProtocol: { protocol: string; _count: { protocol: number } }[] } | null>(null);

  const fetchPackets = useCallback(async () => {
    if (authLoading || !token) return;
    const params = new URLSearchParams({ limit: '200' });
    if (protocolFilter) params.set('protocol', protocolFilter);
    if (sourceFilter) params.set('sourceIp', sourceFilter);
    if (suspiciousOnly) params.set('suspicious', 'true');
    const [pd, sd] = await Promise.all([
      apiFetch(`/api/packets?${params}`, token).catch(() => ({ packets: [] })),
      apiFetch('/api/packets/stats', token).catch(() => null),
    ]);
    setPackets(pd.packets.reverse()); setStats(sd);
  }, [token, protocolFilter, sourceFilter, suspiciousOnly]);

  useEffect(() => { fetchPackets(); }, [fetchPackets]);

  useEffect(() => {
    const socket = io(WS_URL);
    socket.on('packet:captured', (packet: Packet) => {
      if (paused) return;
      if (protocolFilter && packet.protocol !== protocolFilter) return;
      if (suspiciousOnly && !packet.isSuspicious) return;
      setPackets(prev => {
        const next = [packet, ...prev];
        return next.slice(0, 500);
      });
    });
    return () => { socket.disconnect(); };
  }, [paused, protocolFilter, suspiciousOnly]);

  const filteredPackets = packets.filter(p => {
    if (sourceFilter && !p.sourceIp.includes(sourceFilter)) return false;
    return true;
  });

  return (
    <AppLayout title="Packet Analyzer" subtitle="Real-time network packet capture and analysis">
      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="metric-card cyan" style={{ flex: 1, minWidth: 140, padding: 16 }}>
          <div className="metric-label">Total Captured</div>
          <div className="metric-value cyan" style={{ fontSize: 24 }}>{stats?.total?.toLocaleString() ?? 0}</div>
        </div>
        <div className="metric-card red" style={{ flex: 1, minWidth: 140, padding: 16 }}>
          <div className="metric-label">Suspicious</div>
          <div className="metric-value red" style={{ fontSize: 24 }}>{stats?.suspicious ?? 0}</div>
        </div>
        {stats?.byProtocol.slice(0, 4).map(p => (
          <div key={p.protocol} className="metric-card" style={{ flex: 1, minWidth: 120, padding: 16, borderTop: `2px solid ${PROTOCOL_COLORS[p.protocol] || '#6272a4'}` }}>
            <div className="metric-label">{p.protocol}</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 700, color: PROTOCOL_COLORS[p.protocol] || '#6272a4' }}>{p._count.protocol}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Filter bar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="live-indicator">
            <span className={`live-dot`} style={{ background: paused ? 'var(--orange)' : 'var(--green)', boxShadow: paused ? '0 0 6px var(--orange)' : '0 0 6px var(--green)' }} />
            {paused ? 'PAUSED' : 'LIVE'}
          </div>
          <input className="input" style={{ maxWidth: 160 }} placeholder="Source IP filter..." value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} />
          <select className="select" style={{ maxWidth: 120 }} value={protocolFilter} onChange={e => setProtocolFilter(e.target.value)}>
            <option value="">All Protocols</option>
            {['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS', 'SSH', 'FTP'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={suspiciousOnly} onChange={e => setSuspiciousOnly(e.target.checked)} />
            Suspicious only
          </label>
          <button className="btn btn-ghost btn-sm" onClick={() => setPaused(p => !p)}>
            {paused ? '▶ Resume' : '⏸ Pause'} Capture
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setPackets([])}>🗑 Clear</button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{filteredPackets.length} packets</span>
        </div>

        {/* Packet table */}
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          <table className="data-table">
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
              <tr>
                <th>Time</th>
                <th>Protocol</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Port</th>
                <th>Size</th>
                <th>Flags</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackets.map(packet => (
                <tr key={packet.id} className={`packet-row ${packet.isSuspicious ? 'suspicious' : ''}`}>
                  <td><span className="mono" style={{ fontSize: 11 }}>{new Date(packet.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}</span></td>
                  <td><span className="mono" style={{ color: PROTOCOL_COLORS[packet.protocol] || '#6272a4', fontSize: 11, fontWeight: 600 }}>{packet.protocol}</span></td>
                  <td><span className="mono" style={{ color: 'var(--cyan)', fontSize: 11 }}>{packet.sourceIp}{packet.sourcePort ? `:${packet.sourcePort}` : ''}</span></td>
                  <td><span className="mono" style={{ fontSize: 11 }}>{packet.destIp}</span></td>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{packet.destPort || '—'}</span></td>
                  <td><span style={{ fontSize: 11 }}>{packet.size} B</span></td>
                  <td><span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{packet.flags || '—'}</span></td>
                  <td>{packet.isSuspicious ? <span className="badge critical" style={{ fontSize: 9 }}>⚠ SUSPICIOUS</span> : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}</td>
                </tr>
              ))}
              {filteredPackets.length === 0 && (
                <tr><td colSpan={8}><div className="empty-state" style={{ padding: 40 }}><div className="empty-icon">📡</div><div className="empty-title">Waiting for packets...</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
