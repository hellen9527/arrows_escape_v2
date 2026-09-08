import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '箭头出逃 · Arrow Escape',
  description:
    '点击箭头，解开交错的方向。60 个原创谜题，没有倒计时，慢慢找到每一个出口。',
  icons: { icon: '/icon.svg' },
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
