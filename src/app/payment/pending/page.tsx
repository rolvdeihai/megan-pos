'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSubscriptionById } from '@/app/dashboard/billing/actions';
import toast from 'react-hot-toast';

type RedirectStatus = 'success' | 'failed';

const RESULT_REDIRECT_DELAY_MS = 1200;

function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');
  const subscriptionId = searchParams.get('subscription_id');
  const method = searchParams.get('method');
  const initialRetryPackageId = searchParams.get('package');
  const invoiceUrl = searchParams.get('invoice_url');

  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);
  const [checking, setChecking] = useState(false);
  const [redirectingTo, setRedirectingTo] = useState<RedirectStatus | null>(null);
  const [retryPackageId, setRetryPackageId] = useState<string | null>(initialRetryPackageId);
  const [paymentDetails, setPaymentDetails] = useState<{
    va_number?: string;
    bank?: string;
    bill_key?: string;
    biller_code?: string;
    payment_type?: string;
    transaction_status?: string;
  } | null>(null);

  const isBusy = checking || redirectingTo !== null;

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
      const result = await getSubscriptionById(subscriptionId);

      if (result.error) {
        console.error('Failed to fetch retry package:', result.error);
        return;
      }

      if (mounted) {
        setRetryPackageId(result.data?.package_id || null);
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
      // Refresh VA details from Midtrans
      if (invoiceUrl) {
        try {
          const res = await fetch(`/api/payment/status?order_id=${subscriptionId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.va_number || data.bill_key) {
              setPaymentDetails(data);
            }
          }
        } catch {}
      }

      const result = await getSubscriptionById(subscriptionId);

      if (result.error || !result.data) {
        toast.error('Gagal memeriksa status pembayaran');
        return;
      }

      if (result.data.status === 'active') {
        toast.success('Pembayaran berhasil! Mengarahkan ke halaman sukses...');
        redirectToResult('success');
      } else if (result.data.status === 'expired') {
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

  const getPaymentInstructions = () => {
    const vaNumber = paymentDetails?.va_number;
    const bank = paymentDetails?.bank?.toUpperCase() || method;
    const billKey = paymentDetails?.bill_key;
    const billerCode = paymentDetails?.biller_code;

    switch (method) {
      case 'BCA':
      case 'BNI':
      case 'MANDIRI':
        return (
          <div className="space-y-4">
            {vaNumber ? (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Nomor Virtual Account {bank}
                </p>
                <div className="flex items-center justify-between bg-white p-3 rounded border">
                  <span className="text-lg font-mono font-bold">{vaNumber}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(vaNumber);
                      toast.success('Nomor VA disalin');
                    }}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Salin
                  </button>
                </div>
                {method === 'MANDIRI' && billKey && (
                  <div className="mt-3">
                    <p className="text-sm text-blue-800 font-medium mb-1">Bill Key</p>
                    <div className="flex items-center justify-between bg-white p-3 rounded border">
                      <span className="text-lg font-mono font-bold">{billKey}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(billKey);
                          toast.success('Bill Key disalin');
                        }}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        Salin
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Kode Perusahaan: {billerCode}</p>
                  </div>
                )}
              </div>
            ) : invoiceUrl ? (
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-blue-800 font-medium mb-3">
                  Selesaikan pembayaran di halaman Midtrans
                </p>
                <a
                  href={invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 text-sm"
                >
                  Buka Halaman Pembayaran
                </a>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-blue-800">Memuat instruksi pembayaran...</p>
              </div>
            )}
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              {vaNumber ? (
                <>
                  <li>Buka aplikasi {method} mobile banking atau ATM</li>
                  <li>Pilih menu &quot;Transfer&quot; atau &quot;Pembayaran&quot;</li>
                  <li>Pilih &quot;Virtual Account&quot;</li>
                  <li>Masukkan nomor VA di atas</li>
                  <li>Ikuti instruksi hingga pembayaran selesai</li>
                </>
              ) : (
                <li>Klik tombol &quot;Buka Halaman Pembayaran&quot; di atas untuk melihat instruksi lengkap</li>
              )}
            </ol>
          </div>
        );
      case 'QRIS':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-800 font-medium mb-3">Scan QRIS Code</p>
              {invoiceUrl ? (
                <a
                  href={invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 text-sm"
                >
                  Buka Halaman Pembayaran QRIS
                </a>
              ) : (
                <div className="bg-white p-4 rounded-lg inline-block">
                  <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500 text-xs">QRIS Code</span>
                  </div>
                </div>
              )}
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Buka aplikasi e-wallet atau mobile banking</li>
              <li>Pilih menu &quot;Scan QR&quot; atau &quot;QRIS&quot;</li>
              <li>Scan kode QR di halaman Midtrans</li>
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
                Selesaikan pembayaran di halaman Midtrans.
              </p>
            </div>
            {invoiceUrl && (
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium text-center hover:bg-green-700"
              >
                Buka Halaman Pembayaran
              </a>
            )}
          </div>
        );
      default:
        return (
          <div className="text-center">
            {invoiceUrl ? (
              <>
                <p className="text-gray-600 mb-4">
                  Klik tombol di bawah untuk menyelesaikan pembayaran
                </p>
                <a
                  href={invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 text-sm"
                >
                  Buka Halaman Pembayaran
                </a>
              </>
            ) : (
              <p className="text-gray-600">
                Instruksi pembayaran akan ditampilkan setelah Anda memilih metode pembayaran.
              </p>
            )}
          </div>
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
                  ? 'Pembayaran terkonfirmasi. Mengarahkan ke halaman sukses...'
                  : 'Status pembayaran gagal/expired. Mengarahkan ke halaman gagal...'}
              </p>
              <p className="mt-1 text-xs text-gray-700">
                Mohon tunggu sebentar, Anda akan diarahkan otomatis.
              </p>
            </div>
          )}

          {invoiceUrl && !redirectingTo && !paymentDetails?.va_number && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium text-center hover:bg-green-700 transition-colors"
            >
              Buka Halaman Pembayaran
            </a>
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
