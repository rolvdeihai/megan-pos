'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CogIcon, BellIcon, CreditCardIcon, UserIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/auth/AuthProvider';
import ThemeSettings from '@/components/settings/ThemeSettings';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import OTPInput from '@/components/auth/OTPInput';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [userData, setUserData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [copiedStaff, setCopiedStaff] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  const { user, isLoading: authLoading } = useAuth();

  const [generalForm, setGeneralForm] = useState({
    restaurant_name: '',
    phone: '',
    address: '',
    email: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStep, setPasswordStep] = useState<'otp' | 'newPassword'>('otp');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [businessForm, setBusinessForm] = useState({
    tax_percentage: 10,
    service_charge_percentage: 0,
    delivery_fee: 0,
    enable_online_orders: true,
    enable_table_selection: true,
    enable_delivery: true,
    business_hours: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '23:00' },
      saturday: { open: '09:00', close: '23:00' },
      sunday: { open: '09:00', close: '22:00' },
    },
  });

  const [appearanceForm, setAppearanceForm] = useState({
    primary_color: '#3B82F6',
    secondary_color: '#1F2937',
    logo_url: '',
  });

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
    setBaseUrl(window.location.origin);
  }, [user]);

  const fetchData = async () => {
    if (!user?.id) return;
    
    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      setUserData(userData);
      setGeneralForm({
        restaurant_name: userData?.restaurant_name || '',
        phone: userData?.phone || '',
        address: '',
        email: user.email || '',
      });

      const { data: settingsData, error: settingsError } = await supabase
        .from('restaurant_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }
      
      setSettings(settingsData);

      if (settingsData) {
        setBusinessForm({
          tax_percentage: settingsData.tax_percentage || 10,
          service_charge_percentage: settingsData.service_charge_percentage || 0,
          delivery_fee: settingsData.delivery_fee || 0,
          enable_online_orders: settingsData.enable_online_orders ?? true,
          enable_table_selection: settingsData.enable_table_selection ?? true,
          enable_delivery: settingsData.enable_delivery ?? true,
          business_hours: settingsData.business_hours || businessForm.business_hours,
        });

        setAppearanceForm({
          primary_color: settingsData.primary_color || '#3B82F6',
          secondary_color: settingsData.secondary_color || '#1F2937',
          logo_url: settingsData.logo_url || '',
        });
      } else {
        setBusinessForm(businessForm);
        setAppearanceForm(appearanceForm);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          restaurant_name: generalForm.restaurant_name,
          phone: generalForm.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setUserData((prev: any) => ({ ...prev, ...generalForm }));
      alert('Pengaturan umum berhasil diperbarui');
    } catch (error) {
      console.error('Error updating general settings:', error);
      alert('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!user?.email) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          type: 'forgot_password',
          name: userData?.full_name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengirim OTP');
      }

      if (data.otp) {
        console.log('DEV MODE - OTP:', data.otp);
      }

      startCountdown();
      setOtp(''); // Reset OTP input
      alert('Kode OTP telah dikirim ke email Anda');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setOtpError(true);
      return;
    }

    setSaving(true);
    setOtpError(false);

    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          otp,
          type: 'forgot_password',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP tidak valid');
      }

      setPasswordStep('newPassword');
    } catch (error: any) {
      alert(error.message);
      setOtpError(true);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (passwordForm.newPassword.length < 6) {
      alert('Password baru minimal 6 karakter');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Password baru dan konfirmasi password tidak sama');
      return;
    }

    setSaving(true);

    try {
      // Update password via API (without current password, already verified with OTP)
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengubah password');
      }

      alert('Password berhasil diubah');
      setPasswordForm({
        newPassword: '',
        confirmPassword: '',
      });
      setOtp('');
      setPasswordStep('otp');
    } catch (error: any) {
      console.error('Error changing password:', error);
      alert(error.message || 'Terjadi kesalahan saat mengubah password');
    } finally {
      setSaving(false);
    }
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);

    try {
      const payload = {
        user_id: user.id,
        tax_percentage: businessForm.tax_percentage,
        service_charge_percentage: businessForm.service_charge_percentage,
        delivery_fee: businessForm.delivery_fee,
        enable_online_orders: businessForm.enable_online_orders,
        enable_table_selection: businessForm.enable_table_selection,
        enable_delivery: businessForm.enable_delivery,
        business_hours: businessForm.business_hours,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (settings) {
        const res = await supabase.from('restaurant_settings').update(payload).eq('user_id', user.id);
        error = res.error;
      } else {
        const res = await supabase.from('restaurant_settings').insert(payload);
        error = res.error;
      }

      if (error) throw error;
      
      alert('Pengaturan bisnis berhasil diperbarui');
      fetchData();
    } catch (error) {
      console.error('Error updating business settings:', error);
      alert('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleAppearanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);

    try {
      const payload = {
        user_id: user.id,
        primary_color: appearanceForm.primary_color,
        secondary_color: appearanceForm.secondary_color,
        logo_url: appearanceForm.logo_url,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (settings) {
         const res = await supabase.from('restaurant_settings').update(payload).eq('user_id', user.id);
         error = res.error;
      } else {
         const res = await supabase.from('restaurant_settings').insert(payload);
         error = res.error;
      }

      if (error) throw error;

      alert('Pengaturan tampilan berhasil diperbarui');
      fetchData();
    } catch (error) {
      console.error('Error updating appearance:', error);
      alert('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, type: 'restaurant' | 'staff') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'restaurant') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedStaff(true);
        setTimeout(() => setCopiedStaff(false), 2000);
      }
    });
  };

  const days = [
    { key: 'monday', label: 'Senin' },
    { key: 'tuesday', label: 'Selasa' },
    { key: 'wednesday', label: 'Rabu' },
    { key: 'thursday', label: 'Kamis' },
    { key: 'friday', label: 'Jumat' },
    { key: 'saturday', label: 'Sabtu' },
    { key: 'sunday', label: 'Minggu' },
  ];

  if (authLoading || loading) return <div className="max-w-7xl mx-auto py-8 flex justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Anda belum login</h2>
          <p className="text-gray-600">Silakan login untuk mengakses pengaturan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
        <p className="mt-2 text-gray-600">Kelola pengaturan restoran Anda</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-xl shadow p-4 sticky top-8">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${activeTab === 'general'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <UserIcon className="w-5 h-5 mr-3" />
                Informasi Umum
              </button>
              <button
                onClick={() => setActiveTab('business')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${activeTab === 'business'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <CreditCardIcon className="w-5 h-5 mr-3" />
                Pengaturan Bisnis
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${activeTab === 'appearance'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <CogIcon className="w-5 h-5 mr-3" />
                Tampilan
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${activeTab === 'notifications'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <BellIcon className="w-5 h-5 mr-3" />
                Notifikasi
              </button>
            </nav>

            <div className="mt-8 pt-8 border-t">
              <div className="text-sm text-gray-600 mb-2">URL Restoran Anda:</div>
              <div className="font-medium text-primary break-all mb-1">
                {baseUrl}/{userData?.restaurant_slug}
              </div>
              <div className="flex items-center justify-between mb-2">
                <a
                  href={`/${userData?.restaurant_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  👀 Preview →
                </a>
                <button
                  onClick={() => copyToClipboard(`${baseUrl}/${userData?.restaurant_slug}`, 'restaurant')}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                >
                  <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                  {copied ? 'Tersalin!' : 'Salin'}
                </button>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600 mb-2">URL Login Pegawai:</div>
                <div className="font-medium text-green-600 break-all mb-1">
                  {baseUrl}/{userData?.restaurant_slug}/staff-login
                </div>
                <div className="flex items-center justify-between">
                  <a
                    href={`/${userData?.restaurant_slug}/staff-login`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    👨‍🍳 Login →
                  </a>
                  <button
                    onClick={() => copyToClipboard(`${baseUrl}/${userData?.restaurant_slug}/staff-login`, 'staff')}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                    {copiedStaff ? 'Tersalin!' : 'Salin'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Bagikan link ini ke pegawai untuk login dengan PIN
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4">
          {activeTab === 'general' && (
            <div className="bg-white rounded-xl shadow p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Informasi Umum</h2>

              <form onSubmit={handleGeneralSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Restoran *
                  </label>
                  <input
                    type="text"
                    required
                    value={generalForm.restaurant_name}
                    onChange={(e) => setGeneralForm({ ...generalForm, restaurant_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={generalForm.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Email tidak dapat diubah
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nomor Telepon *
                    </label>
                    <input
                      type="tel"
                      required
                      value={generalForm.phone}
                      onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alamat Restoran
                  </label>
                  <textarea
                    value={generalForm.address}
                    onChange={(e) => setGeneralForm({ ...generalForm, address: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                    placeholder="Alamat lengkap restoran"
                  />
                </div>

                {/* Change Password Section */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ganti Password</h3>
                  
                  {passwordStep === 'otp' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Kode OTP akan dikirim ke email: <span className="font-medium">{user?.email}</span>
                      </p>
                      
                      {/* OTP Input - always show when in otp step */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Kode OTP
                          </label>
                          <OTPInput
                            length={6}
                            value={otp}
                            onChange={setOtp}
                            disabled={saving}
                            error={otpError}
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handleVerifyOTP}
                            disabled={saving || otp.length !== 6}
                            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50"
                          >
                            {saving ? 'Memverifikasi...' : 'Verifikasi OTP'}
                          </button>
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={saving || countdown > 0}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                          >
                            {countdown > 0 ? `Kirim ulang (${countdown}s)` : 'Kirim OTP'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {passwordStep === 'newPassword' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password Baru
                        </label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                          placeholder="Minimal 6 karakter"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Konfirmasi Password Baru
                        </label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                          placeholder="Ulangi password baru"
                        />
                      </div>
                    </div>
                  )}
                  
                  {passwordStep === 'newPassword' && (
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={handlePasswordSubmit}
                        disabled={saving || !passwordForm.newPassword || !passwordForm.confirmPassword}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50"
                      >
                        {saving ? 'Menyimpan...' : 'Simpan Password Baru'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordStep('otp');
                          setOtp('');
                          setPasswordForm({ newPassword: '', confirmPassword: '' });
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-6 border-t">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="bg-white rounded-xl shadow p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Pengaturan Bisnis</h2>

              <form onSubmit={handleBusinessSubmit} className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Pajak & Biaya</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pajak (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={businessForm.tax_percentage}
                        onChange={(e) => setBusinessForm({ ...businessForm, tax_percentage: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service Charge (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={businessForm.service_charge_percentage}
                        onChange={(e) => setBusinessForm({ ...businessForm, service_charge_percentage: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Biaya Pengiriman (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={businessForm.delivery_fee}
                        onChange={(e) => setBusinessForm({ ...businessForm, delivery_fee: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Fitur</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Pemesanan Online</h4>
                        <p className="text-sm text-gray-600">Aktifkan pemesanan melalui website</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={businessForm.enable_online_orders}
                          onChange={(e) => setBusinessForm({ ...businessForm, enable_online_orders: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Pemilihan Meja</h4>
                        <p className="text-sm text-gray-600">Customer bisa pilih meja saat order</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={businessForm.enable_table_selection}
                          onChange={(e) => setBusinessForm({ ...businessForm, enable_table_selection: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Pengiriman</h4>
                        <p className="text-sm text-gray-600">Aktifkan opsi pengiriman makanan</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={businessForm.enable_delivery}
                          onChange={(e) => setBusinessForm({ ...businessForm, enable_delivery: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Jam Operasional</h3>
                  <div className="space-y-4">
                    {days.map((day) => (
                      <div key={day.key} className="flex items-center justify-between">
                        <div className="w-32 font-medium text-gray-700">{day.label}</div>
                        <div className="flex-1 flex items-center space-x-4">
                          <input
                            type="time"
                            value={businessForm.business_hours[day.key as keyof typeof businessForm.business_hours].open}
                            onChange={(e) => {
                              const newHours = { ...businessForm.business_hours };
                              newHours[day.key as keyof typeof businessForm.business_hours].open = e.target.value;
                              setBusinessForm({ ...businessForm, business_hours: newHours });
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <span className="text-gray-500">sampai</span>
                          <input
                            type="time"
                            value={businessForm.business_hours[day.key as keyof typeof businessForm.business_hours].close}
                            onChange={(e) => {
                              const newHours = { ...businessForm.business_hours };
                              newHours[day.key as keyof typeof businessForm.business_hours].close = e.target.value;
                              setBusinessForm({ ...businessForm, business_hours: newHours });
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'appearance' && (
            <ThemeSettings />
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Pengaturan Notifikasi</h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Email Notifikasi</h4>
                    <p className="text-sm text-gray-600">Terima notifikasi order baru via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Notifikasi WhatsApp</h4>
                    <p className="text-sm text-gray-600">Terima notifikasi order via WhatsApp</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Notifikasi Browser</h4>
                    <p className="text-sm text-gray-600">Tampilkan notifikasi di browser</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Nomor WhatsApp Notifikasi</h4>
                  <input
                    type="tel"
                    className="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                    placeholder="08xxxxxxxxxx"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Nomor ini akan menerima notifikasi order baru
                  </p>
                </div>

                <div className="flex justify-end pt-6 border-t">
                  <button
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
                  >
                    Simpan Pengaturan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}