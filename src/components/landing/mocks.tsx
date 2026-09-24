// Illustrative UI mockups for the landing page, built from plain markup so they
// stay crisp at any size and don't depend on screenshots going stale.

const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

function Frame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white shadow-[0_24px_60px_-20px_rgba(31,26,23,0.25)] ${className}`}>
      {children}
    </div>
  );
}

export function DashboardMock() {
  const bars = [38, 52, 44, 68, 60, 84, 72];
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  return (
    <Frame className="overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-stone-100 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
        <span className="ml-3 text-xs font-medium text-stone-400">Dashboard · Hari ini</span>
      </div>
      <div className="grid grid-cols-[3.25rem_1fr]">
        <div className="flex flex-col items-center gap-3 border-r border-stone-100 py-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-7 w-7 rounded-lg ${i === 0 ? 'bg-brand' : 'bg-stone-100'}`} />
          ))}
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pendapatan', value: 'Rp 4,8 jt', delta: '+12%' },
              { label: 'Order', value: '126', delta: '+8%' },
              { label: 'Rata-rata', value: 'Rp 38 rb', delta: '+3%' },
            ].map((k) => (
              <div key={k.label} className="rounded-xl bg-stone-50 p-3">
                <p className="text-[10px] font-medium text-stone-500">{k.label}</p>
                <p className="mt-1 text-sm font-bold text-ink">{k.value}</p>
                <p className="text-[10px] font-semibold text-emerald-600">{k.delta}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-stone-100 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-ink">Penjualan minggu ini</p>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">Mingguan</span>
            </div>
            <div className="flex h-24 items-end gap-2">
              {bars.map((h, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-md ${i === 5 ? 'bg-brand' : 'bg-brand/25'}`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-stone-400">{days[i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {[
              { id: '#1042', type: 'Dine In · Meja 4', status: 'Diproses', tone: 'bg-amber-100 text-amber-700' },
              { id: '#1041', type: 'Delivery', status: 'Dikirim', tone: 'bg-sky-100 text-sky-700' },
            ].map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-ink">{o.id}</p>
                  <p className="text-[10px] text-stone-500">{o.type}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${o.tone}`}>{o.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function OrdersMock() {
  const orders = [
    { id: '#2081', type: 'Dine In', meta: 'Meja 7 · 3 item', total: 186000, tone: 'bg-brand-soft text-brand' },
    { id: '#2080', type: 'Takeaway', meta: 'a.n. Rina · 2 item', total: 74000, tone: 'bg-orange-100 text-orange-700' },
    { id: '#2079', type: 'Delivery', meta: 'Jl. Melati 12 · 4 item', total: 212000, tone: 'bg-sky-100 text-sky-700' },
  ];
  return (
    <Frame className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold text-ink">Order aktif</p>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">3 berjalan</span>
      </div>
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between rounded-xl border border-stone-100 p-3">
            <div className="flex items-center gap-3">
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${o.tone}`}>{o.type}</span>
              <div>
                <p className="text-sm font-semibold text-ink">{o.id}</p>
                <p className="text-xs text-stone-500">{o.meta}</p>
              </div>
            </div>
            <p className="text-sm font-bold text-ink">{rp(o.total)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'].map((t, i) => (
          <div
            key={t}
            className={`rounded-lg py-2 text-center text-xs font-semibold ${
              [1, 3, 6].includes(i) ? 'bg-brand text-white' : 'bg-stone-100 text-stone-500'
            }`}
          >
            {t}
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function InventoryMock() {
  const items = [
    { name: 'Beras', level: 72, unit: '18 kg' },
    { name: 'Ayam fillet', level: 34, unit: '6 kg' },
    { name: 'Susu segar', level: 12, unit: '1,5 L', low: true },
    { name: 'Kopi arabika', level: 58, unit: '2,3 kg' },
  ];
  return (
    <Frame className="p-5">
      <p className="mb-4 font-semibold text-ink">Stok bahan baku</p>
      <div className="space-y-4">
        {items.map((it) => (
          <div key={it.name}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-medium text-ink">{it.name}</span>
              <span className={it.low ? 'font-semibold text-brand' : 'text-stone-500'}>{it.unit}</span>
            </div>
            <div className="h-2 rounded-full bg-stone-100">
              <div
                className={`h-2 rounded-full ${it.low ? 'bg-brand' : 'bg-emerald-500'}`}
                style={{ width: `${it.level}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl bg-brand-soft p-3 text-xs text-brand">
        <span className="font-semibold">Stok menipis:</span> Susu segar. Menu “Latte” otomatis ditandai habis.
      </div>
    </Frame>
  );
}

export function OnlineMenuMock() {
  return (
    <div className="flex items-end justify-center gap-5">
      <div className="w-52 rounded-[2rem] border-[6px] border-ink bg-white p-3 shadow-[0_24px_60px_-20px_rgba(31,26,23,0.35)]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-stone-200" />
        <div className="mb-3 rounded-xl bg-gradient-to-br from-brand to-brand-2 p-3 text-white">
          <p className="text-[10px] opacity-80">Selamat datang di</p>
          <p className="text-sm font-bold">Kedai Anda</p>
        </div>
        <div className="mb-2 flex gap-1.5">
          {['Semua', 'Makanan', 'Minuman'].map((c, i) => (
            <span
              key={c}
              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${i === 0 ? 'bg-ink text-white' : 'bg-stone-100 text-stone-500'}`}
            >
              {c}
            </span>
          ))}
        </div>
        {[
          ['Nasi Goreng Spesial', 32000],
          ['Mie Ayam Bakso', 28000],
          ['Es Kopi Susu', 22000],
        ].map(([n, p]) => (
          <div key={n as string} className="flex items-center gap-2 border-b border-stone-100 py-2 last:border-0">
            <span className="h-8 w-8 shrink-0 rounded-lg bg-orange-100" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold text-ink">{n}</p>
              <p className="text-[9px] text-stone-500">{rp(p as number)}</p>
            </div>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">+</span>
          </div>
        ))}
      </div>
      <Frame className="hidden w-36 p-4 text-center sm:block">
        <div className="mx-auto grid h-24 w-24 grid-cols-5 gap-0.5 rounded-lg bg-white p-1.5">
          {Array.from({ length: 25 }).map((_, i) => (
            <span key={i} className={`rounded-[2px] ${[0, 1, 2, 5, 7, 10, 11, 12, 4, 9, 14, 20, 21, 22, 15, 17, 24, 13, 18].includes(i) ? 'bg-ink' : 'bg-transparent'}`} />
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold text-ink">Scan untuk pesan</p>
        <p className="text-[10px] text-stone-500">QR di setiap meja</p>
      </Frame>
    </div>
  );
}

export function ReportsMock() {
  const points = [30, 42, 38, 55, 50, 66, 62, 78, 74, 88];
  const w = 280;
  const h = 110;
  const step = w / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${i * step},${h - (p / 100) * h}`).join(' ');
  return (
    <Frame className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold text-ink">Laporan pendapatan</p>
        <div className="flex rounded-lg bg-stone-100 p-0.5 text-[11px] font-semibold">
          {['Harian', 'Mingguan', 'Bulanan'].map((t, i) => (
            <span key={t} className={`rounded-md px-2 py-1 ${i === 2 ? 'bg-white text-ink shadow-sm' : 'text-stone-500'}`}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h + 4}`} className="h-32 w-full" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#F2544B" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F2544B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#rev)" />
        <path d={path} fill="none" stroke="#F2544B" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[
          ['Omzet', 'Rp 128 jt'],
          ['HPP', 'Rp 51 jt'],
          ['Laba kotor', 'Rp 77 jt'],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-stone-50 p-2">
            <p className="text-[10px] text-stone-500">{l}</p>
            <p className="text-sm font-bold text-ink">{v}</p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function StaffMock() {
  const staff = [
    { name: 'Dewi', role: 'Kasir', in: '08:02', color: 'bg-brand-soft text-brand' },
    { name: 'Rizky', role: 'Dapur', in: '07:55', color: 'bg-orange-100 text-orange-700' },
    { name: 'Putra', role: 'Pelayan', in: '08:10', color: 'bg-sky-100 text-sky-700' },
    { name: 'Maya', role: 'Admin', in: '—', color: 'bg-violet-100 text-violet-700' },
  ];
  return (
    <Frame className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold text-ink">Karyawan & absensi</p>
        <span className="text-xs text-stone-500">Shift pagi</span>
      </div>
      <div className="space-y-2.5">
        {staff.map((s) => (
          <div key={s.name} className="flex items-center justify-between rounded-xl border border-stone-100 p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-sm font-bold text-ink">
                {s.name[0]}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{s.name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.color}`}>{s.role}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-stone-500">Masuk</p>
              <p className={`text-sm font-semibold ${s.in === '—' ? 'text-stone-400' : 'text-ink'}`}>{s.in}</p>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function ReceiptMock() {
  return (
    <div className="flex items-center justify-center gap-6">
      <div className="w-56 bg-white px-5 pb-6 pt-5 font-mono text-[11px] text-ink shadow-[0_24px_60px_-20px_rgba(31,26,23,0.3)] [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),95%_100%,90%_calc(100%-8px),85%_100%,80%_calc(100%-8px),75%_100%,70%_calc(100%-8px),65%_100%,60%_calc(100%-8px),55%_100%,50%_calc(100%-8px),45%_100%,40%_calc(100%-8px),35%_100%,30%_calc(100%-8px),25%_100%,20%_calc(100%-8px),15%_100%,10%_calc(100%-8px),5%_100%,0_calc(100%-8px))]">
        <p className="text-center font-bold">KEDAI ANDA</p>
        <p className="text-center text-[10px] text-stone-500">Order #2081 · Meja 7</p>
        <div className="my-2 border-t border-dashed border-stone-300" />
        {[
          ['2x Nasi Goreng', 64000],
          ['1x Ayam Bakar', 45000],
          ['3x Es Teh', 24000],
        ].map(([n, p]) => (
          <div key={n as string} className="flex justify-between">
            <span>{n}</span>
            <span>{(p as number).toLocaleString('id-ID')}</span>
          </div>
        ))}
        <div className="my-2 border-t border-dashed border-stone-300" />
        <div className="flex justify-between"><span>Pajak 10%</span><span>13.300</span></div>
        <div className="flex justify-between font-bold"><span>TOTAL</span><span>146.300</span></div>
        <div className="my-2 border-t border-dashed border-stone-300" />
        <p className="text-center text-[10px] text-stone-500">Terima kasih!</p>
      </div>
      <div className="hidden flex-col gap-2 sm:flex">
        {['Printer Bluetooth', 'AirPrint (iOS)', 'Printer USB/LAN', 'Surat jalan'].map((t) => (
          <span key={t} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-sm">
            ✓ {t}
          </span>
        ))}
      </div>
    </div>
  );
}
