'use client';
import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

interface Alert {
  id: string; type: string; severity: string; message: string; details?: string;
  createdAt: string; acknowledged: boolean; resolvedAt?: string;
  device?: { ip: string; hostname: string; };
}

const TYPE_ICONS: Record<string, string> = {
  new_device: '💻', device_disconnected: '🔌', unauthorized_device: '⚠️',
  malware: '🦠', failed_login: '🔐', traffic_anomaly: '📡',
};

export default function AlertsPage() {
  const { token, loading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [severityFilter, setSeverityFilter] = useState('');
  const [ackFilter, setAckFilter] = useState('false');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'resolved'>('unread');

  const fetchAlerts = useCallback(async () => {
    if (authLoading || !token) return;
    const params = new URLSearchParams({ limit: '100' });
    if (severityFilter) params.set('severity', severityFilter);
    if (activeTab === 'unread') params.set('acknowledged', 'false');
    if (activeTab === 'resolved') params.set('acknowledged', 'true');
    const data = await apiFetch(`/api/alerts?${params}`, token).catch(() => ({ alerts: [], total: 0 }));
    setAlerts(data.alerts); setTotal(data.total);
  }, [token, severityFilter, activeTab]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  useEffect(() => {
    const socket = io(WS_URL);
    socket.on('alert:created', (alert: Alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 99)]);
    });
    return () => { socket.disconnect(); };
  }, []);

  async function acknowledge(id: string) {
    if (authLoading || !token) return;
    await apiFetch(`/api/alerts/${id}/acknowledge`, token, { method: 'PATCH' });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  }

  async function resolve(id: string) {
    if (authLoading || !token) return;
    await apiFetch(`/api/alerts/${id}/resolve`, token, { method: 'PATCH' });
    fetchAlerts();
  }

  async function acknowledgeAll() {
    if (authLoading || !token) return;
    await apiFetch('/api/alerts/acknowledge-all', token, { method: 'PATCH' });
    fetchAlerts();
  }

  return (
    <AppLayout title="Alert Center" subtitle="Security alerts and notifications requiring attention">
      <div className="page-header">
        <div>
          <div className="page-title">Security Alerts</div>
          <div className="page-subtitle">{total} alerts · {alerts.filter(a => !a.acknowledged).length} unacknowledged</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="select" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={acknowledgeAll}>✓ Acknowledge All</button>
          <button className="btn btn-ghost btn-sm" onClick={fetchAlerts}>↻ Refresh</button>
        </div>
      </div>

      <div className="tab-bar">
        {[{ key: 'unread', label: '🔔 Unread' }, { key: 'all', label: '📋 All Alerts' }, { key: 'resolved', label: '✅ Resolved' }].map(tab => (
          <div key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key as any)}>
            {tab.label}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map(alert => (
          <div key={alert.id} className="alert-banner" style={{
            background: alert.acknowledged ? 'var(--bg-card)' : `var(--${alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'high' : alert.severity === 'medium' ? 'medium' : 'low'}-bg, var(--bg-elevated))`,
            border: `1px solid ${alert.acknowledged ? 'var(--border)' : alert.severity === 'critical' ? 'rgba(255,51,102,0.3)' : alert.severity === 'high' ? 'rgba(255,140,66,0.3)' : alert.severity === 'medium' ? 'rgba(255,210,63,0.3)' : 'rgba(0,255,157,0.3)'}`,
            borderRadius: 10, opacity: alert.acknowledged ? 0.7 : 1,
          }}>
            <div style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICONS[alert.type] || '🔔'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className={`badge ${alert.severity}`} style={{ fontSize: 10 }}>{alert.severity.toUpperCase()}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{alert.type.replace('_', ' ')}</span>
                {alert.device && <span className="mono" style={{ fontSize: 11, color: 'var(--cyan)' }}>{alert.device.ip}</span>}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{new Date(alert.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>{alert.message}</div>
              {alert.details && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{alert.details}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {!alert.acknowledged && (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => acknowledge(alert.id)}>✓ Ack</button>
                  <button className="btn btn-primary btn-sm" onClick={() => resolve(alert.id)}>Resolve</button>
                </>
              )}
              {alert.acknowledged && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>✓ Acknowledged</span>}
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <div className="empty-title">No alerts to display</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>All clear! No security alerts at this time.</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
