'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  ShieldCheckIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface Permission {
  code: string;
  label: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  created_at: string;
  permissions: Array<{
    id: string;
    code: string;
    description?: string;
  }>;
}

export default function RolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [dbPermissions, setDbPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [needsSeed, setNeedsSeed] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    permission_codes: [] as string[],
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchRoles();
      fetchPermissions();
      checkPermissionsStatus();
    }
  }, [user]);

  const checkPermissionsStatus = async () => {
    try {
      const response = await fetch('/api/rbac/seed-permissions');
      if (response.ok) {
        const data = await response.json();
        setNeedsSeed(!data.seeded);
        setDbPermissions(data.permissions.map((p: any) => p.code));
      }
    } catch (error) {
      console.error('Error checking permissions status:', error);
    }
  };

  const handleSeedPermissions = async () => {
    setSeeding(true);
    try {
      const response = await fetch('/api/rbac/seed-permissions', {
        method: 'POST',
      });
      if (response.ok) {
        setNeedsSeed(false);
        fetchPermissions();
        alert('Permissions berhasil di-seed ke database!');
      } else {
        alert('Gagal seed permissions');
      }
    } catch (error) {
      console.error('Error seeding permissions:', error);
      alert('Gagal seed permissions');
    } finally {
      setSeeding(false);
    }
  };

  const fetchRoles = async () => {
    try {
      console.log('Fetching roles...');
      const response = await fetch('/api/roles', { credentials: 'include' });
      console.log('Roles response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Roles error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch roles');
      }
      
      const data = await response.json();
      console.log('Roles data:', data);
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/permissions', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleAddNew = () => {
    setEditingRole(null);
    setFormData({ name: '', permission_codes: [] });
    setFormError('');
    setShowModal(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      permission_codes: role.permissions.map(p => p.code),
    });
    setFormError('');
    setShowModal(true);
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus role ini?')) return;

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete role');
      }

      fetchRoles();
    } catch (error: any) {
      alert(error.message || 'Gagal menghapus role');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Nama role wajib diisi');
      return;
    }

    if (formData.permission_codes.length === 0) {
      setFormError('Pilih minimal satu permission');
      return;
    }

    setSubmitting(true);

    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save role');
      }

      setShowModal(false);
      fetchRoles();
    } catch (error: any) {
      setFormError(error.message || 'Gagal menyimpan role');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (code: string) => {
    const exists = formData.permission_codes.includes(code);
    setFormData({
      ...formData,
      permission_codes: exists
        ? formData.permission_codes.filter((c) => c !== code)
        : [...formData.permission_codes, code],
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data role...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Seed Permissions Alert */}
      {needsSeed && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-900">
                Permissions belum diinisialisasi di database
              </p>
              <p className="text-xs text-yellow-700">
                Klik tombol di kanan untuk seed permissions ke database
              </p>
            </div>
          </div>
          <button
            onClick={handleSeedPermissions}
            disabled={seeding}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 flex items-center"
          >
            {seeding ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Seeding...
              </>
            ) : (
              <>
                <ShieldCheckIcon className="w-4 h-4 mr-2" />
                Seed Permissions
              </>
            )}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Role & Permission</h1>
          <p className="mt-1 text-gray-600">Buat dan atur role custom dengan permission yang sesuai</p>
        </div>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Tambah Role Baru
        </button>
      </div>

      {/* Roles List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dibuat
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <ShieldCheckIcon className="w-5 h-5 text-primary mr-2" />
                    <span className="text-sm font-medium text-gray-900">{role.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 3).map((perm) => (
                      <span
                        key={perm.id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {perm.code}
                      </span>
                    ))}
                    {role.permissions.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        +{role.permissions.length - 3} lainnya
                      </span>
                    )}
                    {role.permissions.length === 0 && (
                      <span className="text-sm text-gray-500">Tidak ada permission</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(role.created_at).toLocaleDateString('id-ID')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(role)}
                    className="text-primary hover:text-primary/80 mr-3"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {roles.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheckIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada role custom</h3>
            <p className="text-gray-600 mb-4">Buat role pertama Anda untuk mulai mengatur permission karyawan</p>
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Tambah Role Pertama
            </button>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Tips Penggunaan Role</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Buat role sesuai dengan posisi/jabatan di restoran Anda</li>
          <li>Pilih permission yang sesuai dengan tanggung jawab setiap role</li>
          <li>Role yang sudah digunakan karyawan tidak dapat dihapus</li>
          <li>Perubahan permission role akan langsung berlaku untuk semua karyawan dengan role tersebut</li>
        </ul>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingRole ? 'Edit Role' : 'Tambah Role Baru'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {formError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              <form id="role-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Role Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Role *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Supervisor, Bartender, Kasir Utama"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                    required
                  />
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Permissions *
                  </label>
                  <div className="space-y-2">
                    {permissions.map((permission) => {
                      const enabled = formData.permission_codes.includes(permission.code);
                      return (
                        <div
                          key={permission.code}
                          className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 bg-slate-50/60"
                        >
                          <div className="pr-4">
                            <p className="text-sm font-semibold text-slate-900">{permission.label}</p>
                            <p className="text-xs text-slate-500">{permission.description || permission.code}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => togglePermission(permission.code)}
                            // Customize switch color/theme here.
                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 ${
                              enabled ? 'bg-gradient-to-r from-primary to-blue-500' : 'bg-slate-300'
                            }`}
                          >
                            <motion.span
                              className="inline-block h-6 w-6 rounded-full bg-white shadow"
                              // Tune spring behavior here.
                              animate={{ x: enabled ? 30 : 2 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="border-t p-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={submitting}
              >
                Batal
              </button>
              <button
                type="submit"
                form="role-form"
                disabled={submitting}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5 mr-2" />
                    {editingRole ? 'Simpan Perubahan' : 'Buat Role'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
