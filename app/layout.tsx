import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import Sidebar from './components/Sidebar';

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
      <body>
        <Providers>
          <Sidebar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
