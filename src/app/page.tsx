import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Landing from '@/components/landing/Landing';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'JetNote Pos | Sistem Kasir & Manajemen Restoran',
  description:
    'Kelola order dine-in, takeaway, dan delivery, stok bahan baku, menu online, karyawan, dan laporan keuangan restoran dalam satu aplikasi.',
};

export default function HomePage() {
  return (
    <div className={jakarta.variable}>
      <Landing />
    </div>
  );
}
