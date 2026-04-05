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
  QueueListIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserGroupIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { getUserRoleLabel } from '@/lib/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeTables: 0,
    todayRevenue: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setStatsLoading(true);
      fetch('/api/dashboard/stats')
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(console.error)
        .finally(() => setStatsLoading(false));
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
              Ringkasan Hari Ini
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            // Customize premium stat-card animation here.
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: (i + 1) * 0.08, ease: 'easeOut' }}
            whileHover={{ scale: 1.02 }}
            className={`group relative overflow-hidden rounded-2xl border border-white/40 bg-white/70 backdrop-blur-md p-5 sm:p-6 shadow-xl hover:shadow-2xl ${card.shadow} transition-all duration-300`}
            style={{ animationDelay: `${(i + 1) * 100}ms` }}
          >
            {/* Customize gradient accent style here. */}
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

      {/* Quick actions */}
      <div className="animate-fade-in-up" style={{ animationDelay: '500ms' }}>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">Aksi Cepat</h2>
          <p className="text-sm text-slate-500 mt-0.5">Akses fitur sesuai izin yang dimiliki</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {allowedActions.map((action, i) => (
            <motion.div
              key={action.href}
              // Customize quick-action animation here.
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.45 + i * 0.06, ease: 'easeOut' }}
              whileHover={{ scale: 1.02 }}
            >
              <Link
                href={action.href}
                className={`group relative overflow-hidden flex flex-col items-center gap-3 rounded-2xl p-5 sm:p-6 border border-white/40 bg-white/65 backdrop-blur-md ${action.bg} ${action.bgHover} transition-all duration-300 shadow-xl hover:shadow-2xl hover:ring-2 ${action.ring}`}
              >
                {/* Customize action-card glow colors here. */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/35 via-transparent to-primary/10" />
                <div
                  className={`relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center ${action.color} bg-white shadow-sm group-hover:scale-110 transition-transform duration-300`}
                >
                  <action.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className={`relative z-10 text-sm font-semibold ${action.color} text-center`}>
                  {action.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
