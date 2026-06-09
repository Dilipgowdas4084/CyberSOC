'use client';
import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date; }

const KNOWLEDGE_BASE: Record<string, string> = {
  'port scan': `**Port Scan Detected** 🔴

A port scan is when an attacker systematically probes your network for open ports and services.

**What's happening:**
• Attacker is mapping your network attack surface
• Commonly precedes targeted exploitation
• MITRE ATT&CK: T1046 (Network Service Discovery)

**Immediate Actions:**
1. Block the source IP at your firewall immediately
2. Review what services are exposed on scanned ports
3. Check if any ports are unexpectedly open
4. Enable geo-blocking if source is foreign

**Risk Level:** HIGH — This is reconnaissance. An attack may follow within hours.`,

  'brute force': `**Brute Force Attack** 🔴

Credential stuffing/brute force attempt detected against your authentication services.

**What's happening:**
• Attacker is attempting password guessing at high speed
• May use leaked credential databases (credential stuffing)
• MITRE ATT&CK: T1110

**Immediate Actions:**
1. Enable account lockout after 5 failed attempts
2. Block the attacking IP range at firewall/WAF
3. Enable MFA on all authentication endpoints
4. Reset potentially compromised account passwords
5. Review successful logins from same IP range

**Risk Level:** CRITICAL if SSH/RDP targeted`,

  'arp spoof': `**ARP Spoofing Attack** 🔴

ARP poisoning detected — an attacker is trying to intercept your network traffic.

**What's happening:**
• Attacker sends fake ARP replies to poison network caches
• All traffic may be routed through attacker's device (MITM)
• Affects entire subnet — not just one device
• MITRE ATT&CK: T1557.002

**Immediate Actions:**
1. Identify and physically isolate the rogue device
2. Flush ARP caches on all affected hosts
3. Enable Dynamic ARP Inspection (DAI) on switches
4. Use static ARP entries for critical devices (gateway)
5. Deploy network monitoring for future ARP anomalies

**Risk Level:** CRITICAL — All unencrypted traffic is compromised`,

  'mitm': `**Man-in-the-Middle Attack** 🔴

Active MITM attack in progress. Traffic interception detected.

**Immediate Actions:**
1. Force HTTPS on all web applications
2. Enable HTTP Strict Transport Security (HSTS)
3. Use certificate pinning for mobile applications
4. Deploy network segmentation (VLANs)
5. Enable 802.1X port authentication

**Long-term Mitigations:**
• Zero Trust network architecture
• Mutual TLS (mTLS) for service-to-service communication`,

  'ddos': `**DDoS Attack Detected** 🔴

Distributed Denial of Service attack targeting your infrastructure.

**Immediate Actions:**
1. Enable rate limiting at the WAF/CDN level
2. Activate CDN DDoS protection (Cloudflare/AWS Shield)
3. Implement IP reputation-based blocking
4. Contact your ISP for upstream filtering
5. Scale horizontally if using cloud infrastructure

**Traffic Mitigation:**
• Set connection limits per source IP
• Enable SYN cookies on Linux servers
• Deploy anycast routing to distribute load`,

  'vulnerability': `**Vulnerability Management Best Practices** 🛡

**Priority Order:**
1. **Critical (CVSS 9+)**: Patch within 24-48 hours
2. **High (CVSS 7-8.9)**: Patch within 1 week  
3. **Medium (CVSS 4-6.9)**: Patch within 30 days
4. **Low (CVSS 0-3.9)**: Patch within 90 days

**For unpatched systems:**
• Apply virtual patching via WAF rules
• Isolate vulnerable systems on separate VLAN
• Increase monitoring on affected endpoints
• Disable unused services/ports

**Tools to use:**
• Nmap + NSE scripts for discovery
• OpenVAS for comprehensive scanning
• Trivy for container vulnerability scanning`,

  'rogue device': `**Rogue Device Detected** 🔴

An unauthorized device has been detected on your network.

**Immediate Actions:**
1. **Quarantine** the device immediately (block at switch port)
2. Identify the physical location using:
   - SNMP queries to switches (find MAC → port mapping)  
   - WiFi signal triangulation if wireless
3. Log the device's MAC, IP, and connection time
4. Check if device is broadcasting unauthorized SSID
5. Conduct forensic analysis before wiping

**Prevention:**
• Enable 802.1X Network Access Control (NAC)
• Implement MAC address whitelisting
• Deploy Wireless Intrusion Prevention System (WIPS)`,

  'security score': `**Improving Your Security Score** 📊

Your security score is calculated based on:
- Active threats (−10 per critical)
- Open vulnerabilities (−5 per critical CVE)
- Suspicious devices (−3 each)
- Open incidents (−2 each)

**Quick Wins to Improve Score:**
1. Resolve/close active threats → +50 points potential
2. Patch critical CVEs → +25 points potential
3. Remove/isolate rogue devices → +15 points
4. Close resolved incidents → +10 points

**Long-term Improvements:**
• Implement patch management automation
• Deploy EDR solution on all endpoints
• Enable network segmentation
• Conduct regular penetration testing`,

  'help': `**AI Security Assistant Commands** 🤖

I can help you understand and respond to security threats. Ask me about:

• **"port scan"** — Port scanning attacks
• **"brute force"** — Brute force/credential attacks
• **"arp spoof"** — ARP poisoning attacks
• **"mitm"** — Man-in-the-middle attacks
• **"ddos"** — DDoS attacks
• **"vulnerability"** — Vulnerability management
• **"rogue device"** — Unauthorized device handling
• **"security score"** — Improving your security posture

Or ask any security question in plain English!`,
};

function findResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [key, response] of Object.entries(KNOWLEDGE_BASE)) {
    if (lower.includes(key)) return response;
  }
  
  // Generic responses
  if (lower.includes('hello') || lower.includes('hi')) {
    return `Hello! I'm your **AI Security Assistant** 🤖\n\nI'm trained on security threat intelligence and can help you:\n• Understand detected threats\n• Suggest remediation steps\n• Explain CVEs and vulnerabilities\n• Provide security best practices\n\nType **"help"** to see what I can assist with, or ask any security question!`;
  }
  if (lower.includes('firewall')) {
    return `**Firewall Best Practices** 🔥\n\n1. Default-deny all inbound traffic\n2. Only open ports required for business operations\n3. Enable stateful inspection\n4. Log all dropped packets\n5. Review firewall rules quarterly\n6. Separate zones: DMZ, Internal, Management\n7. Enable geo-blocking for countries you don't do business with`;
  }
  if (lower.includes('patch') || lower.includes('update')) {
    return `**Patch Management Strategy** 🔧\n\n**Critical CVEs:** Patch within 24-48 hours — no exceptions\n**High CVEs:** Patch within 7 days\n**Medium CVEs:** Monthly patch cycle\n\n**Process:**\n1. Test patches in staging environment first\n2. Create system snapshots before patching\n3. Deploy in maintenance windows\n4. Verify service health after patching\n5. Document all changes in change management`;
  }
  
  return `I understand you're asking about: **"${input}"**\n\nWhile this is outside my primary threat database, here are general security recommendations:\n\n1. **Investigate** — Gather logs and evidence\n2. **Contain** — Isolate affected systems\n3. **Eradicate** — Remove the threat\n4. **Recover** — Restore normal operations\n5. **Document** — Create an incident report\n\nFor more specific guidance, try asking about:\n• A specific threat type (port scan, brute force, etc.)\n• A CVE number\n• A security best practice area\n\nType **"help"** for a full list of topics I can assist with.`;
}

const QUICK_QUERIES = [
  'What is ARP spoofing and how to stop it?',
  'How do I improve my security score?',
  'Explain brute force attack mitigation',
  'What should I do about rogue devices?',
  'How to handle DDoS attacks?',
  'Vulnerability patching priorities',
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Welcome to **CyberSOC AI Security Assistant** 🛡\n\nI'm here to help you understand security threats, explain vulnerabilities, and provide remediation guidance.\n\nType **"help"** to see available topics, or ask any security question!`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(text?: string) {
    const query = text || input;
    if (!query.trim()) return;

    const userMsg: Message = { role: 'user', content: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const response = findResponse(query);
      const assistantMsg: Message = { role: 'assistant', content: response, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
      setTyping(false);
    }, 600 + Math.random() * 800);
  }

  function renderContent(content: string) {
    // Simple markdown rendering
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
      .replace(/\n/g, '<br/>');
  }

  return (
    <AppLayout title="AI Security Assistant" subtitle="Powered by threat intelligence and security knowledge base">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, height: 'calc(100vh - 160px)' }}>
        {/* Chat window */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 20, display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: msg.role === 'assistant' ? 'linear-gradient(135deg, var(--cyan), #0066cc)' : 'linear-gradient(135deg, var(--purple), #6600cc)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  alignSelf: 'flex-start',
                }}>
                  {msg.role === 'assistant' ? '🤖' : '👤'}
                </div>
                <div style={{ maxWidth: '80%' }}>
                  <div style={{
                    background: msg.role === 'assistant' ? 'var(--bg-elevated)' : 'var(--cyan-dim)',
                    border: `1px solid ${msg.role === 'assistant' ? 'var(--border)' : 'rgba(0,212,255,0.3)'}`,
                    borderRadius: msg.role === 'assistant' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                    padding: '12px 16px', fontSize: 13, lineHeight: 1.7,
                    color: 'var(--text-secondary)',
                  }}
                    dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--cyan), #0066cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px 12px 12px 12px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block', animation: `pulse 1.4s infinite ${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <input
              className="input"
              placeholder="Ask about threats, vulnerabilities, security best practices..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button className="btn btn-primary" onClick={() => sendMessage()} disabled={!input.trim() || typing}>
              Send ➤
            </button>
          </div>
        </div>

        {/* Quick queries panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>⚡ Quick Queries</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUICK_QUERIES.map(q => (
                <button
                  key={q}
                  className="btn btn-ghost"
                  style={{ textAlign: 'left', fontSize: 12, padding: '8px 12px', height: 'auto', whiteSpace: 'normal', lineHeight: 1.4 }}
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>🛡 Threat Context</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              This assistant uses a rule-based threat intelligence database to provide contextual security guidance without requiring external API calls.
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
              {['MITRE ATT&CK Framework', 'NIST 800-61 IR Guide', 'CVE Database', 'OWASP Top 10'].map(r => (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--green)', fontSize: 10 }}>✓</span> {r}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
