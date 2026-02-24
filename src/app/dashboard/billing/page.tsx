// src/app/dashboard/billing/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider'; // Import useAuth
import { isSimulationMode } from '@/lib/xendit';
import { simulatePaymentSuccess, simulatePaymentFailure } from './actions';
import toast from 'react-hot-toast';

const packages = [
  {
    id: 'basic',
    name: 'Basic',
    price: 300000,
    features: [
      'Max 100 transaksi/bulan',
      '1 admin user',
      'Laporan dasar',
      'Menu online',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 500000,
    features: [
      'Unlimited transaksi',
      '3 staff users',
      'Laporan lengkap',
      'Inventory management',
      'Support priority',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 800000,
    features: [
      'Unlimited transaksi',
      '10 staff users',
      'Semua fitur pro',
      'API access',
      'Custom development',
      '24/7 support',
    ],
  },
];

export default function BillingPage() {
  const [selectedPackage, setSelectedPackage] = useState<string>('pro');
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [simSubscriptionId, setSimSubscriptionId] = useState<string | null>(null);

  const router = useRouter();
  // Gunakan useAuth hook
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchCurrentSubscription();
    }
  }, [user]);

  useEffect(() => {
    // Handle return from payment
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const orderId = params.get('order_id');

    if (status === 'success') {
      toast.success('Pembayaran berhasil! Paket Anda telah diaktifkan.');
      fetchCurrentSubscription();
      // Clear query params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'failed') {
      toast.error('Pembayaran gagal atau dibatalkan. Silakan coba lagi.');
      // Clear query params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchCurrentSubscription = async () => {
    if (!user?.id) return;

    // Ambil data langganan aktif user saat ini
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*, packages(id, name, price, features)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!error && data) {
      setCurrentSubscription(data);
      // Set default pilihan ke paket saat ini jika ada
      if (data.package_id) {
        setSelectedPackage(data.package_id);
      }
    }
  };

  const handleSimulateSuccess = async () => {
    if (!simSubscriptionId) {
      toast.error('Silakan pilih paket dan buat subscription simulasi terlebih dahulu');
      return;
    }

    const result = await simulatePaymentSuccess(simSubscriptionId);

    if (result.success) {
      toast.success('Simulasi: Pembayaran berhasil!');
      setShowSimulation(false);
      setSimSubscriptionId(null);
      await fetchCurrentSubscription();
    } else {
      toast.error(result.error || 'Simulasi gagal');
    }
  };

  const handleSimulateFailure = async () => {
    if (!simSubscriptionId) {
      toast.error('Silakan pilih paket dan buat subscription simulasi terlebih dahulu');
      return;
    }

    const result = await simulatePaymentFailure(simSubscriptionId);

    if (result.success) {
      toast.error('Simulasi: Pembayaran gagal/expired');
      setShowSimulation(false);
      setSimSubscriptionId(null);
    } else {
      toast.error(result.error || 'Simulasi gagal');
    }
  };

  const createSimulatedSubscription = async () => {
    if (!user?.id) return;

    try {
      const { createPendingSubscription } = await import('@/lib/subscription');
      const subscription = await createPendingSubscription(user.id, selectedPackage);
      setSimSubscriptionId(subscription.id);
      setShowSimulation(true);
      toast.success('Subscription simulasi dibuat. Pilih hasil pembayaran.');
    } catch (error) {
      console.error('Error creating sim subscription:', error);
      toast.error('Gagal membuat subscription simulasi');
    }
  };

  // Tampilkan loading jika auth masih loading
  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data billing...</p>
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
          <p className="text-gray-600">Silakan login untuk mengelola langganan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">Pilih Paket Langganan</h1>
        <p className="mt-4 text-gray-600">
          Pilih paket yang sesuai dengan kebutuhan restoran Anda
        </p>
        
        {currentSubscription && (
          <div className="mt-6 inline-flex items-center px-4 py-2 bg-primary/10 border border-blue-200 rounded-full">
            <span className="text-primary font-medium mr-2">Paket Aktif:</span>
            <span className="text-primary font-bold uppercase">
              {currentSubscription.packages?.name || 'Unknown'}
            </span>
            <span className="mx-2 text-blue-300">|</span>
            <span className="text-primary text-sm">
              Berlaku sampai: {new Date(currentSubscription.end_date).toLocaleDateString('id-ID')}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {packages.map((pkg) => {
          const isCurrentPlan = currentSubscription?.package_id === pkg.id;
          
          return (
            <div
              key={pkg.id}
              className={`rounded-lg border-2 p-6 transition-all ${
                selectedPackage === pkg.id
                  ? 'border-primary bg-primary/10 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute top-0 right-0 -mt-2 -mr-2">
                   <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-green-500 rounded-full">
                     Aktif
                   </span>
                </div>
              )}
              
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                <div className="mt-4">
                  <span className="text-3xl font-bold">Rp {pkg.price.toLocaleString()}</span>
                  <span className="text-gray-600">/bulan</span>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPackage(pkg.id)}
                disabled={isCurrentPlan}
                className={`mt-8 w-full py-2 rounded-md font-medium transition-colors ${
                  selectedPackage === pkg.id
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                } ${isCurrentPlan ? 'cursor-default opacity-75' : ''}`}
              >
                {isCurrentPlan ? 'Paket Saat Ini' : (selectedPackage === pkg.id ? 'Dipilih' : 'Pilih Paket')}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        {currentSubscription?.package_id === selectedPackage ? (
          <button
            disabled
            className="px-8 py-3 bg-gray-400 text-white rounded-lg font-medium cursor-default"
          >
            Sudah Berlangganan
          </button>
        ) : (
          <a
            href={`/checkout?package=${selectedPackage}`}
            className="inline-block px-8 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 font-medium transition-colors"
          >
            Lanjut ke Checkout
          </a>
        )}

        {isSimulationMode() && currentSubscription?.package_id !== selectedPackage && (
          <div className="mt-4">
            {!showSimulation ? (
              <button
                onClick={createSimulatedSubscription}
                className="text-sm text-yellow-600 hover:text-yellow-700 underline"
              >
                🧪 Buat Subscription Simulasi
              </button>
            ) : (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
                <p className="text-sm text-yellow-800 font-medium mb-3">
                  🧪 Mode Simulasi (Development Only)
                </p>
                <p className="text-xs text-yellow-700 mb-4">
                  Subscription ID: {simSubscriptionId}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleSimulateSuccess}
                    className="px-4 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
                  >
                    ✓ Pembayaran Sukses
                  </button>
                  <button
                    onClick={handleSimulateFailure}
                    className="px-4 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
                  >
                    ✗ Pembayaran Gagal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">
          {isSimulationMode()
            ? '🧪 Mode simulasi aktif - tidak ada pembayaran nyata'
            : 'Pembayaran aman melalui Xendit (VA, QRIS, E-wallet)'}
        </p>
      </div>
    </div>
  );
}