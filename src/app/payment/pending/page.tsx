'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { isSimulationMode, getPaymentGateway } from '@/lib/payment-gateway';
import { simulatePaymentSuccess, simulatePaymentFailure } from '@/app/dashboard/billing/actions';
import toast from 'react-hot-toast';

type RedirectStatus = 'success' | 'failed';

const RESULT_REDIRECT_DELAY_MS = 1200;

function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');
  const subscriptionId = searchParams.get('subscription_id');
  const method = searchParams.get('method');
  const simulationParam = searchParams.get('simulation');
  const initialRetryPackageId = searchParams.get('package');

  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);
  const [checking, setChecking] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [redirectingTo, setRedirectingTo] = useState<RedirectStatus | null>(null);
  const [retryPackageId, setRetryPackageId] = useState<string | null>(initialRetryPackageId);

  const simulationMode =
    isSimulationMode() ||
    simulationParam === '1' ||
    (invoiceId?.startsWith('sim_') ?? false);

  const isBusy = checking || simulating || redirectingTo !== null;

  const buildResultUrl = (status: RedirectStatus) => {
    const params = new URLSearchParams();

    if (subscriptionId) {
      params.set('subscription_id', subscriptionId);
    }

    if (invoiceId) {
      params.set('invoice_id', invoiceId);
    }

    if (method) {
      params.set('method', method);
    }

    if (status === 'failed' && retryPackageId) {
      params.set('package', retryPackageId);
    }

    if (simulationMode) {
      params.set('simulation', '1');
    }

    return `/payment/${status}?${params.toString()}`;
  };

  const redirectToResult = (status: RedirectStatus) => {
    setRedirectingTo(status);

    window.setTimeout(() => {
      window.location.href = buildResultUrl(status);
    }, RESULT_REDIRECT_DELAY_MS);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!subscriptionId || retryPackageId) return;

    let mounted = true;

    const fetchRetryPackageId = async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('package_id')
        .eq('id', subscriptionId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch retry package:', error);
        return;
      }

      if (mounted) {
        setRetryPackageId(data?.package_id || null);
      }
    };

    fetchRetryPackageId();

    return () => {
      mounted = false;
    };
  }, [subscriptionId, retryPackageId]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const checkPaymentStatus = async () => {
    if (!subscriptionId || redirectingTo) return;

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
        toast.success('Pembayaran berhasil! Mengarahkan ke halaman sukses...');
        redirectToResult('success');
      } else if (data?.status === 'expired') {
        toast.error('Pembayaran gagal/expired. Mengarahkan ke halaman gagal...');
        redirectToResult('failed');
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

  const handleSimulationSuccess = async () => {
    if (!subscriptionId || redirectingTo) return;

    setSimulating(true);

    try {
      const result = await simulatePaymentSuccess(subscriptionId);

      if (result.success) {
        toast.success('Simulasi pembayaran sukses. Membuka halaman hasil...');
        redirectToResult('success');
        return;
      }

      toast.error(result.error || 'Simulasi pembayaran gagal');
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulationFailure = async () => {
    if (!subscriptionId || redirectingTo) return;

    setSimulating(true);

    try {
      const result = await simulatePaymentFailure(subscriptionId);

      if (result.success) {
        toast.error('Simulasi pembayaran gagal/expired. Membuka halaman hasil...');
        redirectToResult('failed');
        return;
      }

      toast.error(result.error || 'Simulasi pembayaran gagal');
    } finally {
      setSimulating(false);
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <p className="text-sm text-gray-500 text-center mb-2">Waktu tersisa</p>
          <div className="text-4xl font-bold text-center text-gray-900 font-mono">
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Instruksi Pembayaran</h2>
          {getPaymentInstructions()}
        </div>

        <div className="space-y-3">
          {redirectingTo && (
            <div
              className={`rounded-lg border p-4 ${
                redirectingTo === 'success'
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">
                {redirectingTo === 'success'
                  ? 'Pembayaran terkonfirmasi. Mengarahkan ke halaman Payment Success...'
                  : 'Status pembayaran gagal/expired. Mengarahkan ke halaman Payment Failed...'}
              </p>
              <p className="mt-1 text-xs text-gray-700">
                Mohon tunggu sebentar, Anda akan diarahkan otomatis.
              </p>
            </div>
          )}

          {simulationMode && !redirectingTo && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="mb-3 text-sm font-medium text-yellow-800">Mode simulasi aktif</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  onClick={handleSimulationSuccess}
                  disabled={isBusy}
                  className="w-full rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
                >
                  {simulating ? 'Memproses...' : 'Simulasikan Sukses'}
                </button>
                <button
                  onClick={handleSimulationFailure}
                  disabled={isBusy}
                  className="w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {simulating ? 'Memproses...' : 'Simulasikan Gagal'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={checkPaymentStatus}
            disabled={isBusy}
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

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Butuh bantuan? Hubungi support kami</p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-gray-600">Memuat...</p>
          </div>
        </div>
      }
    >
      <PaymentPendingContent />
    </Suspense>
  );
}
