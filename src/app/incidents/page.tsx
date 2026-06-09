'use client';
import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

interface Incident {
  id: string; incidentId: string; title: string; severity: string;
  status: string; description: string; resolution?: string;
  createdAt: string; resolvedAt?: string;
  analyst?: { name: string; email: string; };
}

const STATUS_COLUMNS = [
  { key: 'open', label: 'Open', color: '#ff3366', icon: '🔴' },
  { key: 'investigating', label: 'Investigating', color: '#ff8c42', icon: '🟠' },
  { key: 'in_progress', label: 'In Progress', color: '#ffd23f', icon: '🟡' },
  { key: 'resolved', label: 'Resolved', color: '#00ff9d', icon: '🟢' },
];

export default function IncidentsPage() {
  const { token, loading: authLoading } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [newIncident, setNewIncident] = useState({ title: '', severity: 'high', description: '' });

  const fetchIncidents = useCallback(async () => {
    if (authLoading || !token) return;
    const data = await apiFetch('/api/incidents', token).catch(() => ({ incidents: [] }));
    setIncidents(data.incidents);
  }, [token]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  async function createIncident() {
    if (!token || !newIncident.title) return;
    await apiFetch('/api/incidents', token, { method: 'POST', body: JSON.stringify(newIncident) });
    setCreating(false);
    setNewIncident({ title: '', severity: 'high', description: '' });
    fetchIncidents();
  }

  async function updateStatus(id: string, status: string) {
    if (authLoading || !token) return;
    await apiFetch(`/api/incidents/${id}`, token, { method: 'PATCH', body: JSON.stringify({ status }) });
    fetchIncidents();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  }

  const byStatus = (status: string) => incidents.filter(i => i.status === status);

  return (
    <AppLayout title="Incident Response" subtitle="Security incident tracking and management">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            {STATUS_COLUMNS.map(col => (
              <span key={col.key} style={{ color: col.color }}>
                {col.icon} {byStatus(col.key).length} {col.label}
              </span>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New Incident</button>
      </div>

      {/* Create incident modal */}
      {creating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 480, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>🎯 Create New Incident</h2>
              <button onClick={() => setCreating(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Title</label>
                <input className="input" value={newIncident.title} onChange={e => setNewIncident(p => ({ ...p, title: e.target.value }))} placeholder="Incident title..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Severity</label>
                <select className="select" value={newIncident.severity} onChange={e => setNewIncident(p => ({ ...p, severity: e.target.value }))}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Description</label>
                <textarea className="input" style={{ resize: 'vertical', minHeight: 80 }} value={newIncident.description} onChange={e => setNewIncident(p => ({ ...p, description: e.target.value }))} placeholder="Describe the incident..." />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={createIncident}>Create Incident</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="kanban-board">
        {STATUS_COLUMNS.map(col => (
          <div key={col.key} className="kanban-column">
            <div className="kanban-column-header" style={{ color: col.color }}>
              <span>{col.icon}</span>
              <span>{col.label}</span>
              <span style={{ marginLeft: 'auto', background: 'var(--bg-elevated)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                {byStatus(col.key).length}
              </span>
            </div>

            {byStatus(col.key).map(incident => (
              <div key={incident.id} className="kanban-item" onClick={() => setSelected(incident)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{incident.incidentId}</span>
                  <span className={`badge ${incident.severity}`} style={{ fontSize: 9 }}>{incident.severity}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>{incident.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{incident.description}</div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(incident.createdAt).toLocaleDateString()}</span>
                  {incident.analyst && <span style={{ color: 'var(--cyan)', fontSize: 11 }}>👤 {incident.analyst.name.split(' ')[0]}</span>}
                </div>
              </div>
            ))}

            {byStatus(col.key).length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No incidents</div>
            )}
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 560, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{selected.incidentId}</div>
                <h2 style={{ fontSize: 17, fontWeight: 700 }}>{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span className={`badge ${selected.severity}`}>{selected.severity}</span>
              <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{selected.status}</span>
              {selected.analyst && <span style={{ fontSize: 12, color: 'var(--cyan)' }}>👤 {selected.analyst.name}</span>}
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>{selected.description}</div>

            {selected.resolution && (
              <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(0,255,157,0.2)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: '#88ffcc' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>✅ Resolution</div>
                {selected.resolution}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selected.status === 'open' && <button className="btn btn-ghost" onClick={() => updateStatus(selected.id, 'investigating')}>🔍 Investigate</button>}
              {selected.status === 'investigating' && <button className="btn btn-ghost" onClick={() => updateStatus(selected.id, 'in_progress')}>▶ Start Work</button>}
              {selected.status === 'in_progress' && <button className="btn btn-primary" onClick={() => updateStatus(selected.id, 'resolved')}>✅ Mark Resolved</button>}
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
