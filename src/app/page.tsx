'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon,
  ShoppingBagIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  ShieldCheckIcon,
  CloudIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const { user } = useAuth();
  const isThemed = Boolean(user);
  // Edit: Updated primary button styling to use warm glow and softer corners with larger tap padding.
  const primaryButtonClass = isThemed
    ? 'bg-primary hover:bg-primary/90 shadow-glow rounded-2xl px-5 py-3 md:px-6 md:py-3.5'
    : 'bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 shadow-glow rounded-2xl px-5 py-3 md:px-6 md:py-3.5';
  const primaryTextClass = isThemed ? 'text-primary' : 'text-blue-600';
  const primaryHoverTextClass = isThemed ? 'hover:text-primary' : 'hover:text-blue-600';

  const features = [
    {
      icon: <ShoppingBagIcon className="w-8 h-8" />,
      title: 'Manajemen Order Lengkap',
      description: 'Kelola order dine-in, takeaway, dan delivery dalam satu sistem terintegrasi',
      // Edit: Updated feature color to warm primary tone.
      color: 'text-primary bg-primary/10'
    },
    {
      icon: <BuildingStorefrontIcon className="w-8 h-8" />,
      title: 'Menu & Inventory',
      description: 'Kelola menu, stok bahan baku, dan atur ketersediaan item secara real-time',
      // Edit: Updated feature color to warm secondary tone.
      color: 'text-secondary bg-secondary/10'
    },
    {
      icon: <ChartBarIcon className="w-8 h-8" />,
      title: 'Laporan & Analitik',
      description: 'Dashboard lengkap dengan laporan penjualan, keuangan, dan analitik bisnis',
      // Edit: Updated feature color to warm primary tone.
      color: 'text-primary bg-primary/10'
    },
    {
      icon: <DevicePhoneMobileIcon className="w-8 h-8" />,
      title: 'Website & Menu Online',
      description: 'Website otomatis dengan menu online untuk pemesanan dari pelanggan',
      // Edit: Updated feature color to warm secondary tone.
      color: 'text-secondary bg-secondary/10'
    },
    {
      icon: <UserGroupIcon className="w-8 h-8" />,
      title: 'Manajemen Karyawan',
      description: 'Kelola staff dengan berbagai role: admin, kasir, dapur, dan pelayan',
      // Edit: Updated feature color to warm primary tone.
      color: 'text-primary bg-primary/10'
    },
    {
      icon: <CurrencyDollarIcon className="w-8 h-8" />,
      title: 'Multi Payment',
      description: 'Dukung berbagai metode pembayaran: cash, QRIS, kartu, dan transfer',
      // Edit: Updated feature color to warm secondary tone.
      color: 'text-secondary bg-secondary/10'
    }
  ];

  const pricingPlans = [
    {
      name: 'Basic',
      price: '300K',
      period: '/bulan',
      features: [
        'Max 100 transaksi/bulan',
        '1 admin user',
        'Manajemen menu',
        'Website menu online',
        'Laporan dasar',
        'Email support'
      ],
      recommended: false,
      color: 'border-gray-200'
    },
    {
      name: 'Pro',
      price: '500K',
      period: '/bulan',
      features: [
        'Unlimited transaksi',
        '3 staff users',
        'Inventory management',
        'Laporan lengkap',
        'Priority support',
        'Analitik penjualan'
      ],
      recommended: true,
      color: 'border-blue-500 border-2'
    },
    {
      name: 'Corporate', // renamed from Enterprise
      price: '800K',
      period: '/bulan',
      features: [
        'Unlimited transaksi',
        '10 staff users',
        'Semua fitur Pro',
        'API Access',
        'Custom development',
        '24/7 support'
      ],
      recommended: false,
      color: 'border-gray-200'
    }
  ];

  const testimonials = [
    {
      name: 'Budi Santoso',
      role: 'Owner Warung Makan Sederhana',
      content: 'Setelah pakai Megan POS, operasional restoran saya jadi lebih efisien. Order online dari pelanggan langsung masuk ke sistem, tidak perlu telpon lagi.',
      avatar: 'BS'
    },
    {
      name: 'Sari Wijaya',
      role: 'Manager Cafe Aroma',
      content: 'Laporan penjualan yang detail membantu saya mengambil keputusan bisnis yang lebih baik. Fitur inventorynya sangat membantu mengurangi waste.',
      avatar: 'SW'
    },
    {
      name: 'Andi Pratama',
      role: 'Pemilik Restoran Padang',
      content: 'Website otomatis untuk menu online sangat membantu. Pelanggan bisa pesan langsung, staf kami fokus melayani di tempat.',
      avatar: 'AP'
    }
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      alert(`Terima kasih! Kami akan mengirim informasi ke ${email}`);
      setEmail('');
    }
  };

  // Edit: Switched page base background to warm off-white for appetizing vibe.
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-sm z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold">M</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Megan POS</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600">Fitur</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600">Harga</a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600">Testimoni</a>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className={`${primaryTextClass} ${primaryHoverTextClass} font-medium`}
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className={`${primaryButtonClass} text-white px-4 py-2 rounded-lg font-medium`}
              >
                Daftar Gratis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      {/* // Edit: Updated hero gradient to warm tones. */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#FFF5F5] via-[#FAFAFA] to-[#FFF0E6]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* // Edit: Increased heading weight for stronger visual hierarchy. */}
              <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
                Kelola Restoran Anda dengan
                <span className="text-blue-600"> Sistem Modern</span>
              </h1>
              <p className="mt-6 text-xl text-gray-600">
                Megan POS membantu Anda mengelola semua aspek bisnis restoran, dari order, inventori, hingga laporan keuangan, dalam satu platform terintegrasi.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                {/* // Edit: Enlarged CTA tap target for tablet comfort and soft corners. */}
                <Link
                  href="/register"
                  className={`inline-flex items-center justify-center text-base font-medium text-white ${primaryButtonClass}`}
                >
                  Mulai Gratis 14 Hari
                  <ArrowRightIcon className="ml-2 w-5 h-5" />
                </Link>
                {/* // Edit: Enlarged secondary CTA tap target and softened corner radius. */}
                <a
                  href="#demo"
                  className="inline-flex items-center justify-center px-8 py-3.5 md:py-4 text-base font-medium rounded-2xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Lihat Demo
                </a>
              </div>
              <div className="mt-8 flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center">
                  <ClockIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span>Setup dalam 5 menit</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-2 border border-gray-200">
                <img
                  src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                  alt="Dashboard Preview"
                  className="rounded-xl w-full h-auto"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4 border">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <RocketLaunchIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <div className="font-bold text-gray-900">+250%</div>
                    <div className="text-sm text-gray-600">Growth Penjualan</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-600 mb-8">Dipercaya oleh 500+ restoran di Indonesia</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center">
            {['Restoran Padang', 'Cafe Modern', 'Warung Kopi', 'Bakery', 'Food Truck', 'Restoran Sushi'].map((name, idx) => (
              <div key={idx} className="text-center text-gray-500 font-medium">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            {/* // Edit: Increased heading weight for stronger visual hierarchy. */}
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Semua yang Anda Butuhkan dalam Satu Platform
            </h2>
            <p className="text-xl text-gray-600">
              Kelola semua aspek bisnis restoran Anda dengan mudah dan efisien
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-gray-200 p-6 md:p-7 hover:shadow-xl hover:shadow-primary/5 transition-shadow"
              >
                {/* // Edit: Upgraded feature cards with softer large corners, tablet-friendly padding, and warm hover shadow. */}
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${feature.color} mb-6`}>
                  {feature.icon}
                </div>
                {/* // Edit: Increased heading weight for stronger visual hierarchy. */}
                <h3 className="text-xl font-extrabold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            {/* // Edit: Increased heading weight for stronger visual hierarchy. */}
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Mulai dalam 3 Langkah Mudah
            </h2>
            <p className="text-xl text-gray-600">
              Setup cepat, hasil maksimal
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Daftar & Setup',
                description: 'Buat akun gratis dan setup restoran Anda dalam 5 menit'
              },
              {
                step: '02',
                title: 'Atur Menu & Staff',
                description: 'Upload menu dan tambahkan staff dengan role yang sesuai'
              },
              {
                step: '03',
                title: 'Mulai Operasional',
                description: 'Terima order dari berbagai channel dan kelola dengan mudah'
              }
            ].map((item, idx) => (
              <div key={idx} className="relative">
                {/* // Edit: Softened process card corners and hover depth for premium tactile feel. */}
                <div className="bg-white rounded-[2rem] shadow-lg p-8 hover:shadow-xl hover:shadow-primary/5 transition-shadow">
                  <div className="text-4xl font-bold text-blue-600 mb-4">
                    {item.step}
                  </div>
                  {/* // Edit: Increased heading weight for stronger visual hierarchy. */}
                  <h3 className="text-xl font-extrabold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600">
                    {item.description}
                  </p>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <div className="w-8 h-0.5 bg-blue-200"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            {/* // Edit: Increased heading weight for stronger visual hierarchy. */}
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Paket Harga Terjangkau
            </h2>
            <p className="text-xl text-gray-600">
              Pilih paket yang sesuai dengan kebutuhan bisnis Anda
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-[2rem] shadow-lg hover:shadow-xl hover:shadow-primary/5 ${plan.color} p-8 md:p-9 relative transition-shadow`}
              >
                {/* // Edit: Upgraded pricing cards with softer corners, tablet-friendly spacing, and warm hover shadow. */}
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className={`${primaryButtonClass} text-white px-4 py-1 rounded-full text-sm font-medium`}>
                      POPULER
                    </span>
                  </div>
                )}

                {/* // Edit: Increased heading weight for stronger visual hierarchy. */}
                <h3 className="text-2xl font-extrabold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    Rp{plan.price}
                  </span>
                  <span className="text-gray-600 ml-2">{plan.period}</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-center">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {/* // Edit: Increased button tap area and softened corners for tablet friendliness. */}
                <Link
                  href="/register"
                  className={`block text-center py-3.5 md:py-4 rounded-2xl font-medium ${plan.recommended
                      ? `${primaryButtonClass} text-white`
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {plan.recommended ? 'Mulai Sekarang' : 'Pilih Paket'}
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600">
              Semua paket termasuk <span className="font-medium">free trial 14 hari</span>
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            {/* // Edit: Increased heading weight for stronger visual hierarchy. */}
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Dipercaya oleh Pemilik Restoran
            </h2>
            <p className="text-xl text-gray-600">
              Lihat apa kata mereka tentang Megan POS
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="bg-white rounded-[2rem] shadow-lg p-8 hover:shadow-xl hover:shadow-primary/5 transition-shadow">
                {/* // Edit: Softened testimonial card corners and hover shadow for premium consistency. */}
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-blue-600/10 rounded-full flex items-center justify-center">
                    <span className="font-bold text-blue-600">
                      {testimonial.avatar}
                    </span>
                  </div>
                  <div className="ml-4">
                    {/* // Edit: Increased heading weight for stronger visual hierarchy. */}
                    <div className="font-extrabold text-gray-900">
                      {testimonial.name}
                    </div>
                    <div className="text-gray-600">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 italic">
                  "{testimonial.content}"
                </p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {/* // Edit: Updated bottom CTA gradient to coral-tangerine blend. */}
      <section className="py-20 bg-gradient-to-r from-[#FF6B6B] to-[#FF8C42]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* // Edit: Increased heading weight for stronger visual hierarchy. */}
          <h2 className="text-4xl font-extrabold text-white mb-4">
            Siap Mengubah Cara Anda Mengelola Restoran?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Bergabung dengan 500+ restoran yang sudah menggunakan Megan POS
          </p>
          
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email Anda"
                className="flex-1 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                required
              />
              {/* // Edit: Enlarged CTA tap target and softened corners for tablet-friendly interaction. */}
              <button
                type="submit"
                className={`bg-white ${primaryTextClass} px-8 py-3.5 md:py-4 rounded-2xl font-medium ${isThemed ? 'hover:bg-primary/10' : 'hover:bg-blue-600/10'} transition-colors`}
              >
                Coba Gratis
              </button>
            </form>
            <p className="mt-4 text-blue-200 text-sm">
              Mulai gratis 14 hari. Tidak perlu kartu kredit.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold">M</span>
                </div>
                <span className="text-xl font-bold">Megan POS</span>
              </div>
              <p className="text-gray-400">
                Sistem manajemen restoran modern untuk bisnis yang lebih efisien.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-4">Produk</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white">Fitur</a></li>
                <li><a href="#pricing" className="hover:text-white">Harga</a></li>
                <li><a href="#testimonials" className="hover:text-white">Testimoni</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-4">Perusahaan</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Tentang Kami</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Karir</a></li>
                <li><a href="#" className="hover:text-white">Kontak</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Kebijakan Privasi</a></li>
                <li><a href="#" className="hover:text-white">Syarat & Ketentuan</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Megan POS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}