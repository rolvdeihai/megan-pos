// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  TableCellsIcon,
  ArrowTrendingUpIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  QueueListIcon,
  ChartBarIcon,
  UserGroupIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { getUserRoleLabel } from '@/lib/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import OrdersPage from './orders/page';

type DateRange = 'today' | '7days' | '30days' | 'thisMonth' | 'lastMonth';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeTables: 0,
    todayRevenue: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('thisMonth');
  const [autoOpenOrder, setAutoOpenOrder] = useState(false);

  // Helper: konversi pilihan range ke start_date & end_date (ISO string)
  const getDateRangeParams = (range: DateRange) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = new Date();
    end.setHours(23, 59, 59, 999);

    switch (range) {
      case 'today':
        start = new Date();
        start.setHours(0, 0, 0, 0);
        break;
      case '7days':
        start = new Date();
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case '30days':
        start = new Date();
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start = null;
        end = null;
    }
    return { startDate: start?.toISOString(), endDate: end?.toISOString() };
  };

  const fetchStats = async (range: DateRange) => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const { startDate, endDate } = getDateRangeParams(range);
      let url = '/api/dashboard/stats?';
      if (startDate) url += `start_date=${encodeURIComponent(startDate)}&`;
      if (endDate) url += `end_date=${encodeURIComponent(endDate)}`;
      const res = await fetch(url);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats(dateRange);
    }
  }, [user, dateRange]);

  // 🔹 Efek untuk menentukan auto-open berdasarkan user type
  useEffect(() => {
    if (user && user.user_type !== 'owner') {
      setAutoOpenOrder(true);
    }
  }, [user]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-36 bg-gradient-to-r from-slate-200 to-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-36 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  const permissions = user.permissions ?? (user.user_type === 'owner' ? ['*'] : []);
  const roleLabel = getUserRoleLabel(user);

  const statCards = [
    {
      label: 'Total Pendapatan',
      value: formatCurrency(stats.totalRevenue),
      icon: CurrencyDollarIcon,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
    },
    {
      label: 'Total Order',
      value: stats.totalOrders.toString(),
      icon: ShoppingBagIcon,
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/20',
    },
    {
      label: 'Meja Aktif',
      value: stats.activeTables.toString(),
      icon: TableCellsIcon,
      gradient: 'from-purple-500 to-violet-600',
      shadow: 'shadow-purple-500/20',
    },
    {
      label: 'Pendapatan Hari Ini',
      value: formatCurrency(stats.todayRevenue),
      icon: ArrowTrendingUpIcon,
      gradient: 'from-orange-500 to-rose-500',
      shadow: 'shadow-orange-500/20',
    },
  ];

  const quickActions = [
    { label: 'Buat Order', href: '/dashboard/orders', icon: PlusCircleIcon, color: 'text-blue-600', bg: 'bg-blue-50', bgHover: 'hover:bg-blue-100', ring: 'ring-blue-500/20', permission: PERMISSIONS.MANAGE_ORDERS },
    { label: 'Kelola Menu', href: '/dashboard/menu', icon: ClipboardDocumentListIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', bgHover: 'hover:bg-emerald-100', ring: 'ring-emerald-500/20', permission: PERMISSIONS.MANAGE_MENU },
    { label: 'Kelola Meja', href: '/dashboard/tables', icon: QueueListIcon, color: 'text-purple-600', bg: 'bg-purple-50', bgHover: 'hover:bg-purple-100', ring: 'ring-purple-500/20', permission: PERMISSIONS.MANAGE_ORDERS },
    { label: 'Transaksi', href: '/dashboard/transactions', icon: ChartBarIcon, color: 'text-orange-600', bg: 'bg-orange-50', bgHover: 'hover:bg-orange-100', ring: 'ring-orange-500/20', permission: PERMISSIONS.VIEW_REPORTS },
    { label: 'Orderan Online', href: '/dashboard/public-orders', icon: GlobeAltIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', bgHover: 'hover:bg-indigo-100', ring: 'ring-indigo-500/20', permission: PERMISSIONS.MANAGE_ORDERS },
    { label: 'Pegawai', href: '/dashboard/employees', icon: UserGroupIcon, color: 'text-rose-600', bg: 'bg-rose-50', bgHover: 'hover:bg-rose-100', ring: 'ring-rose-500/20', permission: PERMISSIONS.MANAGE_STAFF },
    { label: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon, color: 'text-amber-600', bg: 'bg-amber-50', bgHover: 'hover:bg-amber-100', ring: 'ring-amber-500/20', permission: PERMISSIONS.MANAGE_BILLING },
    { label: 'Pengaturan', href: '/dashboard/settings', icon: Cog6ToothIcon, color: 'text-slate-600', bg: 'bg-slate-100', bgHover: 'hover:bg-slate-200', ring: 'ring-slate-500/20', permission: PERMISSIONS.MANAGE_SETTINGS },
  ];

  const allowedActions = quickActions.filter(a => hasPermission(permissions, a.permission));

  const getRangeLabel = (range: DateRange) => {
    switch (range) {
      case 'today': return 'Hari Ini';
      case '7days': return '7 Hari Terakhir';
      case '30days': return '30 Hari Terakhir';
      case 'thisMonth': return 'Bulan Ini';
      case 'lastMonth': return 'Bulan Lalu';
      default: return 'Periode';
    }
  };

  return (
    <div className="space-y-8">
      {/* Gradient hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl animate-fade-in-up">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/[0.03] rounded-full" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium tracking-wide uppercase">
              Ringkasan {getRangeLabel(dateRange)}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Selamat datang, {user.full_name || 'Admin'}!
            </h1>
            <p className="text-blue-200/80 mt-1 text-sm">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 self-start sm:self-auto">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold">{roleLabel}</span>
          </div>
        </div>
      </div>

      {/* Filter Dropdown (tanpa date picker) */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium text-gray-700">Filter Periode:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'today', label: 'Hari Ini' },
              { value: '7days', label: '7 Hari' },
              { value: '30days', label: '30 Hari' },
              { value: 'thisMonth', label: 'Bulan Ini' },
              { value: 'lastMonth', label: 'Bulan Lalu' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setDateRange(item.value as DateRange)}
                className={`px-3 py-1.5 text-sm rounded-full transition ${
                  dateRange === item.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: (i + 1) * 0.08, ease: 'easeOut' }}
            whileHover={{ scale: 1.02 }}
            className={`group relative overflow-hidden rounded-2xl border border-white/40 bg-white/70 backdrop-blur-md p-5 sm:p-6 shadow-xl hover:shadow-2xl ${card.shadow} transition-all duration-300`}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-primary/10" />
            <div
              className={`relative z-10 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} text-white mb-4 shadow-lg ${card.shadow}`}
            >
              <card.icon className="w-6 h-6" />
            </div>
            <p className="relative z-10 text-xs sm:text-sm font-medium text-slate-500">{card.label}</p>
            <p className="relative z-10 text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
              {statsLoading ? (
                <span className="inline-block h-7 w-24 bg-slate-200 rounded animate-pulse" />
              ) : (
                card.value
              )}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions + OrdersPage (sama seperti sebelumnya) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* <aside className="w-full lg:w-80 shrink-0 space-y-3">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-sm sticky top-24">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"></span>
              Aksi Cepat
            </h2>
            <div className="space-y-2">
              {allowedActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${action.bg} ${action.bgHover} hover:ring-2 ${action.ring}`}
                >
                  <div className={`${action.color} shrink-0`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-sm font-medium ${action.color}`}>
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </aside> */}

        <main className="flex-1 min-w-0">
          <div className="-mt-4 -mx-4 sm:-mx-6 lg:mt-0 lg:mx-0">
            <OrdersPage autoOpen={autoOpenOrder} />
          </div>
        </main>
      </div>
    </div>
  );
}