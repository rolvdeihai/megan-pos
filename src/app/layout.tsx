import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { StaffProvider } from '@/contexts/StaffContext';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JetNote Pos',
  description: 'Sistem Point of Sale Modern',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-152.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FFFFFF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="JetNote Pos" />
        <link rel="apple-touch-icon" href="/icons/icon-152.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            <StaffProvider>
              {children}
              <PWAInstallPrompt />
            </StaffProvider>
          </ThemeProvider>
        </AuthProvider>

        {/* Service Worker registration – manual, no extra component */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('SW registered:', reg))
                    .catch(err => console.error('SW registration failed:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}