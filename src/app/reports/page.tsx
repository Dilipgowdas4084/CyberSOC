'use client';
import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';

interface ReportData {
  generatedAt: string;
  period: string;
  deviceSummary: { total: number; online: number; rogue: number; newThisWeek: number };
  threatSummary: { total: number; active: number; resolved: number; thisWeek: number; trend: number; resolutionRate: number };
  alertSummary: { total: number; unacknowledged: number };
  vulnerabilitySummary: { open: number; critical: number; resolved: number };
  incidentSummary: { open: number; resolved: number };
  threatByType: { type: string; count: number }[];
  riskyDevices: { ip: string; hostname?: string; deviceType: string; riskScore: number; status: string; _count: { threats: number; vulnerabilities: number } }[];
  vulnBySeverity: { severity: string; count: number }[];
  recentCritical: { type: string; description: string; sourceIp?: string; targetIp?: string; detectedAt: string; status: string }[];
}

const THREAT_COLORS: Record<string, string> = {
  port_scan: '#00d4ff', brute_force: '#ff3366', mitm: '#ff8c42',
  arp_spoof: '#ffd23f', ddos: '#bd93f9', dns_spoof: '#00ff9d', suspicious_traffic: '#6272a4',
};
const THREAT_LABELS: Record<string, string> = {
  port_scan: 'Port Scan', brute_force: 'Brute Force', mitm: 'MITM',
  arp_spoof: 'ARP Spoof', ddos: 'DDoS', dns_spoof: 'DNS Spoof', suspicious_traffic: 'Suspicious',
};
const SEV_COLORS: Record<string, string> = {
  critical: '#ff3366', high: '#ff8c42', medium: '#ffd23f', low: '#00ff9d',
};

function StatBox({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', borderTop: `2px solid ${color}` }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function TrendBadge({ trend }: { trend: number }) {
  const up = trend > 0;
  const color = up ? '#ff3366' : '#00ff9d';
  return (
    <span style={{ fontSize: 12, color, background: up ? 'var(--red-dim)' : 'var(--green-dim)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
      {up ? '↑' : '↓'} {Math.abs(trend)}% vs prev week
    </span>
  );
}

export default function ReportsPage() {
  const { token, loading: authLoading } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    if (authLoading || !token) return;
    setLoading(true);
    try {
      const data = await apiFetch('/api/reports/summary', token);
      setReport(data);
    } catch { } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  function exportJSON() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `cybersoc-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  function exportCSV() {
    if (!report) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Devices', report.deviceSummary.total],
      ['Online Devices', report.deviceSummary.online],
      ['Rogue Devices', report.deviceSummary.rogue],
      ['New Devices This Week', report.deviceSummary.newThisWeek],
      ['Total Threats', report.threatSummary.total],
      ['Active Threats', report.threatSummary.active],
      ['Resolved Threats', report.threatSummary.resolved],
      ['Threats This Week', report.threatSummary.thisWeek],
      ['Resolution Rate', `${report.threatSummary.resolutionRate}%`],
      ['Open Vulnerabilities', report.vulnerabilitySummary.open],
      ['Critical Vulnerabilities', report.vulnerabilitySummary.critical],
      ['Open Incidents', report.incidentSummary.open],
      ['Resolved Incidents', report.incidentSummary.resolved],
      ['Unacknowledged Alerts', report.alertSummary.unacknowledged],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `cybersoc-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <AppLayout title="Security Reports" subtitle="Generating executive security summary...">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!report) return (
    <AppLayout title="Security Reports" subtitle="Failed to load report">
      <div className="empty-state"><div className="empty-icon">⚠️</div><div className="empty-title">Failed to load report data</div></div>
    </AppLayout>
  );

  const typeChartData = report.threatByType.map(t => ({
    name: THREAT_LABELS[t.type] || t.type,
    count: t.count,
    fill: THREAT_COLORS[t.type] || '#6272a4',
  }));

  const sevChartData = report.vulnBySeverity.map(v => ({
    name: v.severity,
    value: v.count,
    fill: SEV_COLORS[v.severity] || '#6272a4',
  }));

  const resolutionData = [
    { name: 'Resolution', value: report.threatSummary.resolutionRate, fill: '#00ff9d' },
  ];

  return (
    <AppLayout title="Security Reports" subtitle={`Executive summary · Generated ${new Date(report.generatedAt).toLocaleString()}`}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Period: {report.period}</span>
          <TrendBadge trend={report.threatSummary.trend} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>📊 Export CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={exportJSON}>📋 Export JSON</button>
          <button className="btn btn-primary btn-sm" onClick={fetchReport}>↻ Regenerate</button>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatBox label="Total Devices" value={report.deviceSummary.total} sub={`${report.deviceSummary.online} online`} color="var(--cyan)" />
        <StatBox label="Rogue Devices" value={report.deviceSummary.rogue} sub="Unauthorized" color="var(--red)" />
        <StatBox label="Active Threats" value={report.threatSummary.active} sub={`${report.threatSummary.thisWeek} this week`} color="var(--orange)" />
        <StatBox label="Resolution Rate" value={`${report.threatSummary.resolutionRate}%`} sub="Threat closure" color="var(--green)" />
        <StatBox label="Open Vulns" value={report.vulnerabilitySummary.open} sub={`${report.vulnerabilitySummary.critical} critical`} color="var(--yellow)" />
        <StatBox label="Open Incidents" value={report.incidentSummary.open} sub={`${report.incidentSummary.resolved} resolved`} color="var(--purple)" />
        <StatBox label="Unack Alerts" value={report.alertSummary.unacknowledged} sub="Need attention" color="var(--red)" />
        <StatBox label="New Devices" value={report.deviceSummary.newThisWeek} sub="This week" color="var(--cyan)" />
      </div>

      {/* Charts row 1 */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Threat by type */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚡ Threats by Type</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeChartData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 70 }}>
              <XAxis type="number" tick={{ fill: '#4a6a8a', fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#8ba3bc', fontSize: 11 }} width={80} />
              <Tooltip contentStyle={{ background: '#0d1f38', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Count">
                {typeChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vulnerability severity donut */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🛡 Vulnerability Severity</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={sevChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                {sevChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0d1f38', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
            {sevChartData.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.fill, display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{s.name}</span>
                <span style={{ color: s.fill, fontWeight: 600 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Top risky devices */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔴 Top Risk Devices</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {report.riskyDevices.map((device, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: device.riskScore >= 70 ? 'var(--red)' : device.riskScore >= 40 ? 'var(--orange)' : 'var(--yellow)', minWidth: 36 }}>
                  {device.riskScore}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {device.hostname || device.ip}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {device.ip} · {device.deviceType}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--red)' }}>⚡ {device._count.threats}</span>
                  <span style={{ color: 'var(--yellow)' }}>🛡 {device._count.vulnerabilities}</span>
                </div>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: device.status === 'online' ? 'var(--green)' : device.status === 'suspicious' ? 'var(--orange)' : 'var(--text-muted)', display: 'inline-block' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Resolution rate gauge */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📊 Response Metrics</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <ResponsiveContainer width="100%" height={120}>
                <RadialBarChart innerRadius={35} outerRadius={55} data={resolutionData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={6} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, color: 'var(--green)', fontWeight: 700 }}>{report.threatSummary.resolutionRate}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Resolution Rate</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
              {[
                { label: 'Threats Resolved', value: report.threatSummary.resolved, color: 'var(--green)' },
                { label: 'Threats Active', value: report.threatSummary.active, color: 'var(--red)' },
                { label: 'Incidents Closed', value: report.incidentSummary.resolved, color: 'var(--cyan)' },
                { label: 'Vulns Patched', value: report.vulnerabilitySummary.resolved, color: 'var(--purple)' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{m.label}</span>
                  <span style={{ color: m.color, fontWeight: 700 }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent critical threats */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">🔴 Recent Critical Threats (Last 7 Days)</div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{report.recentCritical.length} events</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Source IP</th>
                <th>Target IP</th>
                <th>Description</th>
                <th>Status</th>
                <th>Detected</th>
              </tr>
            </thead>
            <tbody>
              {report.recentCritical.map((t, i) => (
                <tr key={i}>
                  <td><span style={{ color: THREAT_COLORS[t.type] || 'var(--text-secondary)', fontSize: 12 }}>{THREAT_LABELS[t.type] || t.type}</span></td>
                  <td><span className="mono" style={{ color: 'var(--cyan)', fontSize: 12 }}>{t.sourceIp || '—'}</span></td>
                  <td><span className="mono" style={{ fontSize: 12 }}>{t.targetIp || '—'}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</td>
                  <td>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: t.status === 'active' ? 'var(--red-dim)' : t.status === 'investigating' ? 'var(--orange-dim)' : 'var(--green-dim)', color: t.status === 'active' ? 'var(--red)' : t.status === 'investigating' ? 'var(--orange)' : 'var(--green)' }}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(t.detectedAt).toLocaleString()}</td>
                </tr>
              ))}
              {report.recentCritical.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state" style={{ padding: 30 }}><div>No critical threats in the last 7 days ✅</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
