'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';

// Component that uses useSearchParams (must be wrapped in Suspense)
function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  // State untuk modal staff login
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffInput, setStaffInput] = useState('');
  const [staffError, setStaffError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      if (success) {
        window.location.href = redirectTo;
      } else {
        setError('Email atau password salah');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat login');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle redirect ke staff-login
  const handleStaffRedirect = () => {
    setStaffError('');
    let slug = staffInput.trim();

    if (!slug) {
      setStaffError('Masukkan URL atau kode restoran');
      return;
    }

    // Jika user memasukkan URL lengkap, ekstrak slug
    try {
      // Cek apakah input berupa URL (mengandung http:// atau https:// atau domain)
      if (slug.includes('http://') || slug.includes('https://') || slug.includes('/')) {
        let url: URL;
        if (slug.startsWith('http')) {
          url = new URL(slug);
        } else {
          // Asumsikan user memasukkan relative path seperti "restoku/staff-login"
          url = new URL(slug, window.location.origin);
        }
        // Ambil pathname, split by '/', cari segment pertama setelah host
        const pathSegments = url.pathname.split('/').filter(seg => seg);
        if (pathSegments.length > 0 && pathSegments[0] !== 'staff-login') {
          slug = pathSegments[0];
        } else if (pathSegments.length > 1 && pathSegments[0] === 'staff-login') {
          // Kasus: langsung /staff-login tanpa slug -> tidak valid
          setStaffError('Format tidak valid. Gunakan: namarestoran atau domain.com/namarestoran');
          return;
        } else {
          setStaffError('Tidak dapat menemukan kode restoran dari URL');
          return;
        }
      }
    } catch (err) {
      // Bukan URL yang valid, anggap input sebagai slug langsung
      // Lanjutkan
    }

    // Validasi slug tidak boleh kosong
    if (!slug) {
      setStaffError('Kode restoran tidak boleh kosong');
      return;
    }

    // Redirect ke halaman staff-login
    const staffLoginUrl = `${window.location.origin}/${slug}/staff-login`;
    window.location.href = staffLoginUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Login ke JetNote Pos
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistem POS tanpa verifikasi email
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="contoh@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
              Lupa password?
            </Link>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </div>

          <div className="text-center space-y-2">
            <Link href="/register" className="text-sm text-blue-600 hover:text-blue-500 block">
              Belum punya akun? Daftar
            </Link>
            {/* Tombol Staff Login */}
            <button
              type="button"
              onClick={() => setShowStaffModal(true)}
              className="text-sm text-gray-600 hover:text-gray-800 block w-full"
            >
              👨‍🍳 Staff? Login di sini
            </button>
          </div>
        </form>
      </div>

      {/* Modal untuk staff login */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Login sebagai Staff</h3>
            <p className="text-sm text-gray-600 mb-4">
              Masukkan kode restoran atau URL lengkap halaman login staff.
              <br />
              Contoh: <span className="font-mono text-xs">resto-anda</span> atau{' '}
              <span className="font-mono text-xs">https://example.com/resto-anda/staff-login</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kode / URL Restoran
              </label>
              <input
                type="text"
                value={staffInput}
                onChange={(e) => setStaffInput(e.target.value)}
                placeholder="contoh: warung-enak"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              {staffError && <p className="mt-1 text-sm text-red-600">{staffError}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowStaffModal(false);
                  setStaffInput('');
                  setStaffError('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleStaffRedirect}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}