'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRightIcon,
  Bars3Icon,
  XMarkIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  BoltIcon,
  DevicePhoneMobileIcon,
  CloudIcon,
  ShieldCheckIcon,
  XCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { useAuth } from '@/components/auth/AuthProvider';
import { DashboardMock } from './mocks';
import FeatureShowcase from './FeatureShowcase';
import SavingsCalculator from './SavingsCalculator';

const NAV_LINKS = [
  { href: '#fitur', label: 'Fitur' },
  { href: '#hemat', label: 'Hitung Hemat' },
  { href: '#harga', label: 'Harga' },
  { href: '#testimoni', label: 'Testimoni' },
  { href: '#tentang', label: 'Tentang' },
  { href: '#faq', label: 'FAQ' },
];

const BUSINESS_TYPES = ['Restoran', 'Kafe & Coffee Shop', 'Warung Makan', 'Bakery', 'Food Truck', 'Cloud Kitchen', 'Katering'];

const COMPARISON = [
  { topic: 'Mencatat order', manual: 'Tulis tangan, rawan salah baca', pos: 'Langsung masuk ke dapur & kasir' },
  { topic: 'Stok bahan baku', manual: 'Dihitung manual di akhir hari', pos: 'Terpotong otomatis setiap order' },
  { topic: 'Rekap pendapatan', manual: 'Kalkulator & buku kas', pos: 'Laporan harian–bulanan otomatis' },
  { topic: 'Pesanan online', manual: 'Chat satu per satu', pos: 'Menu online & QR meja' },
  { topic: 'Absensi & gaji', manual: 'Buku absen terpisah', pos: 'Tercatat di satu dashboard' },
  { topic: 'Cetak struk', manual: 'Nota tulis tangan', pos: 'Printer thermal, PDF, AirPrint' },
];

// TODO: replace with real customer testimonials (with their permission) before promoting the page.
const TESTIMONIALS = [
  {
    name: 'Budi Santoso',
    role: 'Owner Warung Makan Sederhana',
    content:
      'Setelah pakai JetNote Pos, operasional restoran saya jadi lebih efisien. Order online dari pelanggan langsung masuk ke sistem, tidak perlu telpon lagi.',
  },
  {
    name: 'Sari Wijaya',
    role: 'Manager Cafe Aroma',
    content:
      'Laporan penjualan yang detail membantu saya mengambil keputusan bisnis yang lebih baik. Fitur inventorynya sangat membantu mengurangi waste.',
  },
  {
    name: 'Andi Pratama',
    role: 'Pemilik Restoran Padang',
    content:
      'Website otomatis untuk menu online sangat membantu. Pelanggan bisa pesan langsung, staf kami fokus melayani di tempat.',
  },
];

const PLANS = [
  {
    name: 'Basic',
    price: '300K',
    tagline: 'Untuk usaha yang baru mulai',
    features: ['Maks. 100 transaksi/bulan', '1 admin user', 'Manajemen menu', 'Website menu online', 'Laporan dasar', 'Email support'],
    recommended: false,
  },
  {
    name: 'Pro',
    price: '500K',
    tagline: 'Untuk restoran yang sedang tumbuh',
    features: ['Transaksi tanpa batas', '3 staff users', 'Manajemen inventori', 'Laporan lengkap', 'Analitik penjualan', 'Priority support'],
    recommended: true,
  },
  {
    name: 'Corporate',
    price: '800K',
    tagline: 'Untuk bisnis dengan tim besar',
    features: ['Transaksi tanpa batas', '10 staff users', 'Semua fitur Pro', 'API access', 'Custom development', 'Support 24/7'],
    recommended: false,
  },
];

const FAQS = [
  {
    q: 'Perangkat apa saja yang bisa dipakai?',
    a: 'JetNote Pos berjalan di browser komputer, tablet, dan HP. Tersedia juga aplikasi Android, dan di iPhone/iPad Anda bisa memasangnya ke layar utama langsung dari Safari.',
  },
  {
    q: 'Apakah perlu koneksi internet?',
    a: 'Ya. Data disimpan di cloud agar dashboard, kasir, dan dapur selalu sinkron. Koneksi internet yang stabil diperlukan selama operasional.',
  },
  {
    q: 'Printer apa yang didukung?',
    a: 'Printer thermal Bluetooth dari aplikasi Android, AirPrint dari iPhone/iPad, serta printer yang terhubung ke komputer kasir. Struk, invoice PDF, dan surat jalan bisa dicetak.',
  },
  {
    q: 'Metode pembayaran apa yang bisa dicatat?',
    a: 'Tunai, QRIS, kartu debit/kredit, dan transfer bank. Semua tercatat dan masuk ke laporan keuangan secara otomatis.',
  },
  {
    q: 'Apakah bisa menambah karyawan dengan akses berbeda?',
    a: 'Bisa. Setiap karyawan mendapat login sendiri dengan role seperti admin, kasir, dapur, atau pelayan, sehingga hanya melihat menu yang relevan untuk tugasnya.',
  },
  {
    q: 'Bagaimana cara memilih atau mengganti paket?',
    a: 'Paket bisa dipilih dan diubah dari menu Billing di dashboard. Biaya langganan dihitung per bulan.',
  },
];

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({ eyebrow, title, subtitle, light = false }: { eyebrow: string; title: string; subtitle?: string; light?: boolean }) {
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
      <span className={`text-sm font-bold uppercase tracking-[0.14em] ${light ? 'text-brand-2' : 'text-brand'}`}>{eyebrow}</span>
      <h2 className={`mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1] ${light ? 'text-white' : 'text-ink'}`}>
        {title}
      </h2>
      {subtitle && <p className={`mt-4 text-lg ${light ? 'text-white/70' : 'text-stone-600'}`}>{subtitle}</p>}
    </Reveal>
  );
}

function Navbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-all ${
        scrolled || open ? 'border-b border-stone-200/70 bg-cream/85 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/icon-source.png" alt="" className="h-8 w-8" />
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">JetNote Pos</span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-stone-600 transition hover:text-ink">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <Link href="/dashboard" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90">
              Buka Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 text-sm font-semibold text-ink hover:text-brand">
                Masuk
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(242,84,75,0.6)] transition hover:bg-brand/90"
              >
                Coba Gratis
              </Link>
            </>
          )}
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink lg:hidden"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden lg:hidden"
          >
            <div className="space-y-1 px-4 pb-6">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-stone-100"
                >
                  {l.label}
                </a>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-3">
                {user ? (
                  <Link href="/dashboard" className="col-span-2 rounded-full bg-ink py-3 text-center font-semibold text-white">
                    Buka Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="rounded-full border border-stone-300 py-3 text-center font-semibold text-ink">
                      Masuk
                    </Link>
                    <Link href="/register" className="rounded-full bg-brand py-3 text-center font-semibold text-white">
                      Coba Gratis
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-cream pb-20 pt-32 sm:pb-28 sm:pt-40">
      {/* Background texture */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(31,26,23,0.07)_1px,transparent_0)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute -right-40 top-10 h-[32rem] w-[32rem] rounded-full bg-brand/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-brand-2/15 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8">
        <div>
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-3.5 py-1.5 text-sm font-semibold text-brand shadow-sm"
          >
            <BoltIcon className="h-4 w-4" />
            Sistem kasir & manajemen restoran
          </motion.span>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-6 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]"
          >
            Restoran lebih rapi.{' '}
            <span className="relative whitespace-nowrap text-brand">
              Kerja lebih ringan.
              <svg viewBox="0 0 300 12" className="absolute -bottom-2 left-0 h-3 w-full text-brand-2" preserveAspectRatio="none" aria-hidden>
                <path d="M2 9c60-6 180-8 296-3" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-stone-600 sm:text-xl"
          >
            Order, stok, menu online, karyawan, dan laporan keuangan dalam satu aplikasi. Tanpa buku catatan, tanpa rekap
            manual di akhir hari.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-4 text-base font-semibold text-white shadow-[0_14px_30px_-10px_rgba(242,84,75,0.7)] transition hover:bg-brand/90"
            >
              Mulai Gratis 14 Hari
              <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#hemat"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-7 py-4 text-base font-semibold text-ink transition hover:border-stone-400"
            >
              Hitung penghematan Anda
            </a>
          </motion.div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-600">
            {['Tanpa kartu kredit', 'Setup dalam 5 menit', 'Web, Android & iOS'].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-emerald-600" strokeWidth={3} />
                {t}
              </span>
            ))}
          </div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 30, rotate: 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          className="relative mx-auto w-full max-w-xl"
        >
          <DashboardMock />
          <motion.div
            animate={reduce ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-8 right-4 hidden rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xl sm:block"
          >
            <p className="text-xs text-stone-500">Order baru · Meja 4</p>
            <p className="font-display text-sm font-bold text-ink">2× Nasi Goreng, 1× Es Teh</p>
          </motion.div>
          <motion.div
            animate={reduce ? undefined : { y: [0, 8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -bottom-6 -right-2 flex items-center gap-3 rounded-2xl bg-ink p-3.5 pr-5 text-white shadow-xl sm:-right-8"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <CheckCircleIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs text-white/60">Pembayaran QRIS</p>
              <p className="font-display text-sm font-bold">Rp 146.300 diterima</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Highlights() {
  const items = [
    { icon: BoltIcon, value: '3 tipe order', label: 'Dine-in, takeaway, delivery' },
    { icon: DevicePhoneMobileIcon, value: 'Web · Android · iOS', label: 'Pakai perangkat yang ada' },
    { icon: CloudIcon, value: 'Real-time', label: 'Kasir, dapur & owner sinkron' },
    { icon: ShieldCheckIcon, value: '14 hari', label: 'Coba gratis semua fitur' },
  ];
  return (
    <section className="border-y border-stone-200 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-stone-200 px-4 sm:px-6 lg:grid-cols-4 lg:divide-x lg:px-8">
        {items.map((it, i) => (
          <Reveal key={it.value} delay={i * 0.05} className="flex items-center gap-4 py-7 lg:justify-center lg:px-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <it.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-base font-extrabold text-ink sm:text-lg">{it.value}</p>
              <p className="text-xs text-stone-500 sm:text-sm">{it.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <div className="overflow-hidden border-t border-stone-100 py-5">
        <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-10 motion-reduce:animate-none">
          {[...BUSINESS_TYPES, ...BUSINESS_TYPES].map((b, i) => (
            <span key={i} className="flex items-center gap-10 whitespace-nowrap font-display text-lg font-bold text-stone-300">
              {b}
              <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] overflow-hidden rounded-3xl border border-stone-200 bg-white">
        <div className="grid grid-cols-[1fr_1.2fr_1.2fr] bg-stone-50 text-sm font-semibold">
          <div className="p-4 text-stone-500 sm:px-6">Aktivitas</div>
          <div className="p-4 text-stone-500 sm:px-6">Cara manual</div>
          <div className="bg-brand-soft p-4 text-brand sm:px-6">Dengan JetNote Pos</div>
        </div>
        {COMPARISON.map((row) => (
          <div key={row.topic} className="grid grid-cols-[1fr_1.2fr_1.2fr] border-t border-stone-100 text-sm">
            <div className="p-4 font-semibold text-ink sm:px-6">{row.topic}</div>
            <div className="flex items-start gap-2 p-4 text-stone-500 sm:px-6">
              <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
              {row.manual}
            </div>
            <div className="flex items-start gap-2 bg-brand-soft/40 p-4 font-medium text-ink sm:px-6">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {row.pos}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Testimonials() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  const t = TESTIMONIALS[i];
  const go = (n: number) => setI((n + TESTIMONIALS.length) % TESTIMONIALS.length);

  useEffect(() => {
    if (reduce) return;
    const id = setTimeout(() => go(i + 1), 8000);
    return () => clearTimeout(id);
  }, [i, reduce]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative rounded-[2rem] bg-white/[0.04] p-8 ring-1 ring-white/10 sm:p-14">
        <span className="absolute -top-6 left-8 font-display text-8xl leading-none text-brand sm:left-14" aria-hidden>
          “
        </span>
        <AnimatePresence mode="wait">
          <motion.figure
            key={i}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-6 flex gap-1 text-amber-400">
              {Array.from({ length: 5 }).map((_, s) => (
                <StarIcon key={s} className="h-5 w-5" />
              ))}
            </div>
            <blockquote className="font-display text-xl font-semibold leading-relaxed text-white sm:text-2xl">{t.content}</blockquote>
            <figcaption className="mt-8 flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 font-bold text-white">
                {t.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')}
              </span>
              <div>
                <p className="font-semibold text-white">{t.name}</p>
                <p className="text-sm text-white/60">{t.role}</p>
              </div>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          aria-label="Testimoni sebelumnya"
          onClick={() => go(i - 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          {TESTIMONIALS.map((_, n) => (
            <button
              key={n}
              aria-label={`Testimoni ${n + 1}`}
              onClick={() => setI(n)}
              className={`h-2 rounded-full transition-all ${n === i ? 'w-8 bg-brand' : 'w-2 bg-white/30'}`}
            />
          ))}
        </div>
        <button
          aria-label="Testimoni berikutnya"
          onClick={() => go(i + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function Pricing() {
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-center">
      {PLANS.map((plan, idx) => (
        <Reveal key={plan.name} delay={idx * 0.08}>
          <div
            className={`relative rounded-[2rem] p-8 sm:p-9 ${
              plan.recommended
                ? 'bg-ink text-white shadow-[0_30px_60px_-25px_rgba(31,26,23,0.6)] lg:-my-4 lg:py-12'
                : 'border border-stone-200 bg-white text-ink'
            }`}
          >
            {plan.recommended && (
              <span className="absolute -top-3.5 left-8 rounded-full bg-brand px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Paling populer
              </span>
            )}
            <h3 className="font-display text-xl font-extrabold">{plan.name}</h3>
            <p className={`mt-1 text-sm ${plan.recommended ? 'text-white/60' : 'text-stone-500'}`}>{plan.tagline}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-display text-5xl font-extrabold tracking-tight">Rp{plan.price}</span>
              <span className={plan.recommended ? 'text-white/60' : 'text-stone-500'}>/bulan</span>
            </div>
            <Link
              href="/register"
              className={`mt-8 block rounded-full py-3.5 text-center font-semibold transition ${
                plan.recommended ? 'bg-brand text-white hover:bg-brand/90' : 'border border-stone-300 text-ink hover:border-ink'
              }`}
            >
              {plan.recommended ? 'Mulai Sekarang' : 'Pilih Paket'}
            </Link>
            <ul className="mt-8 space-y-3.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <CheckIcon className={`h-4 w-4 shrink-0 ${plan.recommended ? 'text-brand-2' : 'text-emerald-600'}`} strokeWidth={3} />
                  <span className={plan.recommended ? 'text-white/85' : 'text-stone-700'}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

function About() {
  const values = [
    { title: 'Dibuat untuk operasional nyata', body: 'Alur order, meja, dan dapur dirancang dari kebutuhan restoran sehari-hari, bukan sekadar mesin kasir.' },
    { title: 'Sederhana untuk semua staf', body: 'Kasir baru bisa langsung pakai tanpa pelatihan panjang. Setiap role hanya melihat yang dibutuhkan.' },
    { title: 'Data yang bisa diolah', body: 'Setiap transaksi menjadi laporan yang siap dibaca, supaya keputusan bisnis berdasarkan angka, bukan tebakan.' },
  ];
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
      <Reveal>
        <span className="text-sm font-bold uppercase tracking-[0.14em] text-brand">Tentang kami</span>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
          Kami membantu restoran lokal bekerja lebih cerdas
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-stone-600">
          JetNote Pos lahir dari melihat langsung betapa banyak waktu pemilik restoran habis untuk mencatat, menghitung, dan
          merekap. Kami ingin waktu itu kembali ke hal yang lebih penting: melayani pelanggan dan mengembangkan usaha.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-stone-600">
          Satu aplikasi yang terjangkau, mudah dipakai, dan tumbuh bersama bisnis Anda, dari warung kecil hingga restoran dengan
          banyak karyawan.
        </p>
      </Reveal>
      <div className="space-y-4">
        {values.map((v, i) => (
          <Reveal key={v.title} delay={i * 0.08}>
            <div className="flex gap-5 rounded-3xl border border-stone-200 bg-white p-6">
              <span className="font-display text-3xl font-extrabold text-brand/30">0{i + 1}</span>
              <div>
                <h3 className="font-display text-lg font-bold text-ink">{v.title}</h3>
                <p className="mt-1.5 text-stone-600">{v.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl divide-y divide-stone-200 rounded-3xl border border-stone-200 bg-white">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left sm:px-8"
            >
              <span className="font-display text-base font-bold text-ink sm:text-lg">{f.q}</span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                  isOpen ? 'rotate-45 bg-brand text-white' : 'bg-stone-100 text-ink'
                }`}
              >
                <PlusIcon className="h-4 w-4" strokeWidth={2.5} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-6 leading-relaxed text-stone-600 sm:px-8">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:px-8">
      <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand to-brand-2 px-6 py-16 text-center sm:px-12 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Siap meninggalkan buku catatan?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85">
            Daftar sekarang dan restoran Anda bisa menerima order pertama lewat JetNote Pos hari ini juga.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 font-semibold text-ink transition hover:bg-white/90"
            >
              Mulai Gratis 14 Hari
              <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#harga"
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
            >
              Lihat harga
            </a>
          </div>
          <p className="mt-5 text-sm text-white/75">Tanpa kartu kredit · Setup dalam 5 menit</p>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/icon-source.png" alt="" className="h-8 w-8" />
            <span className="font-display text-lg font-extrabold text-ink">JetNote Pos</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone-500">
            Sistem kasir dan manajemen restoran modern untuk bisnis kuliner Indonesia.
          </p>
        </div>
        <div>
          <p className="font-display font-bold text-ink">Produk</p>
          <ul className="mt-4 space-y-2.5 text-sm text-stone-500">
            <li><a href="#fitur" className="hover:text-ink">Fitur</a></li>
            <li><a href="#hemat" className="hover:text-ink">Hitung penghematan</a></li>
            <li><a href="#harga" className="hover:text-ink">Harga</a></li>
            <li><a href="#faq" className="hover:text-ink">FAQ</a></li>
          </ul>
        </div>
        <div>
          <p className="font-display font-bold text-ink">Akun</p>
          <ul className="mt-4 space-y-2.5 text-sm text-stone-500">
            <li><Link href="/login" className="hover:text-ink">Masuk</Link></li>
            <li><Link href="/register" className="hover:text-ink">Daftar</Link></li>
            <li><a href="#tentang" className="hover:text-ink">Tentang kami</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-100 py-6 text-center text-sm text-stone-400">
        © {new Date().getFullYear()} JetNote Pos. All rights reserved.
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream font-sans text-ink antialiased">
      <Navbar />
      <main>
        <Hero />
        <Highlights />

        <section id="fitur" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Fitur"
              title="Semua yang restoran Anda butuhkan, dalam satu aplikasi"
              subtitle="Dari order pertama di pagi hari sampai laporan tutup kasir di malam hari."
            />
            <FeatureShowcase />
          </div>
        </section>

        <section id="hemat" className="scroll-mt-20 bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Hitung hemat"
              title="Berapa yang bisa Anda hemat setiap bulan?"
              subtitle="Bandingkan pencatatan manual dengan JetNote Pos berdasarkan kondisi restoran Anda."
            />
            <Reveal>
              <SavingsCalculator />
            </Reveal>
            <Reveal className="mt-16">
              <h3 className="mb-6 text-center font-display text-xl font-bold text-ink">Manual vs JetNote Pos</h3>
              <Comparison />
            </Reveal>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Cara mulai" title="Siap dipakai dalam 3 langkah" />
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { t: 'Daftar & isi profil', d: 'Buat akun, masukkan nama dan alamat restoran. Link menu online Anda langsung aktif.' },
                { t: 'Atur menu, meja & staf', d: 'Tambahkan menu dan harga, atur meja, lalu undang karyawan dengan role masing-masing.' },
                { t: 'Terima order', d: 'Mulai terima order dari kasir, QR meja, maupun menu online, dan pantau semuanya dari dashboard.' },
              ].map((s, i) => (
                <Reveal key={s.t} delay={i * 0.08}>
                  <div className="h-full rounded-3xl border border-stone-200 bg-white p-8">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink font-display text-lg font-extrabold text-white">
                      {i + 1}
                    </span>
                    <h3 className="mt-6 font-display text-xl font-bold text-ink">{s.t}</h3>
                    <p className="mt-2 leading-relaxed text-stone-600">{s.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="testimoni" className="scroll-mt-20 bg-ink px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <SectionHeading eyebrow="Testimoni" title="Kata mereka yang sudah beralih" light />
          <Testimonials />
        </section>

        <section id="harga" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Harga"
              title="Harga jelas, tanpa biaya tersembunyi"
              subtitle="Semua paket bisa dicoba gratis 14 hari."
            />
            <Pricing />
          </div>
        </section>

        <section id="tentang" className="scroll-mt-20 bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <About />
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <SectionHeading eyebrow="FAQ" title="Pertanyaan yang sering diajukan" />
          <Faq />
        </section>

        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
