'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');
  const subscriptionId = searchParams.get('subscription_id');
  const method = searchParams.get('method');

  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60); // 24 hours in seconds
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const checkPaymentStatus = async () => {
    if (!subscriptionId) return;

    setChecking(true);

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('status')
        .eq('id', subscriptionId)
        .single();

      if (error) {
        toast.error('Gagal memeriksa status pembayaran');
        return;
      }

      if (data?.status === 'active') {
        toast.success('Pembayaran berhasil!');
        window.location.href = '/dashboard/billing?status=success';
      } else {
        toast('Pembayaran masih diproses. Silakan coba lagi.', { icon: '⏳' });
      }
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setChecking(false);
    }
  };

  const getPaymentInstructions = () => {
    switch (method) {
      case 'BCA':
      case 'BNI':
      case 'MANDIRI':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">Nomor Virtual Account</p>
              <div className="flex items-center justify-between bg-white p-3 rounded border">
                <span className="text-lg font-mono font-bold">{invoiceId?.replace('sim_', '') || 'Loading...'}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(invoiceId || '');
                    toast.success('Nomor VA disalin');
                  }}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Salin
                </button>
              </div>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Buka aplikasi {method} mobile banking atau ATM</li>
              <li>Pilih menu "Transfer" atau "Pembayaran"</li>
              <li>Pilih "Virtual Account"</li>
              <li>Masukkan nomor VA di atas</li>
              <li>Ikuti instruksi hingga pembayaran selesai</li>
            </ol>
          </div>
        );
      case 'QRIS':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-800 font-medium mb-3">Scan QRIS Code</p>
              <div className="bg-white p-4 rounded-lg inline-block">
                {/* Placeholder for QR code - in real implementation, this would be from Xendit */}
                <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-xs">QRIS Code</span>
                </div>
              </div>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Buka aplikasi e-wallet atau mobile banking</li>
              <li>Pilih menu "Scan QR" atau "QRIS"</li>
              <li>Scan kode QR di atas</li>
              <li>Konfirmasi pembayaran</li>
            </ol>
          </div>
        );
      case 'DANA':
      case 'OVO':
      case 'LINKAJA':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-800 font-medium mb-2">Pembayaran {method}</p>
              <p className="text-sm text-purple-700">
                Anda akan diarahkan ke aplikasi {method} untuk menyelesaikan pembayaran.
              </p>
            </div>
            <button
              onClick={() => {
                // In real implementation, this would open the e-wallet app
                toast(`Membuka aplikasi ${method}...`, { icon: '📱' });
              }}
              className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
            >
              Buka Aplikasi {method}
            </button>
          </div>
        );
      default:
        return (
          <p className="text-gray-600">
            Instruksi pembayaran akan ditampilkan setelah Anda memilih metode pembayaran.
          </p>
        );
    }
  };

  if (!subscriptionId || !method) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Informasi pembayaran tidak lengkap</h2>
          <Link href="/dashboard/billing" className="text-primary hover:underline">
            Kembali ke Billing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Menunggu Pembayaran</h1>
          <p className="mt-2 text-gray-600">
            Silakan selesaikan pembayaran sebelum waktu habis
          </p>
        </div>

        {/* Countdown Timer */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <p className="text-sm text-gray-500 text-center mb-2">Waktu tersisa</p>
          <div className="text-4xl font-bold text-center text-gray-900 font-mono">
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Instruksi Pembayaran</h2>
          {getPaymentInstructions()}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={checkPaymentStatus}
            disabled={checking}
            className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {checking ? 'Memeriksa...' : 'Cek Status Pembayaran'}
          </button>

          <Link
            href="/dashboard/billing"
            className="block w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium text-center hover:bg-gray-50"
          >
            Kembali ke Billing
          </Link>
        </div>

        {/* Help */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Butuh bantuan? Hubungi support kami</p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    }>
      <PaymentPendingContent />
    </Suspense>
  );
}
