'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PaymentCallbackContent() {
  const searchParams = useSearchParams();

  const status = searchParams.get('status') || 'success';
  const orderId = searchParams.get('order_id');
  const subscriptionId = searchParams.get('subscription_id');
  const method = searchParams.get('method');

  const isSuccess = status === 'success';
  const billingUrl = `/dashboard/billing?status=${status}&order_id=${orderId || subscriptionId || ''}`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm text-center">
        {isSuccess ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Pembayaran Berhasil</h1>
            <p className="mt-2 text-sm text-gray-600">
              Langganan Anda sudah aktif. Silakan lanjutkan ke dashboard.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Pembayaran Gagal</h1>
            <p className="mt-2 text-sm text-gray-600">
              Pembayaran tidak berhasil. Silakan coba lagi.
            </p>
          </>
        )}

        {method && (
          <p className="mt-3 text-xs text-gray-500">Metode: {method}</p>
        )}

        <div className="mt-6 space-y-3">
          {/* Use <a> for full page load — browser includes cookies properly */}
          <a
            href={billingUrl}
            className="block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-white hover:bg-primary/90"
          >
            Lihat Billing
          </a>
          <a
            href="/dashboard"
            className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Ke Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-gray-600">Memproses hasil pembayaran...</p>
          </div>
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
