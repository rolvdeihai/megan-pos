// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  ShoppingBagIcon, 
  UsersIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { getUserRoleLabel } from '@/lib/navigation';

type User = {
  id: string;
  email: string;
  full_name: string;
  restaurant_name: string;
  restaurant_slug?: string;
  role?: string | null;
  role_name?: string | null;
  is_staff?: boolean;
  user_type: 'owner' | 'staff';
  permissions?: string[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeTables: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current user (owner or staff)
    fetch('/api/auth/current')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          // Tidak ada user, redirect ke login
          router.push('/login');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (user) {
      // Fetch data sederhana
      fetch('/api/dashboard/stats')
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(console.error);
    }
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const permissions = user.permissions ?? (user.user_type === 'owner' ? ['*'] : []);
  const roleLabel = getUserRoleLabel(user);

  const quickActions = [
    { label: 'Buat Order', href: '/dashboard/orders', color: 'text-primary', permission: PERMISSIONS.MANAGE_ORDERS },
    { label: 'Kelola Menu', href: '/dashboard/menu', color: 'text-emerald-600', permission: PERMISSIONS.MANAGE_MENU },
    { label: 'Kelola Meja', href: '/dashboard/tables', color: 'text-purple-600', permission: PERMISSIONS.MANAGE_ORDERS },
    { label: 'Transaksi', href: '/dashboard/transactions', color: 'text-orange-600', permission: PERMISSIONS.VIEW_REPORTS },
    { label: 'Orderan Online', href: '/dashboard/public-orders', color: 'text-indigo-600', permission: PERMISSIONS.MANAGE_ORDERS },
    { label: 'Pegawai', href: '/dashboard/employees', color: 'text-rose-600', permission: PERMISSIONS.MANAGE_STAFF },
    { label: 'Billing', href: '/dashboard/billing', color: 'text-amber-600', permission: PERMISSIONS.MANAGE_BILLING },
    { label: 'Pengaturan', href: '/dashboard/settings', color: 'text-slate-600', permission: PERMISSIONS.MANAGE_SETTINGS },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Ringkasan hari ini</p>
          <h1 className="text-3xl font-bold text-slate-900">
            Selamat datang, {user.full_name || 'Admin'}!
          </h1>
          <p className="mt-2 text-slate-600">
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="text-sm font-semibold text-slate-700">
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Pendapatan</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CurrencyDollarIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Order</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {stats.totalOrders}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShoppingBagIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Meja Aktif</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {stats.activeTables}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <UsersIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Hari Ini</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatCurrency(stats.todayRevenue)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <ChartBarIcon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Aksi Cepat</h2>
            <p className="text-sm text-slate-500">Akses fitur sesuai izin yang dimiliki</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions
            .filter((action) => hasPermission(permissions, action.permission))
            .map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="group text-center p-4 border border-slate-200/70 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-colors"
              >
                <div className={`font-semibold ${action.color} group-hover:opacity-90`}>
                  {action.label}
                </div>
              </a>
            ))}
        </div>
      </div>
    </div>
  );
}
