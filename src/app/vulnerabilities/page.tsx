'use client';
import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

interface Vulnerability {
  id: string; cve?: string; title: string; severity: string; description: string;
  solution?: string; cvssScore?: number; status: string; detectedAt: string;
  device: { ip: string; hostname: string; deviceType: string; };
}

interface Stats { total: number; critical: number; high: number; medium: number; low: number; open: number; }

export default function VulnerabilitiesPage() {
  const { token, loading: authLoading } = useAuth();
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [selected, setSelected] = useState<Vulnerability | null>(null);

  const fetchData = useCallback(async () => {
    if (authLoading || !token) return;
    const params = new URLSearchParams({ limit: '100' });
    if (severityFilter) params.set('severity', severityFilter);
    if (statusFilter) params.set('status', statusFilter);
    const [d, s] = await Promise.all([
      apiFetch(`/api/vulnerabilities?${params}`, token).catch(() => ({ vulnerabilities: [] })),
      apiFetch('/api/vulnerabilities/stats', token).catch(() => null),
    ]);
    setVulns(d.vulnerabilities); setStats(s);
  }, [token, severityFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function updateStatus(id: string, status: string) {
    if (authLoading || !token) return;
    await apiFetch(`/api/vulnerabilities/${id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) });
    fetchData(); setSelected(null);
  }

  const CVSS_COLOR = (score?: number) => !score ? 'var(--text-muted)' : score >= 9 ? 'var(--red)' : score >= 7 ? 'var(--orange)' : score >= 4 ? 'var(--yellow)' : 'var(--green)';

  return (
    <AppLayout title="Vulnerability Management" subtitle="CVE tracking and security assessment results">
      {/* Stats */}
      <div className="metric-grid" style={{ marginBottom: 20 }}>
        <div className="metric-card cyan"><div className="metric-label">Total Found</div><div className="metric-value cyan">{stats?.total ?? 0}</div><div className="metric-sub">{stats?.open} open</div></div>
        <div className="metric-card red"><div className="metric-label">Critical</div><div className="metric-value red" style={{ fontSize: 28 }}>{stats?.critical ?? 0}</div><div className="metric-sub">CVSS ≥ 9.0</div></div>
        <div className="metric-card orange"><div className="metric-label">High</div><div className="metric-value orange" style={{ fontSize: 28 }}>{stats?.high ?? 0}</div><div className="metric-sub">CVSS 7.0–8.9</div></div>
        <div className="metric-card yellow"><div className="metric-label">Medium</div><div className="metric-value yellow" style={{ fontSize: 28 }}>{stats?.medium ?? 0}</div><div className="metric-sub">CVSS 4.0–6.9</div></div>
        <div className="metric-card green"><div className="metric-label">Low</div><div className="metric-value green" style={{ fontSize: 28 }}>{stats?.low ?? 0}</div><div className="metric-sub">CVSS 0.1–3.9</div></div>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="filter-bar">
            <select className="select" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
              <option value="">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={fetchData}>🔍 Run Scan</button>
            <button className="btn btn-ghost btn-sm" onClick={fetchData}>↻ Refresh</button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>CVE</th>
                    <th>Title</th>
                    <th>Affected Device</th>
                    <th>CVSS</th>
                    <th>Status</th>
                    <th>Detected</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vulns.map(v => (
                    <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(v)}>
                      <td><span className={`badge ${v.severity}`}>{v.severity.toUpperCase()}</span></td>
                      <td>
                        {v.cve
                          ? <a href={`https://nvd.nist.gov/vuln/detail/${v.cve}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="mono" style={{ color: 'var(--cyan)', fontSize: 11, textDecoration: 'none' }}>{v.cve}</a>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          <div style={{ color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>{v.device.ip}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{v.device.hostname}</div>
                        </div>
                      </td>
                      <td>
                        <span className="mono" style={{ color: CVSS_COLOR(v.cvssScore), fontSize: 13, fontWeight: 700 }}>
                          {v.cvssScore?.toFixed(1) ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: v.status === 'open' ? 'var(--red-dim)' : v.status === 'resolved' ? 'var(--green-dim)' : 'var(--orange-dim)', color: v.status === 'open' ? 'var(--red)' : v.status === 'resolved' ? 'var(--green)' : 'var(--orange)' }}>
                          {v.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(v.detectedAt).toLocaleDateString()}</td>
                      <td onClick={e => e.stopPropagation()}>
                        {v.status === 'open' && <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(v.id, 'in_progress')}>Remediate</button>}
                        {v.status === 'in_progress' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(v.id, 'resolved')}>Mark Fixed</button>}
                      </td>
                    </tr>
                  ))}
                  {vulns.length === 0 && <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon">✅</div><div className="empty-title">No vulnerabilities found</div></div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ width: 320, flexShrink: 0 }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className={`badge ${selected.severity}`}>{selected.severity.toUpperCase()}</span>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--text-primary)' }}>{selected.title}</div>
              {selected.cve && (
                <div style={{ marginBottom: 12 }}>
                  <span className="mono" style={{ color: 'var(--cyan)', fontSize: 12 }}>{selected.cve}</span>
                  {selected.cvssScore && <span style={{ marginLeft: 10, fontWeight: 700, color: CVSS_COLOR(selected.cvssScore) }}>CVSS {selected.cvssScore.toFixed(1)}</span>}
                </div>
              )}
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>{selected.description}</div>
              {selected.solution && (
                <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(0,255,157,0.2)', borderRadius: 8, padding: 12, fontSize: 13, color: '#88ffcc', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>💡 Recommended Fix</div>
                  {selected.solution}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                <div>Device: <span style={{ color: 'var(--cyan)' }}>{selected.device.ip}</span></div>
                <div>Detected: {new Date(selected.detectedAt).toLocaleDateString()}</div>
              </div>
              {selected.status === 'open' && <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => updateStatus(selected.id, 'in_progress')}>🔧 Start Remediation</button>}
              {selected.status === 'in_progress' && <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => updateStatus(selected.id, 'resolved')}>✅ Mark as Fixed</button>}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
