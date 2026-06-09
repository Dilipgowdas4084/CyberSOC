'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { token } = useAuth();
  const [time, setTime] = useState(new Date());
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch('/api/alerts/unread-count', token)
      .then(d => setUnreadAlerts(d.count))
      .catch(() => {});
  }, [token]);

  return (
    <div className="topbar">
      <div style={{ flex: 1 }}>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-sub">{subtitle}</div>}
      </div>

      <div className="live-indicator">
        <span className="live-dot" />
        LIVE
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {time.toLocaleTimeString()}
        </span>
        <span>{time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>

      {unreadAlerts > 0 && (
        <a href="/alerts" style={{ position: 'relative', textDecoration: 'none' }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--red)', color: 'white', fontSize: 10,
            fontWeight: 700, borderRadius: '50%', width: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unreadAlerts > 9 ? '9+' : unreadAlerts}</span>
        </a>
      )}
    </div>
  );
}
