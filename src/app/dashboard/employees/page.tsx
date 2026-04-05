// src/app/dashboard/employees/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { AnimatePresence, motion } from 'framer-motion';

type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'cashier' | 'kitchen' | 'waiter' | 'manager';
  role_id: string | null;
  is_active: boolean;
  daily_rate?: number;
  monthly_salary?: number;
  pin_code?: string;
  created_at: string;
};

type CustomRole = {
  id: string;
  name: string;
};

// Legacy roles for backward compatibility
const legacyRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'cashier', label: 'Kasir' },
  { value: 'kitchen', label: 'Dapur' },
  { value: 'waiter', label: 'Pelayan' },
  { value: 'manager', label: 'Manager' },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [useCustomRole, setUseCustomRole] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'cashier' as Employee['role'],
    role_id: '',
    daily_rate: '',
    monthly_salary: '',
    pin_code: '',
  });

  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.id) {
      fetchEmployees();
      fetchCustomRoles();
    }
  }, [user]);

  const fetchEmployees = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setEmployees(data || []);
    } else {
      console.error('Error fetching employees:', error);
    }
    setLoading(false);
  };

  const fetchCustomRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        setCustomRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Error fetching custom roles:', error);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    const hasCustomRole = !!employee.role_id;
    setUseCustomRole(hasCustomRole);
    setFormData({
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      daily_rate: employee.daily_rate?.toString() || '',
      monthly_salary: employee.monthly_salary?.toString() || '',
      role_id: employee.role_id || '',
      pin_code: employee.pin_code || ''
    });
    setShowForm(true);
  };

  // Generate random 4-digit PIN
  const generatePIN = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setUseCustomRole(false);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      role: 'cashier',
      role_id: '',
      daily_rate: '',
      monthly_salary: '',
      pin_code: generatePIN(),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      // Prepare data
      const submitData: any = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
      };

      // Set role based on selection
      if (useCustomRole && formData.role_id) {
        submitData.role_id = formData.role_id;
        // Keep legacy role for backward compatibility
        submitData.role = 'admin';
      } else {
        submitData.role = formData.role;
        submitData.role_id = null;
      }

      if (editingEmployee) {
        // --- MODE EDIT ---
        // Siapkan data update
        const updateData: any = {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
          monthly_salary: formData.monthly_salary ? parseFloat(formData.monthly_salary) : null,
        };

        const { error } = await supabase
          .from('employees')
          .update(submitData)
          .eq('id', editingEmployee.id);

        if (error) throw error;

        alert('Data karyawan berhasil diperbarui');
      } else {
        // --- ENFORCE STAFF LOCATION LIMITS ---
        let tier = user.subscription_tier || 'basic';
        if (tier === 'free') tier = 'basic';
        let maxStaff = 1; // basic
        if (tier === 'pro') maxStaff = 3;
        if (tier === 'enterprise') maxStaff = 10;

        // Query active staff
        const { count, error: countError } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (!countError && count !== null && count >= maxStaff) {
          if (confirm(`Batas maksimum ${maxStaff} staff untuk paket ${tier.toUpperCase()} telah tercapai. Apakah Anda ingin meng-upgrade paket?`)) {
            router.push('/dashboard/billing');
          }
          return;
        }
        // -------------------------------------

        const employeeCode = `EMP${Date.now().toString().slice(-6)}`;
        submitData.employee_code = employeeCode;
        submitData.user_id = user.id;
        submitData.created_by = user.id;
        // Add PIN code (required for new employees)
        submitData.pin_code = formData.pin_code || generatePIN();

        const { error } = await supabase.from('employees').insert(submitData);

        if (error) throw error;
        alert('Karyawan berhasil ditambahkan');
      }

      setShowForm(false);
      setEditingEmployee(null);
      setFormData({
        full_name: '', email: '', phone: '', role: 'cashier', role_id: '', daily_rate: '', monthly_salary: '', pin_code: '',
      });
      fetchEmployees();

    } catch (error) {
      console.error('Error saving employee:', error);
      alert(editingEmployee ? 'Gagal memperbarui data' : 'Gagal menambahkan karyawan');
    }
  };

  const toggleEmployeeStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('employees')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      fetchEmployees();
    } else {
      console.error('Error updating status:', error);
      alert('Gagal mengubah status');
    }
  };

  const getRoleLabel = (employee: Employee) => {
    if (employee.role_id) {
      const customRole = customRoles.find(r => r.id === employee.role_id);
      if (customRole) return customRole.name;
    }
    return legacyRoles.find(r => r.value === employee.role)?.label || employee.role;
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data karyawan...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Anda belum login</h2>
          <p className="text-gray-600">Silakan login untuk mengelola karyawan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Karyawan</h1>
          <p className="mt-1 text-gray-600">Kelola karyawan dan atur role akses mereka</p>
        </div>
        <div className="flex space-x-3">
          <a
            href="/dashboard/roles"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            ⚙️ Kelola Role
          </a>
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            + Tambah Karyawan
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow border-l-4 border-primary">
          <h2 className="text-lg font-semibold mb-4">
            {editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  No. Telepon
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* PIN Code - Required for new employees */}
              {!editingEmployee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    PIN Karyawan *
                  </label>
                  <div className="mt-1 flex space-x-2">
                    <input
                      type="text"
                      required
                      maxLength={4}
                      minLength={4}
                      pattern="\d{4}"
                      value={formData.pin_code}
                      onChange={(e) => setFormData({ ...formData, pin_code: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="4 digit angka"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/30 focus:border-primary font-mono tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pin_code: generatePIN() })}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm whitespace-nowrap"
                    >
                      🎲 Generate
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    PIN digunakan untuk login di halaman staff. Wajib 4 digit angka.
                  </p>
                </div>
              )}

              {/* Role Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>

                {/* Toggle between Legacy and Custom Role */}
                <div className="flex items-center space-x-4 mb-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!useCustomRole}
                      onChange={() => setUseCustomRole(false)}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700">Role Standar</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={useCustomRole}
                      onChange={() => setUseCustomRole(true)}
                      className="text-primary focus:ring-primary"
                      disabled={customRoles.length === 0}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Role Custom {customRoles.length === 0 && '(Belum ada)'}
                    </span>
                  </label>
                </div>

                {/* Legacy Role Select */}
                {!useCustomRole && (
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Employee['role'] })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/30 focus:border-primary"
                  >
                    {legacyRoles.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                )}

                {/* Custom Role Select */}
                {useCustomRole && (
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/30 focus:border-primary"
                    required
                  >
                    <option value="">Pilih Role Custom...</option>
                    {customRoles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                )}

                {customRoles.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    Belum ada role custom.{' '}
                    <a href="/dashboard/roles" className="text-primary hover:underline">
                      Buat role custom
                    </a>
                  </p>
                )}
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Gaji Bulanan Pokok (Opsional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.monthly_salary}
                  onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                  placeholder="Bila karyawan digaji bulanan tetap"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rate Gaji Harian (Opsional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.daily_rate}
                  onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                  placeholder="Gaji per kedatangan"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary/90"
              >
                {editingEmployee ? 'Simpan Perubahan' : 'Simpan Karyawan'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {employees.map((employee, index) => {
          const initials = employee.full_name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((n) => n[0]?.toUpperCase())
            .join('');
          const expanded = expandedEmployeeId === employee.id;

          return (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: index * 0.04 }}
              // Adjust hover tilt/scale style here.
              whileHover={{ scale: 1.02, rotateX: 1, rotateY: -1 }}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/85 backdrop-blur-sm p-5 shadow-sm hover:shadow-[0_16px_45px_-20px_rgba(37,99,235,0.55)]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/45 via-transparent to-primary/10" />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-blue-500 text-white flex items-center justify-center font-semibold shadow-md">
                      {/* Replace with your avatar placeholder image if needed. */}
                      {initials || 'EM'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{employee.full_name}</h3>
                      <p className="text-xs text-slate-500 font-mono">{employee.employee_code}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${employee.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                    {employee.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${employee.role_id ? 'bg-purple-100 text-purple-800' : 'bg-primary/10 text-primary'}`}>
                    {getRoleLabel(employee)}{employee.role_id && ' (Custom)'}
                  </span>
                  <span className="px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-600 font-mono">
                    PIN: {employee.pin_code || 'N/A'}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => setExpandedEmployeeId(expanded ? null : employee.id)}
                    className="px-3 py-2 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                  >
                    {expanded ? 'Sembunyikan Detail' : 'Lihat Detail'}
                  </button>
                  <button
                    onClick={() => toggleEmployeeStatus(employee.id, employee.is_active)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg ${employee.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                  >
                    {employee.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleEdit(employee)}
                    className="px-3 py-2 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
                  >
                    Edit
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 border-t pt-4 text-sm text-slate-600 space-y-1">
                        <p>Email: {employee.email || '-'}</p>
                        <p>Telepon: {employee.phone || '-'}</p>
                        <p>Gaji Bulanan: {employee.monthly_salary ? `Rp ${employee.monthly_salary.toLocaleString('id-ID')}` : '-'}</p>
                        <p>Rate Harian: {employee.daily_rate ? `Rp ${employee.daily_rate.toLocaleString('id-ID')}` : '-'}</p>
                        <p>Bergabung: {new Date(employee.created_at).toLocaleDateString('id-ID')}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
      {employees.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Belum ada karyawan. Klik "+ Tambah Karyawan" untuk memulai.
        </div>
      )}
    </div>
  );
}