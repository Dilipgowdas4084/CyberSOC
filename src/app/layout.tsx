import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CyberSOC — Enterprise Security Operations Center',
  description: 'Real-time network monitoring, threat detection, vulnerability assessment, and security analytics platform for security operations teams.',
  keywords: 'cybersecurity, SOC, network monitoring, threat detection, SIEM',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
