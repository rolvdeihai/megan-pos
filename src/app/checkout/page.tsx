'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector';
import { initiateCheckout, getPackage } from './actions';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Package {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  features: string[];
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const packageId = searchParams.get('package');

  const [pkg, setPkg] = useState<Package | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!packageId) {
      router.push('/dashboard/billing');
      return;
    }
    fetchPackage();
  }, [packageId]);

  const fetchPackage = async () => {
    try {
      const result = await getPackage(packageId!);

      if (result.error) {
        console.error('[Checkout] fetchPackage error:', result.error);
        setFetchError(result.error);
        setLoading(false);
        return;
      }

      if (!result.data) {
        console.error('[Checkout] fetchPackage: no data returned');
        setFetchError('Paket tidak ditemukan');
        setLoading(false);
        return;
      }

      setPkg({
        ...result.data,
        features: Array.isArray(result.data.features) ? result.data.features : [],
      });
      setLoading(false);
    } catch (error) {
      console.error('[Checkout] fetchPackage exception:', error);
      setFetchError('Gagal memuat data paket');
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!user?.id || !pkg || !selectedMethod) {
      toast.error('Pilih metode pembayaran terlebih dahulu');
      return;
    }

    setProcessing(true);

    try {
      const result = await initiateCheckout({
        userId: user.id,
        packageId: pkg.id,
        paymentMethod: selectedMethod,
        userEmail: user.email || '',
        userName: user.full_name || user.email || 'User',
      });

      if (!result.success) {
        toast.error(result.error || 'Gagal memproses pembayaran');
        return;
      }

      if (!result.invoiceUrl || !result.subscriptionId) {
        toast.error('Data pembayaran tidak lengkap. Silakan coba lagi.');
        return;
      }

      const pendingParams = new URLSearchParams({
        invoice_id: result.invoiceId || '',
        subscription_id: result.subscriptionId,
        method: selectedMethod,
        invoice_url: result.invoiceUrl,
      });

      router.push(`/payment/pending?${pendingParams.toString()}`);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat checkout...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Gagal Memuat Paket</h2>
          <p className="text-gray-600 mb-4">{fetchError}</p>
          <Link
            href="/dashboard/billing"
            className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Kembali ke Billing
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Anda belum login</h2>
          <p className="text-gray-600 mb-4">Silakan login untuk melanjutkan pembayaran.</p>
          <Link href="/login" className="text-primary hover:underline">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/billing"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Billing
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="mt-2 text-gray-600">Lengkapi pembayaran untuk mengaktifkan paket Anda</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Payment Method */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Method Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pilih Metode Pembayaran</h2>
              <PaymentMethodSelector
                selected={selectedMethod}
                onSelect={setSelectedMethod}
              />
            </div>

            {/* Customer Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Pelanggan</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nama</label>
                  <p className="mt-1 text-gray-900">{user.full_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-gray-900">{user.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Pesanan</h2>

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">Paket {pkg.name}</p>
                    <p className="text-sm text-gray-500">{pkg.duration_days} hari</p>
                  </div>
                  <p className="font-medium text-gray-900">Rp {pkg.price.toLocaleString()}</p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Fitur yang didapat:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <p className="text-base font-semibold text-gray-900">Total</p>
                    <p className="text-xl font-bold text-primary">Rp {pkg.price.toLocaleString()}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Sudah termasuk pajak</p>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={!selectedMethod || processing}
                  className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? 'Memproses...' : 'Bayar Sekarang'}
                </button>

                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Pembayaran aman & terenkripsi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat checkout...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
