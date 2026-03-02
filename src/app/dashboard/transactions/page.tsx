'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PlusIcon,
  ReceiptRefundIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '@/components/auth/AuthProvider';

type Transaction = {
  id: string;
  transaction_number: string;
  type: 'sale' | 'refund' | 'expense';
  amount: number;
  payment_method: string;
  status: string;
  notes: string;
  created_at: string;
  order_id: string;
  order_number?: string;
  customer_name?: string;
};

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_status: string;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [transactionType, setTransactionType] = useState<string>('all');
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalRefunds: 0,
    totalExpenses: 0,
    netIncome: 0,
    totalTransactions: 0,
  });
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'refund'>('expense');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'cash',
    notes: '',
    order_id: '',
    refund_reason: '',
    expense_category: 'operational',
  });

  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
      fetchPaidOrders(); // Fetch orders for refund selection
    }
  }, [startDate, endDate, paymentMethod, transactionType, user]);

  const fetchTransactions = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          orders(
            order_number,
            customer_name
          )
        `)
        .eq('user_id', user.id);

      // Apply date filter
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt('created_at', nextDay.toISOString());
      }

      // Apply payment method filter
      if (paymentMethod !== 'all') {
        query = query.eq('payment_method', paymentMethod);
      }

      // Apply transaction type filter
      if (transactionType !== 'all') {
        query = query.eq('type', transactionType);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (!error && data) {
        const formattedTransactions = data.map((transaction: any) => ({
          ...transaction,
          order_number: transaction.orders?.order_number,
          customer_name: transaction.orders?.customer_name,
        }));

        setTransactions(formattedTransactions);

        // Calculate summary
        const sales = formattedTransactions.filter(t => t.type === 'sale');
        const refunds = formattedTransactions.filter(t => t.type === 'refund');
        const expenses = formattedTransactions.filter(t => t.type === 'expense');

        const totalSales = sales.reduce((sum, t) => sum + t.amount, 0);
        const totalRefunds = refunds.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

        setSummary({
          totalSales,
          totalRefunds,
          totalExpenses,
          netIncome: totalSales - totalRefunds - totalExpenses,
          totalTransactions: formattedTransactions.length,
        });
      } else {
        console.error('Error fetching transactions:', error);
      }
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaidOrders = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, total_amount, payment_status')
        .eq('user_id', user.id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const openModal = (type: 'expense' | 'refund') => {
    setModalType(type);
    setFormData({
      amount: '',
      payment_method: 'cash',
      notes: '',
      order_id: '',
      refund_reason: '',
      expense_category: 'operational',
    });
    setModalError('');
    setShowModal(true);
  };

  const handleSubmitExpenseRefund = async () => {
    if (!user?.id) return;
    
    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setModalError('Jumlah harus lebih dari 0');
      return;
    }

    if (modalType === 'refund' && !formData.order_id) {
      setModalError('Pilih order untuk refund');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const transactionNumber = `${modalType === 'expense' ? 'EXP' : 'REF'}-${Date.now().toString().slice(-6)}`;
      
      const transactionData: any = {
        user_id: user.id,
        transaction_number: transactionNumber,
        type: modalType,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        status: 'completed',
        notes: modalType === 'expense' 
          ? `${formData.expense_category}: ${formData.notes || 'Tidak ada catatan'}`
          : `Refund: ${formData.refund_reason || 'Tidak ada alasan'}`,
      };

      // For refund, link to order
      if (modalType === 'refund' && formData.order_id) {
        transactionData.order_id = formData.order_id;
        
        // Update order payment status to refunded
        await supabase
          .from('orders')
          .update({ payment_status: 'refunded' })
          .eq('id', formData.order_id)
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('transactions')
        .insert(transactionData);

      if (error) throw error;

      // Close modal and refresh data
      setShowModal(false);
      fetchTransactions();
      
      // Reset form
      setFormData({
        amount: '',
        payment_method: 'cash',
        notes: '',
        order_id: '',
        refund_reason: '',
        expense_category: 'operational',
      });

    } catch (error: any) {
      console.error('Error adding transaction:', error);
      setModalError(error.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setModalLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'No. Transaksi',
      'Tanggal',
      'Tipe',
      'Jumlah',
      'Metode Pembayaran',
      'Status',
      'No. Order',
      'Customer',
      'Catatan',
    ];

    const csvData = transactions.map(transaction => [
      transaction.transaction_number,
      new Date(transaction.created_at).toLocaleDateString('id-ID'),
      transaction.type === 'sale' ? 'Penjualan' : transaction.type === 'refund' ? 'Refund' : 'Pengeluaran',
      transaction.amount,
      transaction.payment_method === 'cash' ? 'Cash' : 
        transaction.payment_method === 'card' ? 'Card' : 
        transaction.payment_method === 'qris' ? 'QRIS' : 'Transfer',
      transaction.status === 'completed' ? 'Selesai' : 'Pending',
      transaction.order_number || '-',
      transaction.customer_name || '-',
      transaction.notes || '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaksi-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-green-100 text-green-800';
      case 'refund': return 'bg-red-100 text-red-800';
      case 'expense': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return '💵';
      case 'card': return '💳';
      case 'qris': return '📱';
      case 'transfer': return '🏦';
      default: return '💰';
    }
  };

  // Tampilkan loading jika auth masih loading
  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data transaksi...</p>
        </div>
      </div>
    );
  }

  // Tampilkan pesan jika tidak ada user (belum login)
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Anda belum login</h2>
          <p className="text-gray-600">Silakan login untuk melihat laporan transaksi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Laporan Transaksi</h1>
        <p className="mt-2 text-gray-600">Pantau semua transaksi keuangan restoran Anda</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Penjualan</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                Rp {summary.totalSales.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {transactions.filter(t => t.type === 'sale').length} transaksi
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Refund</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                Rp {summary.totalRefunds.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">↩️</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {transactions.filter(t => t.type === 'refund').length} transaksi
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                Rp {summary.totalExpenses.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💸</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {transactions.filter(t => t.type === 'expense').length} transaksi
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendapatan Bersih</p>
              <p className={`text-2xl font-bold mt-2 ${
                summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                Rp {summary.netIncome.toLocaleString()}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              summary.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className="text-2xl">{summary.netIncome >= 0 ? '💰' : '📉'}</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {summary.totalTransactions} total transaksi
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4 sm:mb-0">
            <FunnelIcon className="w-5 h-5 mr-2" />
            Filter Laporan
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => openModal('expense')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
              >
                <BanknotesIcon className="w-5 h-5 mr-2" />
                Tambah Pengeluaran
              </button>
              <button
                onClick={() => openModal('refund')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center"
              >
                <ReceiptRefundIcon className="w-5 h-5 mr-2" />
                Tambah Refund
              </button>
            </div>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center"
            >
              <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Mulai
            </label>
            <div className="relative">
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                dateFormat="dd/MM/yyyy"
              />
              <CalendarIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Akhir
            </label>
            <div className="relative">
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                dateFormat="dd/MM/yyyy"
              />
              <CalendarIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipe Transaksi
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
            >
              <option value="all">Semua Tipe</option>
              <option value="sale">Penjualan</option>
              <option value="refund">Refund</option>
              <option value="expense">Pengeluaran</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metode Pembayaran
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
            >
              <option value="all">Semua Metode</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="qris">QRIS</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No. Transaksi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe & Metode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {transaction.transaction_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(transaction.created_at).toLocaleDateString('id-ID')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(transaction.created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full mr-2 ${getTypeColor(transaction.type)}`}>
                        {transaction.type === 'sale' ? 'Penjualan' : 
                         transaction.type === 'refund' ? 'Refund' : 'Pengeluaran'}
                      </span>
                      <span className="text-lg">
                        {getPaymentMethodIcon(transaction.payment_method)}
                      </span>
                      <span className="ml-2 text-sm text-gray-600 capitalize">
                        {transaction.payment_method}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${
                      transaction.type === 'sale' ? 'text-green-600' : 
                      transaction.type === 'refund' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {transaction.type === 'sale' ? '+' : 
                       transaction.type === 'refund' ? '-' : '-'}
                      Rp {transaction.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.order_number ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.order_number}
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.customer_name || '-'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.status === 'completed' ? 'Selesai' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        // View transaction details
                        alert(`Detail Transaksi: ${transaction.transaction_number}\nTipe: ${transaction.type}\nJumlah: Rp ${transaction.amount.toLocaleString()}\nCatatan: ${transaction.notes || 'Tidak ada catatan'}`);
                      }}
                      className="text-primary hover:text-primary flex items-center"
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      Lihat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900">Tidak ada transaksi</h3>
            <p className="mt-2 text-gray-600">
              Tidak ditemukan transaksi dengan filter yang dipilih
            </p>
            <div className="mt-6 flex gap-4 justify-center">
              <button
                onClick={() => openModal('expense')}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center"
              >
                <BanknotesIcon className="w-5 h-5 mr-2" />
                Tambah Pengeluaran Pertama
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expense/Refund Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                {modalType === 'expense' ? (
                  <>
                    <BanknotesIcon className="w-6 h-6 mr-3 text-red-600" />
                    Tambah Pengeluaran
                  </>
                ) : (
                  <>
                    <ReceiptRefundIcon className="w-6 h-6 mr-3 text-yellow-600" />
                    Tambah Refund
                  </>
                )}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modalError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {modalError}
              </div>
            )}

            <div className="space-y-6">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah (Rp) *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                  placeholder="Masukkan jumlah"
                  min="1"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metode Pembayaran *
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="qris">QRIS</option>
                  <option value="transfer">Transfer Bank</option>
                </select>
              </div>

              {/* Refund: Order Selection */}
              {modalType === 'refund' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Order untuk Refund *
                  </label>
                  <select
                    value={formData.order_id}
                    onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                    required
                  >
                    <option value="">Pilih order...</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.order_number} - {order.customer_name} (Rp {order.total_amount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                  {orders.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500">Tidak ada order yang sudah dibayar untuk direfund</p>
                  )}
                </div>
              )}

              {/* Expense: Category */}
              {modalType === 'expense' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori Pengeluaran
                  </label>
                  <select
                    value={formData.expense_category}
                    onChange={(e) => setFormData({ ...formData, expense_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="operational">Operasional</option>
                    <option value="ingredients">Bahan Baku</option>
                    <option value="utilities">Listrik/Air/Internet</option>
                    <option value="salary">Gaji Karyawan</option>
                    <option value="rent">Sewa Tempat</option>
                    <option value="marketing">Marketing</option>
                    <option value="maintenance">Pemeliharaan</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
              )}

              {/* Refund: Reason */}
              {modalType === 'refund' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alasan Refund
                  </label>
                  <input
                    type="text"
                    value={formData.refund_reason}
                    onChange={(e) => setFormData({ ...formData, refund_reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                    placeholder="Contoh: Pesanan salah, Pelanggan tidak puas, dll."
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {modalType === 'expense' ? 'Keterangan Pengeluaran' : 'Catatan Tambahan'}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                  rows={3}
                  placeholder={modalType === 'expense' 
                    ? 'Contoh: Beli bahan baku bulanan, Bayar listrik Januari, dll.'
                    : 'Catatan tambahan untuk transaksi ini...'}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                disabled={modalLoading}
              >
                Batal
              </button>
              <button
                onClick={handleSubmitExpenseRefund}
                disabled={modalLoading}
                className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 flex items-center"
              >
                {modalLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-5 h-5 mr-2" />
                    {modalType === 'expense' ? 'Simpan Pengeluaran' : 'Simpan Refund'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}