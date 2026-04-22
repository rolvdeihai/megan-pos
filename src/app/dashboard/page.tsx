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
import OrdersPage from './orders/page'; // 👈 import komponen OrdersPage

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
      {/* Gradient hero (tetap seperti semula) */}
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

      {/* Stat cards (tetap) */}
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

      {/* Layout 2 kolom: Sidebar (Quick Actions) + Main (OrdersPage) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar: Quick Actions (vertikal) */}
        <aside className="w-full lg:w-80 shrink-0 space-y-3">
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
        </aside>

        {/* Main Content: OrdersPage */}
        <main className="flex-1 min-w-0">
          {/* 
            OrdersPage akan dirender di sini. 
            Agar tidak ada konflik padding/margin eksternal, kita bungkus dengan div 
            dan beri class negatif margin jika diperlukan. 
            Karena OrdersPage sudah memiliki padding sendiri, kita cukup membiarkannya.
          */}
          <div className="-mt-4 -mx-4 sm:-mx-6 lg:mt-0 lg:mx-0">
            <OrdersPage />
          </div>
        </main>
      </div>
    </div>
  );
}