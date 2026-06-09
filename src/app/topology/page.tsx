'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppLayout } from '@/components/AppLayout';
import * as d3 from 'd3';

interface Device {
  id: string; ip: string; hostname?: string; deviceType: string;
  status: string; riskScore: number; manufacturer?: string;
}

const ICON: Record<string, string> = {
  router: '📡', server: '🖥', laptop: '💻', phone: '📱',
  iot: '🔌', switch: '🔀', access_point: '📶', unknown: '❓',
};

function nodeColor(d: Device & { isRoot?: boolean }) {
  if (d.isRoot) return '#00d4ff';
  if (d.status === 'suspicious') return '#ff8c42';
  if (d.status === 'offline') return '#4a6a8a';
  if (d.riskScore > 70) return '#ff3366';
  return '#00ff9d';
}

function TopologyContent() {
  const { token, loading: authLoading } = useAuth();
  const svgRef = useRef<SVGSVGElement>(null);
  const builtRef = useRef(false);

  const buildMap = useCallback(async (tok: string) => {
    if (!svgRef.current) return;
    let devices: Device[] = [];
    try {
      const data = await apiFetch('/api/devices?limit=80', tok);
      devices = data.devices || [];
    } catch (e) {
      console.error('topology fetch:', e);
      return;
    }
    if (!devices.length) return;

    const svgEl = svgRef.current;
    const W = svgEl.clientWidth || 900;
    const H = 540;

    d3.select(svgEl).selectAll('*').remove();
    const svg = d3.select(svgEl).attr('width', W).attr('height', H);

    // Defs
    const defs = svg.append('defs');
    const grid = defs.append('pattern').attr('id', 'topo-grid').attr('width', 40).attr('height', 40).attr('patternUnits', 'userSpaceOnUse');
    grid.append('path').attr('d', 'M 40 0 L 0 0 0 40').attr('fill', 'none').attr('stroke', 'rgba(0,212,255,0.04)').attr('stroke-width', 1);
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'url(#topo-grid)');

    const glow = defs.append('filter').attr('id', 'topo-glow');
    glow.append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'blur');
    const fm = glow.append('feMerge');
    fm.append('feMergeNode').attr('in', 'blur');
    fm.append('feMergeNode').attr('in', 'SourceGraphic');

    // Build node list: router at center
    const routerDev = devices.find(d => d.deviceType === 'router') || devices[0];
    const others = devices.filter(d => d.id !== routerDev.id).slice(0, 40);

    type NodeData = Device & { isRoot?: boolean; x: number; y: number };

    const center: NodeData = { ...routerDev, isRoot: true, x: W / 2, y: H / 2 };
    const ring: NodeData[] = others.map((d, i) => {
      const angle = (i / others.length) * 2 * Math.PI - Math.PI / 2;
      const r = Math.min(W, H) * 0.36;
      return { ...d, isRoot: false, x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle) };
    });
    const nodes: NodeData[] = [center, ...ring];

    // Links
    const links = ring.map(n => ({ source: center, target: n }));
    svg.selectAll('line').data(links).enter().append('line')
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      .attr('stroke', d => nodeColor(d.target))
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', d => d.target.status === 'suspicious' ? '5,4' : 'none');

    // Tooltip
    // Remove any old tooltip
    d3.selectAll('#topo-tooltip').remove();
    const tip = d3.select('body').append('div')
      .attr('id', 'topo-tooltip')
      .style('position', 'fixed')
      .style('background', '#0d1f38')
      .style('border', '1px solid rgba(0,212,255,0.35)')
      .style('border-radius', '8px')
      .style('padding', '10px 14px')
      .style('font-size', '12px')
      .style('color', '#e8f4fd')
      .style('pointer-events', 'none')
      .style('opacity', '0')
      .style('z-index', '9999')
      .style('font-family', 'Inter, sans-serif')
      .style('max-width', '200px')
      .style('transition', 'opacity 0.15s');

    // Node groups
    const nodeG = svg.selectAll('g.node').data(nodes).enter()
      .append('g').attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer');

    nodeG.append('circle')
      .attr('r', d => d.isRoot ? 30 : 18)
      .attr('fill', d => `${nodeColor(d)}18`)
      .attr('stroke', d => nodeColor(d))
      .attr('stroke-width', d => d.isRoot ? 2.5 : 1.5)
      .attr('filter', 'url(#topo-glow)');

    nodeG.append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', d => d.isRoot ? 18 : 14)
      .text(d => ICON[d.deviceType] || '❓');

    nodeG.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', d => d.isRoot ? 44 : 30)
      .attr('font-size', 9)
      .attr('fill', 'rgba(232,244,253,0.65)')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(d => d.hostname || d.ip);

    // Risk badge
    nodeG.filter(d => !d.isRoot && d.riskScore > 50)
      .append('circle').attr('cx', 14).attr('cy', -14).attr('r', 8)
      .attr('fill', d => d.riskScore > 70 ? '#ff3366' : '#ff8c42');
    nodeG.filter(d => !d.isRoot && d.riskScore > 50)
      .append('text').attr('x', 14).attr('y', -14)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', 8).attr('fill', 'white').attr('font-weight', 'bold')
      .text(d => d.riskScore);

    // Hover
    nodeG
      .on('mouseover', (event, d) => {
        tip.style('opacity', '1').html(`
          <div style="font-weight:700;margin-bottom:6px;color:${nodeColor(d)}">${d.hostname || 'Unknown'}</div>
          <div style="color:#8ba3bc;font-family:JetBrains Mono,monospace;margin-bottom:4px">${d.ip}</div>
          <div style="display:flex;gap:10px">
            <span style="color:${nodeColor(d)}">● ${d.status}</span>
            <span style="color:#ffd23f">Risk: ${d.riskScore}</span>
          </div>
          <div style="color:#8ba3bc;margin-top:4px">${d.deviceType} · ${d.manufacturer || 'Unknown'}</div>
        `);
      })
      .on('mousemove', (event) => {
        tip.style('left', (event.clientX + 14) + 'px').style('top', (event.clientY - 10) + 'px');
      })
      .on('mouseout', () => tip.style('opacity', '0'));

    return () => { tip.remove(); };
  }, []);

  useEffect(() => {
    if (!authLoading && token && !builtRef.current) {
      builtRef.current = true;
      buildMap(token);
    }
  }, [authLoading, token, buildMap]);

  // Cleanup tooltip on unmount
  useEffect(() => {
    return () => { d3.selectAll('#topo-tooltip').remove(); };
  }, []);

  const refresh = () => {
    if (!token) return;
    builtRef.current = false;
    d3.selectAll('#topo-tooltip').remove();
    buildMap(token);
  };

  const legend = [
    { color: '#00ff9d', label: 'Online / Safe' },
    { color: '#ff8c42', label: 'Suspicious' },
    { color: '#ff3366', label: 'High Risk' },
    { color: '#4a6a8a', label: 'Offline' },
    { color: '#00d4ff', label: 'Gateway / Router' },
  ];

  return (
    <div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {legend.map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block', boxShadow: `0 0 4px ${l.color}` }} />
                {l.label}
              </div>
            ))}
          </div>
          <button
            onClick={refresh}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}
          >↻ Refresh Map</button>
        </div>
        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          style={{ width: '100%', height: 540, display: 'block', background: 'var(--bg-card)' }}
        />
      </div>
      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
        💡 Hover over nodes to see device details. Badge numbers = risk score.
      </div>
    </div>
  );
}

export default function TopologyPage() {
  return (
    <AppLayout title="Network Topology" subtitle="Visual map of all network devices and connections">
      <TopologyContent />
    </AppLayout>
  );
}
