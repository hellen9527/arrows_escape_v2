import type { Metadata, Viewport } from 'next';
import './globals.css';
import './garden.css';
export const metadata: Metadata = {
  title: '箭头出逃 · 林间外观实验',
  description:
    '林间手账风格的独立外观实验，保留300关和原版规则，可切换外观对比。',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Arrow Escape',
    statusBarStyle: 'default',
  },
  icons: { icon: '/icon.svg', apple: '/icons/apple-touch-icon.png' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f4f7fb',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" data-garden="true" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
