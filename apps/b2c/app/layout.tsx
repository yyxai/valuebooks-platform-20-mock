import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ValueBooks - Sell Your Books',
  description: 'Get paid for your used books with free shipping',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
