// src/app/setup-restaurant/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

export default function SetupRestaurantPage() {
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    restaurant_slug: '',
    primary_color: '#3B82F6',
    secondary_color: '#1F2937',
    tax_percentage: 10,
    service_charge_percentage: 0,
    enable_online_orders: true,
    enable_table_selection: true,
    enable_delivery: true,
    delivery_fee: 0,
  });

  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings();
    }
  }, [user, authLoading]);

  const fetchSettings = async () => {
    try {
      // Fetch existing settings
      const { data: existingSettings } = await supabase
        .from('restaurant_settings')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      setSettings(existingSettings);

      // Set form data from existing settings or default
      setFormData(prev => ({
        ...prev,
        restaurant_slug: user!.restaurant_slug || generateSlug(user!),
        primary_color: existingSettings?.primary_color || '#3B82F6',
        secondary_color: existingSettings?.secondary_color || '#1F2937',
        tax_percentage: existingSettings?.tax_percentage || 10,
        service_charge_percentage: existingSettings?.service_charge_percentage || 0,
        enable_online_orders: existingSettings?.enable_online_orders ?? true,
        enable_table_selection: existingSettings?.enable_table_selection ?? true,
        enable_delivery: existingSettings?.enable_delivery ?? true,
        delivery_fee: existingSettings?.delivery_fee || 0,
      }));
    } catch (error) {
      console.error('Error fetching settings:', error);
      
      // If no settings exist, generate slug from restaurant name
      if (user?.restaurant_name) {
        setFormData(prev => ({
          ...prev,
          restaurant_slug: user.restaurant_slug || generateSlug(user),
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (userData: any) => {
    if (userData?.restaurant_name) {
      return userData.restaurant_name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }
    return `restoran-${Math.random().toString(36).substring(2, 9)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSetupLoading(true);
    setError('');

    try {
      // 1. Update user slug if it's different
      if (formData.restaurant_slug !== user.restaurant_slug) {
        const { error: userError } = await supabase
          .from('users')
          .update({
            restaurant_slug: formData.restaurant_slug,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (userError) throw userError;
      }

      // 2. Upsert restaurant settings
      const { error: settingsError } = await supabase
        .from('restaurant_settings')
        .upsert({
          id: settings?.id || undefined, // Use existing ID if available
          user_id: user.id,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          tax_percentage: formData.tax_percentage,
          service_charge_percentage: formData.service_charge_percentage,
          enable_online_orders: formData.enable_online_orders,
          enable_table_selection: formData.enable_table_selection,
          enable_delivery: formData.enable_delivery,
          delivery_fee: formData.delivery_fee,
          business_hours: settings?.business_hours || {
            monday: { open: "08:00", close: "22:00" },
            tuesday: { open: "08:00", close: "22:00" },
            wednesday: { open: "08:00", close: "22:00" },
            thursday: { open: "08:00", close: "22:00" },
            friday: { open: "08:00", close: "23:00" },
            saturday: { open: "09:00", close: "23:00" },
            sunday: { open: "09:00", close: "22:00" }
          },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id' // This ensures upsert works based on user_id
        });

      if (settingsError) throw settingsError;

      // 3. Redirect dengan hard refresh untuk update AuthProvider state
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);

    } catch (error: any) {
      console.error('Setup error:', error);
      setError(error.message || 'Terjadi kesalahan saat menyimpan pengaturan');
      setSetupLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Tampilkan loading jika auth masih loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Jika tidak ada user (belum login)
  if (!user) {
    return null; // Akan di-redirect oleh middleware
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {settings ? 'Edit Pengaturan Restoran' : 'Setup Restoran Anda'}
          </h1>
          <p className="text-lg text-gray-600">
            {settings 
              ? 'Ubah pengaturan restoran Anda kapan saja' 
              : 'Konfigurasi awal untuk memulai menggunakan JetNote Pos'}
          </p>
          <div className="mt-2 text-sm text-gray-500">
            Restoran: <span className="font-semibold">{user.restaurant_name}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-2xl p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-8">
            {/* Slug Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">URL Restoran</h2>
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom URL
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                      {typeof window !== 'undefined' && window.location.hostname}/
                    </span>
                    <input
                      type="text"
                      name="restaurant_slug"
                      value={formData.restaurant_slug}
                      onChange={handleChange}
                      required
                      pattern="[a-z0-9\-]+"
                      title="Hanya huruf kecil, angka, dan tanda hubung"
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="nama-restoran-anda"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    URL Anda akan menjadi: {typeof window !== 'undefined' && window.location.hostname}/{formData.restaurant_slug}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Pelanggan bisa mengakses menu online di: <a 
                      href={`/${formData.restaurant_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {typeof window !== 'undefined' && window.location.hostname}/{formData.restaurant_slug}
                    </a>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    restaurant_slug: generateSlug(user),
                  }))}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Generate
                </button>
              </div>
            </div>

            {/* Colors Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Warna Tema</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warna Primer
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      name="primary_color"
                      value={formData.primary_color}
                      onChange={handleChange}
                      className="w-12 h-12 cursor-pointer rounded-lg border border-gray-300"
                    />
                    <input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        primary_color: e.target.value,
                      }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warna Sekunder
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      name="secondary_color"
                      value={formData.secondary_color}
                      onChange={handleChange}
                      className="w-12 h-12 cursor-pointer rounded-lg border border-gray-300"
                    />
                    <input
                      type="text"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        secondary_color: e.target.value,
                      }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tax & Fees Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pajak & Biaya</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Persentase Pajak (%)
                  </label>
                  <input
                    type="number"
                    name="tax_percentage"
                    value={formData.tax_percentage}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Charge (%)
                  </label>
                  <input
                    type="number"
                    name="service_charge_percentage"
                    value={formData.service_charge_percentage}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Biaya Pengiriman (Rp)
                  </label>
                  <input
                    type="number"
                    name="delivery_fee"
                    value={formData.delivery_fee}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Fitur</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="enable_online_orders"
                    checked={formData.enable_online_orders}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-3 text-sm text-gray-700">
                    Aktifkan pemesanan online melalui website
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="enable_table_selection"
                    checked={formData.enable_table_selection}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-3 text-sm text-gray-700">
                    Tampilkan pilihan meja di menu online
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="enable_delivery"
                    checked={formData.enable_delivery}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-3 text-sm text-gray-700">
                    Aktifkan opsi pengiriman
                  </label>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Preview Website</h2>
              <div className="bg-gradient-to-r from-blue-50 to-gray-50 p-6 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: formData.primary_color }}>
                      {user.restaurant_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {typeof window !== 'undefined' && window.location.hostname}/{formData.restaurant_slug}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <div 
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: formData.primary_color }}
                    ></div>
                    <div 
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: formData.secondary_color }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Pajak:</span>
                    <span className="ml-2">{formData.tax_percentage}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Service Charge:</span>
                    <span className="ml-2">{formData.service_charge_percentage}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pemesanan Online:</span>
                    <span className="ml-2">
                      {formData.enable_online_orders ? '✅ Aktif' : '❌ Nonaktif'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pengiriman:</span>
                    <span className="ml-2">
                      {formData.enable_delivery ? '✅ Aktif' : '❌ Nonaktif'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Biaya Pengiriman:</span>
                    <span className="ml-2">Rp {formData.delivery_fee.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/dashboard';
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Kembali ke Dashboard
            </button>
            <button
              type="submit"
              disabled={setupLoading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center"
            >
              {setupLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Menyimpan...
                </>
              ) : (
                'Simpan Pengaturan'
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Anda bisa mengubah semua pengaturan ini kapan saja melalui menu Settings
          </p>
        </div>
      </div>
    </div>
  );
}