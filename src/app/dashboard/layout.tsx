'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { getRequiredPermissionForPath, hasPermission } from '@/lib/permissions';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-slate-400">Memuat...</p>
        </div>
      </div>
    );
  }

  const requiredPermission = getRequiredPermissionForPath(pathname);
  const permissions = user.permissions ?? (user.user_type === 'owner' ? ['*'] : []);
  const canAccess = requiredPermission
    ? hasPermission(permissions, requiredPermission)
    : true;

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar mode="dashboard" />
        <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="bg-white border border-slate-200/70 rounded-2xl p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">Akses dibatasi</h1>
            <p className="mt-2 text-sm text-slate-600">
              Akun Anda tidak memiliki izin untuk membuka halaman ini.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar mode="dashboard" />

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
