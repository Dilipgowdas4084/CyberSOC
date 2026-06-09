'use client';
import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

interface Log {
  id: string; action: string; resource?: string; details?: string; ip?: string;
  level: string; timestamp: string;
  user?: { name: string; email: string; };
}

const LEVEL_COLORS: Record<string, string> = {
  debug: '#4a6a8a', info: '#00d4ff', warn: '#ffd23f', error: '#ff8c42', critical: '#ff3366'
};

const LEVEL_EMOJI: Record<string, string> = {
  debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌', critical: '🔴'
};

export default function LogsPage() {
  const { token, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [levelFilter, setLevelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [live, setLive] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (authLoading || !token) return;
    const params = new URLSearchParams({ limit: '200' });
    if (levelFilter) params.set('level', levelFilter);
    if (search) params.set('search', search);
    const data = await apiFetch(`/api/logs?${params}`, token).catch(() => ({ logs: [], total: 0 }));
    setLogs(data.logs); setTotal(data.total);
  }, [token, levelFilter, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Simulate live log stream via socket
  useEffect(() => {
    if (!live) return;
    const socket = io(WS_URL);
    // Listen to any security event and create synthetic log entries
    const addLog = (level: string, action: string, details: string) => {
      const syntheticLog: Log = {
        id: Date.now().toString(),
        action, details, level,
        resource: 'system',
        ip: `192.168.1.${Math.floor(Math.random() * 100)}`,
        timestamp: new Date().toISOString(),
      };
      setLogs(prev => [syntheticLog, ...prev.slice(0, 199)]);
    };

    socket.on('threat:detected', (t: { type: string; severity: string; sourceIp: string }) => {
      addLog('warn', 'THREAT_DETECTED', `${t.type} from ${t.sourceIp} [${t.severity.toUpperCase()}]`);
    });
    socket.on('alert:created', (a: { type: string; message: string }) => {
      addLog('info', 'ALERT_CREATED', a.message);
    });
    socket.on('device:new', (d: { ip: string }) => {
      addLog('info', 'DEVICE_DISCOVERED', `New device: ${d.ip}`);
    });
    return () => { socket.disconnect(); };
  }, [live]);

  return (
    <AppLayout title="Security Event Logs" subtitle="Comprehensive audit trail and system event logs">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="live-indicator">
            <span className={`live-dot`} style={{ background: live ? 'var(--green)' : 'var(--orange)', boxShadow: live ? '0 0 6px var(--green)' : '0 0 6px var(--orange)' }} />
            {live ? 'STREAMING' : 'STATIC'}
          </div>
          <input className="input" style={{ maxWidth: 220 }} placeholder="🔍 Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="select" style={{ maxWidth: 130 }} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
            <option value="">All Levels</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => setLive(l => !l)}>
            {live ? '⏸ Pause' : '▶ Stream'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={fetchLogs}>↻ Refresh</button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{total} total events</span>
        </div>

        <div style={{ maxHeight: 700, overflowY: 'auto' }}>
          <table className="data-table">
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
              <tr>
                <th>Timestamp</th>
                <th>Level</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
                <th>User</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</span></td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, color: LEVEL_COLORS[log.level] || 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {LEVEL_EMOJI[log.level]} {log.level.toUpperCase()}
                    </span>
                  </td>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--cyan)' }}>{log.action}</span></td>
                  <td><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.resource || '—'}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details || '—'}</td>
                  <td><span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{log.user?.name || '—'}</span></td>
                  <td><span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.ip || '—'}</span></td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">No logs found</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
