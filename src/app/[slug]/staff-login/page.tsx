// src/app/[slug]/staff-login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function StaffLoginPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();
  
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;

    setLoading(true);
    setError(false);

    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, pin }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Login berhasil, langsung redirect ke dashboard
        // Cookie sudah diset oleh API route
        window.location.href = '/dashboard';
      } else {
        setError(true);
        setPin('');
        setLoading(false);
      }
    } catch (error) {
      setError(true);
      setPin('');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-100 flex items-center justify-center p-4 overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl"></div>

      <div className="relative bg-white/90 backdrop-blur p-8 rounded-3xl shadow-xl w-full max-w-md text-center border border-white/60">
        <div className="mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            <span className="text-3xl">👨‍🍳</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Login</h1>
          <p className="text-slate-500 mt-2">Masukkan 4 digit PIN Anda</p>
          <p className="text-xs text-indigo-600 font-semibold mt-1 uppercase tracking-wider">{slug}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                type="password"
                maxLength={1}
                inputMode="numeric"
                autoFocus={index === 0}
                className={`w-16 h-20 text-3xl text-center border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  error ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white'
                }`}
                value={pin[index] || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!/^\d*$/.test(val)) return;
                  
                  const newPin = pin.split('');
                  newPin[index] = val;
                  setPin(newPin.join(''));
                  
                  if (val && index < 3) {
                    (e.target.nextElementSibling as HTMLInputElement)?.focus();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !pin[index] && index > 0) {
                    const target = e.target as HTMLInputElement;
                    (target.previousElementSibling as HTMLInputElement)?.focus();
                  }
                }}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium">
              PIN salah atau karyawan tidak aktif
            </p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20"
          >
            {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
          </button>
        </form>
        
        <div className="mt-6">
            <button 
                onClick={() => router.push(`/${slug}`)}
                className="text-sm text-slate-400 hover:text-slate-600"
            >
                &larr; Kembali ke Menu
            </button>
        </div>
      </div>
    </div>
  );
}
