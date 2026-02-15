// app/dashboard/layout.tsx

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
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Akan redirect di useEffect
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
