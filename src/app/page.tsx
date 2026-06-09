'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('cybersoc_token');
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🛡</div>
        <div style={{ fontFamily: 'Orbitron, monospace', color: 'var(--cyan)', fontSize: 14 }}>Loading CyberSOC...</div>
      </div>
    </div>
  );
}
