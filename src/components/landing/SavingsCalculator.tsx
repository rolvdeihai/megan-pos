'use client';

import { useMemo, useState } from 'react';
import { ClockIcon, BanknotesIcon, ShieldCheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

// Assumptions behind the estimate. They're shown to visitors under the result so
// the number is transparent; tune them here if you gather real customer data.
const DAYS_PER_MONTH = 26;
const WORK_HOURS_PER_MONTH = 173;
const TIME_REDUCTION = 0.6; // share of per-transaction recording time a POS removes
const MANUAL_RECAP_MIN_PER_DAY = 40; // end-of-day manual bookkeeping
const POS_RECAP_MIN_PER_DAY = 5;
const LEAKAGE_PREVENTED = 0.5; // share of cash/stock discrepancies prevented by automatic records
const PLAN_PRICE = 500_000; // Pro plan per month

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const compactRupiah = (n: number) =>
  n >= 1_000_000 ? `Rp ${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : rupiah(n);

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-stone-600">{label}</span>
        <span className="font-display text-base font-bold text-ink tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full accent-brand"
        style={{ background: `linear-gradient(to right, #F2544B ${pct}%, #E7E5E4 ${pct}%)` }}
      />
    </label>
  );
}

export default function SavingsCalculator() {
  const [trxPerDay, setTrxPerDay] = useState(80);
  const [avgTicket, setAvgTicket] = useState(45_000);
  const [manualMinutes, setManualMinutes] = useState(3);
  const [salary, setSalary] = useState(3_500_000);
  const [leakagePct, setLeakagePct] = useState(1.5);

  const result = useMemo(() => {
    const perTrxSaved = manualMinutes * TIME_REDUCTION;
    const minutesSavedPerDay = trxPerDay * perTrxSaved + (MANUAL_RECAP_MIN_PER_DAY - POS_RECAP_MIN_PER_DAY);
    const hoursSaved = (minutesSavedPerDay * DAYS_PER_MONTH) / 60;
    const timeValue = hoursSaved * (salary / WORK_HOURS_PER_MONTH);

    const monthlyRevenue = trxPerDay * avgTicket * DAYS_PER_MONTH;
    const leakageSaved = monthlyRevenue * (leakagePct / 100) * LEAKAGE_PREVENTED;

    const gross = timeValue + leakageSaved;
    const net = gross - PLAN_PRICE;

    const manualMinutesMonth = (trxPerDay * manualMinutes + MANUAL_RECAP_MIN_PER_DAY) * DAYS_PER_MONTH;
    const posMinutesMonth = manualMinutesMonth - minutesSavedPerDay * DAYS_PER_MONTH;

    return {
      hoursSaved,
      timeValue,
      leakageSaved,
      gross,
      net,
      roi: gross / PLAN_PRICE,
      manualHours: manualMinutesMonth / 60,
      posHours: posMinutesMonth / 60,
    };
  }, [trxPerDay, avgTicket, manualMinutes, salary, leakagePct]);

  const posShare = Math.max(4, (result.posHours / result.manualHours) * 100);

  return (
    <div className="grid overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_30px_80px_-40px_rgba(31,26,23,0.35)] lg:grid-cols-[1fr_1.05fr]">
      {/* Inputs */}
      <div className="space-y-7 p-6 sm:p-10">
        <div>
          <p className="font-display text-lg font-bold text-ink">Gambaran bisnis Anda</p>
          <p className="mt-1 text-sm text-stone-500">Geser untuk menyesuaikan dengan kondisi restoran Anda.</p>
        </div>
        <Slider label="Transaksi per hari" value={trxPerDay} onChange={setTrxPerDay} min={10} max={500} step={10} format={(v) => `${v}`} />
        <Slider
          label="Rata-rata nilai transaksi"
          value={avgTicket}
          onChange={setAvgTicket}
          min={10_000}
          max={300_000}
          step={5_000}
          format={compactRupiah}
        />
        <Slider
          label="Waktu catat manual per transaksi"
          value={manualMinutes}
          onChange={setManualMinutes}
          min={1}
          max={10}
          step={0.5}
          format={(v) => `${v.toLocaleString('id-ID')} menit`}
        />
        <Slider label="Gaji kasir per bulan" value={salary} onChange={setSalary} min={1_500_000} max={10_000_000} step={250_000} format={compactRupiah} />
        <Slider
          label="Selisih kas & stok saat ini"
          value={leakagePct}
          onChange={setLeakagePct}
          min={0}
          max={5}
          step={0.5}
          format={(v) => `${v.toLocaleString('id-ID')}% omzet`}
        />
      </div>

      {/* Results */}
      <div className="relative overflow-hidden bg-ink p-6 text-white sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative">
          <p className="text-sm font-medium text-white/60">Estimasi penghematan per bulan</p>
          <p className="mt-2 font-display text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">
            {rupiah(Math.max(0, result.gross))}
          </p>
          <p className="mt-2 text-sm text-white/70">
            {result.net > 0 ? (
              <>
                Setelah biaya paket Pro, Anda tetap untung{' '}
                <span className="font-semibold text-emerald-300">{rupiah(result.net)}</span>, atau{' '}
                <span className="font-semibold text-emerald-300">{result.roi.toLocaleString('id-ID', { maximumFractionDigits: 1 })}×</span>{' '}
                biaya langganan.
              </>
            ) : (
              <>Pada volume ini, penghematan belum menutupi biaya paket Pro. Tambah transaksi atau ubah asumsi untuk melihat perbedaannya.</>
            )}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: ClockIcon, label: 'Waktu kembali', value: `${Math.round(result.hoursSaved)} jam` },
              { icon: BanknotesIcon, label: 'Nilai waktu staf', value: compactRupiah(result.timeValue) },
              { icon: ShieldCheckIcon, label: 'Selisih dicegah', value: compactRupiah(result.leakageSaved) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                <s.icon className="h-5 w-5 text-brand-2" />
                <p className="mt-3 text-xs text-white/60">{s.label}</p>
                <p className="font-display text-lg font-bold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            <p className="text-sm font-semibold text-white/80">Jam kerja administrasi per bulan</p>
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-white/60">
                <span>Manual (kertas / kalkulator)</span>
                <span className="tabular-nums">{Math.round(result.manualHours)} jam</span>
              </div>
              <div className="h-3 rounded-full bg-white/10">
                <div className="h-3 rounded-full bg-white/40" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-white/60">
                <span>Dengan JetNote Pos</span>
                <span className="tabular-nums">{Math.round(result.posHours)} jam</span>
              </div>
              <div className="h-3 rounded-full bg-white/10">
                <div className="h-3 rounded-full bg-gradient-to-r from-brand to-brand-2 transition-all duration-300" style={{ width: `${posShare}%` }} />
              </div>
            </div>
          </div>

          <details className="mt-8 rounded-xl bg-white/[0.04] p-4 text-xs text-white/60 ring-1 ring-white/10">
            <summary className="flex cursor-pointer items-center gap-2 font-medium text-white/80">
              <InformationCircleIcon className="h-4 w-4" />
              Bagaimana angka ini dihitung?
            </summary>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>{DAYS_PER_MONTH} hari operasional per bulan, {WORK_HOURS_PER_MONTH} jam kerja per bulan.</li>
              <li>Pencatatan otomatis memangkas sekitar {TIME_REDUCTION * 100}% waktu per transaksi.</li>
              <li>
                Rekap harian manual ±{MANUAL_RECAP_MIN_PER_DAY} menit menjadi ±{POS_RECAP_MIN_PER_DAY} menit karena laporan tersusun otomatis.
              </li>
              <li>Sekitar {LEAKAGE_PREVENTED * 100}% selisih kas & stok dapat dicegah dengan pencatatan real-time.</li>
              <li>Dibandingkan dengan paket Pro {rupiah(PLAN_PRICE)}/bulan. Hasil sebenarnya bergantung pada operasional masing-masing.</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
