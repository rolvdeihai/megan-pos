// src/app/dashboard/employees/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'cashier' | 'kitchen' | 'waiter' | 'manager';
  is_active: boolean;
  pin_code: string;
  created_at: string;
};

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'cashier', label: 'Kasir' },
  { value: 'kitchen', label: 'Dapur' },
  { value: 'waiter', label: 'Pelayan' },
  { value: 'manager', label: 'Manager' },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null); // State untuk mode Edit

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'cashier' as Employee['role'],
    pin_code: '',
  });

  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.id) {
      fetchEmployees();
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

  // Fungsi untuk membuka mode Edit
  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      pin_code: '', // Kosongkan PIN saat edit agar aman (user isi jika ingin ganti)
    });
    setShowForm(true);
  };

  // Fungsi untuk mereset form (Mode Tambah)
  const handleAddNew = () => {
    setEditingEmployee(null);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      role: 'cashier',
      pin_code: '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      if (editingEmployee) {
        // --- MODE EDIT ---
        // Siapkan data update
        const updateData: any = {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
        };

        // Hanya update PIN jika user mengisinya (tidak kosong)
        if (formData.pin_code && formData.pin_code.length === 4) {
          updateData.pin_code = formData.pin_code;
        }

        const { error } = await supabase
          .from('employees')
          .update(updateData)
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

        // --- MODE TAMBAH BARU ---
        const employeeCode = `EMP${Date.now().toString().slice(-6)}`;

        const { error } = await supabase.from('employees').insert({
          ...formData,
          employee_code: employeeCode,
          user_id: user.id,
          created_by: user.id,
        });

        if (error) throw error;
        alert('Karyawan berhasil ditambahkan');
      }

      // Reset dan tutup form
      setShowForm(false);
      setEditingEmployee(null);
      setFormData({
        full_name: '', email: '', phone: '', role: 'cashier', pin_code: '',
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Karyawan</h1>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          + Tambah Karyawan
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow border-l-4 border-primary">
          <h2 className="text-lg font-semibold mb-4">
            {editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nama Lengkap
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
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Employee['role'] })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary/30 focus:border-primary"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  PIN Code (4 digit) {editingEmployee && <span className="text-xs text-gray-400 font-normal">- Isi hanya jika ingin mengubah</span>}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d{4}"
                  value={formData.pin_code}
                  onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                  placeholder={editingEmployee ? "****" : "Contoh: 1234"}
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{employee.employee_code}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                  <div className="text-sm text-gray-500">{employee.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-primary capitalize">
                    {employee.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {employee.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => toggleEmployeeStatus(employee.id, employee.is_active)}
                    className={`${employee.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                      }`}
                  >
                    {employee.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleEdit(employee)}
                    className="text-primary hover:text-primary underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Belum ada karyawan. Klik "+ Tambah Karyawan" untuk memulai.
          </div>
        )}
      </div>
    </div>
  );
}