'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  ShoppingBagIcon,
  ArchiveBoxIcon,
  QrCodeIcon,
  ChartBarIcon,
  UserGroupIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import {
  OrdersMock,
  InventoryMock,
  OnlineMenuMock,
  ReportsMock,
  StaffMock,
  ReceiptMock,
} from './mocks';

const FEATURES = [
  {
    key: 'orders',
    tab: 'Order',
    icon: ShoppingBagIcon,
    title: 'Semua jenis order, satu layar',
    description:
      'Dine-in, takeaway, dan delivery masuk ke antrean yang sama. Kasir, dapur, dan pelayan melihat status yang sama secara real-time.',
    points: ['Pilih meja & reservasi berdasarkan jam', 'Order aktif bisa dilanjutkan kapan saja', 'Catatan khusus per item untuk dapur'],
    Visual: OrdersMock,
  },
  {
    key: 'inventory',
    tab: 'Menu & Stok',
    icon: ArchiveBoxIcon,
    title: 'Stok terpotong otomatis setiap ada order',
    description:
      'Hubungkan menu dengan bahan baku. Saat stok menipis, menu terkait otomatis ditandai habis sehingga tidak ada order yang harus dibatalkan.',
    points: ['Resep & bahan baku per menu', 'Peringatan stok menipis', 'Kategori & harga diubah dalam hitungan detik'],
    Visual: InventoryMock,
  },
  {
    key: 'online',
    tab: 'Menu Online',
    icon: QrCodeIcon,
    title: 'Website & menu online siap pakai',
    description:
      'Setiap restoran mendapat halaman menu sendiri. Pelanggan scan QR di meja atau buka link, lalu pesan langsung tanpa antre di kasir.',
    points: ['Link toko pribadi untuk dibagikan', 'QR code per meja', 'Order online langsung masuk ke dashboard'],
    Visual: OnlineMenuMock,
  },
  {
    key: 'reports',
    tab: 'Laporan',
    icon: ChartBarIcon,
    title: 'Laporan keuangan yang mudah dicerna',
    description:
      'Pendapatan harian, mingguan, dan bulanan tersaji otomatis. Lihat menu terlaris, jam ramai, dan laba untuk mengambil keputusan yang lebih tepat.',
    points: ['Filter harian, mingguan, bulanan', 'Riwayat transaksi lengkap', 'Analitik penjualan per menu'],
    Visual: ReportsMock,
  },
  {
    key: 'staff',
    tab: 'Karyawan',
    icon: UserGroupIcon,
    title: 'Atur tim dengan akses yang tepat',
    description:
      'Beri setiap karyawan login sendiri dengan role sesuai tugasnya. Absensi dan penggajian tercatat di tempat yang sama.',
    points: ['Role admin, kasir, dapur, pelayan', 'Absensi karyawan', 'Rekap payroll'],
    Visual: StaffMock,
  },
  {
    key: 'print',
    tab: 'Cetak Struk',
    icon: PrinterIcon,
    title: 'Cetak struk dari perangkat apa pun',
    description:
      'Struk, invoice, dan surat jalan bisa dicetak dari Android, iPhone/iPad, maupun komputer kasir, dengan printer thermal yang sudah Anda punya.',
    points: ['Printer thermal Bluetooth di Android', 'AirPrint untuk iOS', 'Invoice PDF & surat jalan'],
    Visual: ReceiptMock,
  },
];

const AUTOPLAY_MS = 7000;

export default function FeatureShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const feature = FEATURES[index];

  const tabsRef = useRef<HTMLDivElement>(null);

  // Keep the active tab visible in the horizontally scrolling tab bar (mobile)
  // without scrolling the page vertically.
  useEffect(() => {
    const container = tabsRef.current;
    const tab = container?.querySelectorAll<HTMLElement>('[role="tab"]')[index];
    if (!container || !tab) return;
    const left = tab.offsetLeft - (container.clientWidth - tab.offsetWidth) / 2;
    container.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [index, reduceMotion]);

  const go = (next: number) => setIndex((next + FEATURES.length) % FEATURES.length);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const id = setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [index, paused, reduceMotion]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Tabs */}
      <div ref={tabsRef} className="relative -mx-4 mb-10 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <div role="tablist" className="mx-auto flex w-max gap-2 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-sm">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const active = i === index;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setIndex(i);
                  setPaused(true);
                }}
                className={`relative flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active ? 'text-white' : 'text-stone-600 hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="feature-tab"
                    className="absolute inset-0 rounded-xl bg-ink"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                <Icon className="relative h-4 w-4" />
                <span className="relative">{f.tab}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slide */}
      <div className="relative overflow-hidden rounded-[2rem] border border-stone-200 bg-gradient-to-br from-white to-cream p-6 sm:p-10 lg:p-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={feature.key}
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="grid items-center gap-10 lg:grid-cols-2"
          >
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <feature.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                {feature.title}
              </h3>
              <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">{feature.description}</p>
              <ul className="mt-6 space-y-3">
                {feature.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-stone-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mx-auto w-full max-w-md">
              <feature.Visual />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="mt-10 flex items-center justify-between gap-4">
          <div className="flex gap-1.5 sm:gap-2">
            {FEATURES.map((f, i) => (
              <button
                key={f.key}
                aria-label={`Tampilkan fitur ${f.tab}`}
                onClick={() => setIndex(i)}
                className="relative h-1.5 w-5 overflow-hidden rounded-full bg-stone-200 sm:w-8"
              >
                {i < index && <span className="absolute inset-0 bg-ink" />}
                {i === index && (
                  <motion.span
                    key={`${f.key}-${paused}`}
                    className="absolute inset-y-0 left-0 bg-ink"
                    initial={{ width: paused || reduceMotion ? '100%' : '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: paused || reduceMotion ? 0 : AUTOPLAY_MS / 1000, ease: 'linear' }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              aria-label="Fitur sebelumnya"
              onClick={() => go(index - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-ink transition hover:bg-stone-50"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              aria-label="Fitur berikutnya"
              onClick={() => go(index + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white transition hover:bg-ink/90"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
