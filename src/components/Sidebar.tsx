'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', icon: '⬡', label: 'Dashboard' },
    ]
  },
  {
    label: 'Network',
    items: [
      { href: '/devices', icon: '💻', label: 'Devices' },
      { href: '/topology', icon: '🕸', label: 'Topology Map' },
      { href: '/packets', icon: '📡', label: 'Packet Analyzer' },
    ]
  },
  {
    label: 'Security',
    items: [
      { href: '/threats', icon: '⚡', label: 'Threats', badge: 'live' },
      { href: '/alerts', icon: '🔔', label: 'Alerts' },
      { href: '/vulnerabilities', icon: '🛡', label: 'Vulnerabilities' },
    ]
  },
  {
    label: 'Response',
    items: [
      { href: '/incidents', icon: '🎯', label: 'Incidents' },
      { href: '/logs', icon: '📋', label: 'Logs' },
      { href: '/reports', icon: '📈', label: 'Reports' },
      { href: '/assistant', icon: '🤖', label: 'AI Assistant' },
    ]
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🛡</div>
        <div>
          <div className="sidebar-logo-text">CyberSOC</div>
          <div className="sidebar-logo-sub">Security Platform</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge === 'live' && (
                  <span className="live-indicator" style={{ marginLeft: 'auto', fontSize: 10 }}>
                    <span className="live-dot" />
                    LIVE
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {user && (
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--cyan), #0066cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--bg-primary)' }}>
              {user.name[0]}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.role.replace('_', ' ')}</div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-ghost" style={{ width: '100%', fontSize: 12, padding: '6px 12px', justifyContent: 'center' }}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
