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

type User = {
  id: string;
  email: string;
  full_name: string;
  restaurant_name: string;
  restaurant_slug?: string;
  role?: string;
  is_staff?: boolean;
  user_type: 'owner' | 'staff';
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

  const isStaff = user.is_staff || user.user_type === 'staff';

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Selamat Datang, {user.full_name || 'Admin'}!
            </h1>
            <p className="mt-2 text-gray-600">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          {isStaff && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              👨‍🍳 {user.role?.toUpperCase() || 'STAFF'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pendapatan</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Order</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {stats.totalOrders}
              </p>
            </div>
            <ShoppingBagIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Meja Aktif</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {stats.activeTables}
              </p>
            </div>
            <UsersIcon className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hari Ini</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats.todayRevenue)}
              </p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Buat Order - Tampilkan untuk semua */}
          <a href="/dashboard/orders" className="text-center p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <div className="text-blue-600 font-semibold">Buat Order</div>
          </a>
          
          {/* Kelola Menu - Tampilkan untuk owner atau staff dengan role tertentu */}
          {(!isStaff || (user.role === 'manager' || user.role === 'admin')) && (
            <a href="/dashboard/menu" className="text-center p-4 border rounded-lg hover:bg-green-50 hover:border-green-200 transition-colors">
              <div className="text-green-600 font-semibold">Kelola Menu</div>
            </a>
          )}
          
          {/* Kelola Meja - Tampilkan untuk owner atau staff dengan role tertentu */}
          {(!isStaff || (user.role === 'manager' || user.role === 'admin')) && (
            <a href="/dashboard/tables" className="text-center p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-colors">
              <div className="text-purple-600 font-semibold">Kelola Meja</div>
            </a>
          )}
          
          {/* Transaksi - Tampilkan untuk semua */}
          <a href="/dashboard/transactions" className="text-center p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-colors">
            <div className="text-orange-600 font-semibold">Transaksi</div>
          </a>

          {/* Orderan Online - Tampilkan untuk semua */}
          <a href="/dashboard/public-orders" className="text-center p-4 border rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
            <div className="text-indigo-600 font-semibold">Orderan Online</div>
          </a>

          {/* Pegawai - Hanya untuk owner */}
          {!isStaff && (
            <a href="/dashboard/employees" className="text-center p-4 border rounded-lg hover:bg-rose-50 hover:border-rose-200 transition-colors">
              <div className="text-rose-600 font-semibold">Pegawai</div>
            </a>
          )}

          {/* Billing - Hanya untuk owner */}
          {!isStaff && (
            <a href="/dashboard/billing" className="text-center p-4 border rounded-lg hover:bg-amber-50 hover:border-amber-200 transition-colors">
              <div className="text-amber-600 font-semibold">Billing</div>
            </a>
          )}

          {/* Pengaturan - Hanya untuk owner */}
          {!isStaff && (
            <a href="/dashboard/settings" className="text-center p-4 border rounded-lg hover:bg-slate-50 hover:border-slate-200 transition-colors">
              <div className="text-slate-600 font-semibold">Pengaturan</div>
            </a>
          )}

          {/* Logout Button untuk Staff */}
          {isStaff && (
            <button 
              onClick={async () => {
                await fetch('/api/staff/logout', { method: 'POST' });
                window.location.href = `/${user.restaurant_slug}`;
              }}
              className="text-center p-4 border rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
            >
              <div className="text-red-600 font-semibold">Logout Staff</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}