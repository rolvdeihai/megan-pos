// app/dashboard/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { CalendarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ShoppingBagIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/auth/AuthProvider';

type DateRange = '7days' | '30days' | 'thisMonth' | 'lastMonth';
type GroupBy = 'day' | 'week' | 'month';

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    dailySales: [],
    paymentMethods: [],
    topItems: [],
    totalIncome: 0,
    totalExpenses: 0,
    profit: 0,
    orderTrend: []
  });

  // Helper: get start & end date based on range
  const getDateParams = (range: DateRange) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    let start = new Date();
    switch (range) {
      case '7days':
        start.setDate(start.getDate() - 6);
        break;
      case '30days':
        start.setDate(start.getDate() - 29);
        break;
      case 'thisMonth':
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
        end.setDate(0);
        break;
    }
    start.setHours(0, 0, 0, 0);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateParams(dateRange);
    try {
      const res = await fetch(`/api/analytics?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&group_by=${groupBy}`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchAnalytics();
  }, [user, dateRange, groupBy]);

  const formatCurrency = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  if (authLoading || loading) {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Memuat data analitik...</p>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analitik & Laporan Keuangan</h1>
          <p className="text-gray-600 mt-1">Wawasan bisnis untuk pengambilan keputusan lebih baik</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="7days">7 Hari Terakhir</option>
            <option value="30days">30 Hari Terakhir</option>
            <option value="thisMonth">Bulan Ini</option>
            <option value="lastMonth">Bulan Lalu</option>
          </select>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="day">Harian</option>
            <option value="week">Mingguan</option>
            <option value="month">Bulanan</option>
          </select>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pendapatan</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(data.totalIncome)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">💰</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(data.totalExpenses)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl">📉</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Laba Bersih</p>
              <p className={`text-2xl font-bold mt-2 ${data.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency(data.profit)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${data.profit >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              {data.profit >= 0 ? '📈' : '⚠️'}
            </div>
          </div>
        </div>
      </div>

      {/* Chart 1: Revenue Trend */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-5 h-5 text-primary" /> Tren Pendapatan
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.dailySales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(val) => `Rp ${(val/1000).toFixed(0)}k`} />
            <Tooltip formatter={(val: any) => formatCurrency(val)} />
            <Legend />
            <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="#93c5fd" name="Pendapatan" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two-column layout for Pie + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCardIcon className="w-5 h-5 text-primary" /> Metode Pembayaran
          </h2>
          {data.paymentMethods.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.paymentMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.paymentMethods.map((entry: any, idx: number) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Tidak ada data</p>
          )}
        </div>

        {/* Top Menu Items */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingBagIcon className="w-5 h-5 text-primary" /> Menu Terlaris
          </h2>
          {data.topItems.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topItems} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#f97316" name="Terjual (porsi)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Belum ada data penjualan menu</p>
          )}
        </div>
      </div>

      {/* Order Trend */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" /> Tren Jumlah Pesanan
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.orderTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#10b981" name="Jumlah Order" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Insight Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
        <h3 className="text-md font-bold text-indigo-800 mb-3">💡 Insight untuk Improvement</h3>
        <ul className="space-y-2 text-gray-700">
          {data.topItems && data.topItems.length > 0 && (
            <li>✅ <strong>Menu unggulan:</strong> {data.topItems[0]?.name} terjual {data.topItems[0]?.quantity} porsi. Promosikan lebih gencar.</li>
          )}
          {data.paymentMethods && data.paymentMethods.find((p: any) => p.name === 'cash')?.value > data.totalIncome * 0.6 && (
            <li>💡 <strong>Mayoritas pembayaran tunai</strong> – pertimbangkan edukasi pelanggan untuk menggunakan QRIS/transfer agar lebih efisien.</li>
          )}
          {data.profit < 0 && (
            <li>⚠️ <strong>Laba negatif</strong> – evaluasi biaya operasional atau tingkatkan harga jual.</li>
          )}
          {data.dailySales && data.dailySales.length > 0 && (
            <li>📈 <strong>Pendapatan rata-rata per hari:</strong> {formatCurrency(data.totalIncome / data.dailySales.length)}. Targetkan kenaikan 10% bulan depan.</li>
          )}
          <li>🔄 <strong>Lakukan analisis ini secara rutin</strong> untuk mendeteksi tren musiman dan kebiasaan pelanggan.</li>
        </ul>
      </div>
    </div>
  );
}