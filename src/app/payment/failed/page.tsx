'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSubscriptionById } from '@/app/dashboard/billing/actions';

const AUTO_REDIRECT_SECONDS = 8;

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const subscriptionId = searchParams.get('subscription_id');
  const method = searchParams.get('method');
  const packageFromQuery = searchParams.get('package');

  const [retryPackageId, setRetryPackageId] = useState<string | null>(packageFromQuery);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_REDIRECT_SECONDS);
  const [autoRedirectEnabled, setAutoRedirectEnabled] = useState(true);

  const billingUrl = useMemo(() => {
    const params = new URLSearchParams({ status: 'failed' });

    if (subscriptionId) {
      params.set('order_id', subscriptionId);
    }

    return `/dashboard/billing?${params.toString()}`;
  }, [subscriptionId]);

  const retryUrl = retryPackageId
    ? `/checkout?package=${retryPackageId}`
    : '/dashboard/billing';

  useEffect(() => {
    if (!subscriptionId || retryPackageId) return;

    let mounted = true;

    const fetchRetryPackageId = async () => {
      const result = await getSubscriptionById(subscriptionId);

      if (result.error) {
        console.error('Failed to resolve retry package from subscription:', result.error);
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

  useEffect(() => {
    if (!autoRedirectEnabled) return;

    if (secondsLeft === 0) {
      router.replace(billingUrl);
      return;
    }

    const timeout = setTimeout(() => {
      setSecondsLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [autoRedirectEnabled, secondsLeft, billingUrl, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-center text-2xl font-bold text-gray-900">Pembayaran Gagal</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Pembayaran belum berhasil atau sudah expired. Anda bisa mencoba lagi kapan saja.
        </p>

        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p>Subscription ID: {subscriptionId || '-'}</p>
          <p className="mt-1">Metode Pembayaran: {method || '-'}</p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          {autoRedirectEnabled
            ? `Otomatis kembali ke billing dalam ${secondsLeft} detik.`
            : 'Redirect otomatis dijeda.'}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href={retryUrl}
            className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary/90"
          >
            Coba Lagi Pembayaran
          </Link>
          <Link
            href={billingUrl}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Kembali ke Billing
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Kembali ke Home
          </Link>
          <button
            onClick={() => {
              if (!autoRedirectEnabled && secondsLeft === 0) {
                setSecondsLeft(AUTO_REDIRECT_SECONDS);
              }
              setAutoRedirectEnabled((prev) => !prev);
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {autoRedirectEnabled ? 'Jeda Redirect Otomatis' : 'Lanjutkan Redirect Otomatis'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-gray-600">Memuat status pembayaran...</p>
          </div>
        </div>
      }
    >
      <PaymentFailedContent />
    </Suspense>
  );
}
