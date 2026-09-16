import type { Metadata, Viewport } from 'next';
import { CHALLENGE_COUNT } from '@/lib/game/campaign-size';
import './globals.css';
import './garden.css';
import '@/components/specials/shared.css';
export const metadata: Metadata = {
  title: '箭头出逃 · Arrow Escape',
  description: `点击箭头，解开交错的方向。${CHALLENGE_COUNT} 关解谜旅程与途中奇遇。没有倒计时，慢慢找到每一个出口。`,
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
