// src/app/dashboard/billing/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { getPaymentGateway } from '@/lib/payment-gateway';
import { getCurrentSubscription } from './actions';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

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
    name: 'Corporate',   // ✅ changed from 'Enterprise'
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
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

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
      setShowSuccessAnim(true);
      setTimeout(() => setShowSuccessAnim(false), 1400);
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

    const result = await getCurrentSubscription(user.id);

    if (result.error) {
      console.error('[Billing] fetchCurrentSubscription error:', result.error);
      return;
    }

    if (result.data) {
      setCurrentSubscription(result.data);
      if (result.data.package_id) {
        setSelectedPackage(result.data.package_id);
      }
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
      <AnimatePresence>
        {showSuccessAnim && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
          >
            {/* Customize success burst colors/size here. */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="h-24 w-24 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-2xl"
            >
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                <motion.path
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
              className={`relative h-full transition-transform duration-300 ${
                selectedPackage === pkg.id ? 'scale-105 shadow-xl rounded-lg z-10' : 'z-0'
              }`}
            >
              {isCurrentPlan && (
                <motion.div
                  className="absolute -inset-[1.5px] rounded-lg"
                  style={{
                    background: 'linear-gradient(120deg, rgba(56,189,248,0.8), rgba(16,185,129,0.8), rgba(99,102,241,0.8), rgba(56,189,248,0.8))',
                    backgroundSize: '220% 220%',
                  }}
                  // Adjust active tier shimmer speed/colors here.
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <div
                className={`relative h-full flex flex-col rounded-lg border-2 p-6 bg-white transition-colors ${
                  selectedPackage === pkg.id
                    ? 'border-primary'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {selectedPackage === pkg.id && (
                  <div className="absolute inset-0 bg-primary/5 rounded-lg pointer-events-none" />
                )}

              {isCurrentPlan && (
                <div className="absolute top-0 right-0 -mt-2 -mr-2 z-20">
                   <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-green-500 rounded-full">
                     Aktif
                   </span>
                </div>
              )}
              
              <div className="text-center relative z-10">
                <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                <div className="mt-4">
                  <span className="text-3xl font-bold">Rp {pkg.price.toLocaleString()}</span>
                  <span className="text-gray-600">/bulan</span>
                </div>
              </div>

              <ul className="mt-6 mb-8 space-y-3 flex-grow relative z-10">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPackage(pkg.id)}
                disabled={isCurrentPlan}
                className={`mt-auto w-full py-2.5 rounded-md font-medium transition-colors relative z-10 ${
                  selectedPackage === pkg.id
                    ? 'bg-primary text-white shadow-md hover:bg-primary/90'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                } ${isCurrentPlan ? 'cursor-default opacity-90' : ''}`}
              >
                {isCurrentPlan ? 'Paket Saat Ini' : (selectedPackage === pkg.id ? 'Dipilih' : 'Pilih Paket')}
              </button>
            </div>
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

        <p className="mt-4 text-sm text-gray-500">
          Pembayaran aman melalui Midtrans (VA, QRIS, E-wallet)
        </p>
      </div>
    </div>
  );
}