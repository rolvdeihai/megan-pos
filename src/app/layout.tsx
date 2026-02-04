import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { StaffProvider } from '@/contexts/StaffContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Megan POS',
  description: 'Sistem Point of Sale Modern',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider>
          <StaffProvider>
            {children}
          </StaffProvider>
        </AuthProvider>
      </body>
    </html>
  );
}