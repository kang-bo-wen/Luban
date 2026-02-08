import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Break It Down - Deconstruction',
  description: 'Interactive Mine & Craft game - Deconstruction Phase',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
