// src/app/[slug]/staff-login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function StaffLoginPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();

  const [employees, setEmployees] = useState<{ id: string, full_name: string, role: string }[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`/api/staff/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.employees || []);
        }
      } catch (err) {
        console.error('Failed to fetch employees', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [slug]);

  const handleSelectEmployee = async (employeeId: string) => {
    setLoggingIn(employeeId);
    setError(false);

    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, employeeId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await new Promise(resolve => setTimeout(resolve, 100));
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(true);
        setLoggingIn(null);
      }
    } catch (error) {
      setError(true);
      setLoggingIn(null);
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
          <p className="text-slate-500 mt-2">Pilih nama Anda untuk masuk</p>
          <p className="text-xs text-indigo-600 font-semibold mt-1 uppercase tracking-wider">{slug}</p>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-slate-500 text-sm">Memuat daftar karyawan...</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {employees.length === 0 ? (
              <p className="py-8 text-slate-400">Tidak ada karyawan aktif.</p>
            ) : (
              employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleSelectEmployee(emp.id)}
                  disabled={loggingIn !== null}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between hover:border-indigo-500 hover:bg-indigo-50/50 group ${loggingIn === emp.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white'
                    }`}
                >
                  <div>
                    <p className="font-bold text-slate-900">{emp.full_name}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-tight">{emp.role}</p>
                  </div>
                  {loggingIn === emp.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-100 text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <span className="text-xl">→</span>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm font-medium mt-4">
            Gagal masuk. Silakan coba lagi.
          </p>
        )}

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
