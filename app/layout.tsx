import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '箭头集集 · 配对玩法实验',
  description:
    '箭头出逃与三件配对的独立玩法实验。6张谜题，七格收集槽，没有倒计时。',
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
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
