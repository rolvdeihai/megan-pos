'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PlusIcon, PencilIcon, TrashIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import QRCode from 'react-qr-code';
import { useAuth } from '@/components/auth/AuthProvider';
import { getOwnerId } from '@/lib/user-scope';

type Table = {
  id: string;
  table_number: string;
  table_name: string;
  capacity: number;
  is_available: boolean;
  qr_code: string;
};

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({
    table_number: '',
    table_name: '',
    capacity: 4,
  });

  const { user } = useAuth();
  const ownerId = getOwnerId(user);

  useEffect(() => {
    if (ownerId) {
      fetchTables();
    }
  }, [ownerId]);

  const fetchTables = async () => {
    if (!ownerId) return;
    
    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('user_id', ownerId)
      .order('table_number');

    if (!error) {
      setTables(data || []);
    } else {
      console.error('Error fetching tables:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ownerId) return;
    
    try {
      if (editingTable) {
        // Update existing table
        const { error } = await supabase
          .from('restaurant_tables')
          .update({
            table_number: formData.table_number,
            table_name: formData.table_name,
            capacity: formData.capacity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTable.id)
          .eq('user_id', ownerId);

        if (error) throw error;
      } else {
        // Create new table
        const { error } = await supabase.from('restaurant_tables').insert({
          ...formData,
          user_id: ownerId,
          is_available: true,
        });

        if (error) throw error;
      }

      resetForm();
      fetchTables();
    } catch (error) {
      console.error('Error saving table:', error);
      alert('Terjadi kesalahan saat menyimpan meja');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingTable(null);
    setFormData({
      table_number: '',
      table_name: '',
      capacity: 4,
    });
  };

  const startEdit = (table: Table) => {
    setEditingTable(table);
    setFormData({
      table_number: table.table_number,
      table_name: table.table_name || '',
      capacity: table.capacity,
    });
    setShowForm(true);
  };

  const deleteTable = async (id: string) => {
    if (!ownerId) return;
    
    if (confirm('Apakah Anda yakin ingin menghapus meja ini?')) {
      const { error } = await supabase
        .from('restaurant_tables')
        .delete()
        .eq('id', id)
        .eq('user_id', ownerId);

      if (!error) {
        fetchTables();
      } else {
        console.error('Error deleting table:', error);
        alert('Terjadi kesalahan saat menghapus meja');
      }
    }
  };

  const toggleAvailability = async (table: Table) => {
    if (!ownerId) return;
    
    try {
      await supabase
        .from('restaurant_tables')
        .update({ is_available: !table.is_available })
        .eq('id', table.id)
        .eq('user_id', ownerId);

      fetchTables();
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const generateQRCode = async (tableId: string, tableNumber: string) => {
    if (!user?.restaurant_slug) {
      alert('Anda perlu mengatur restaurant slug terlebih dahulu di setup page');
      return;
    }
    
    try {
      const baseUrl = window.location.origin;
      const qrUrl = `${baseUrl}/${user.restaurant_slug}?table=${tableNumber}`;
      
      // Update QR URL ke database
      await supabase
        .from('restaurant_tables')
        .update({ qr_code: qrUrl })
        .eq('id', tableId)
        .eq('user_id', ownerId);

      fetchTables();
      setShowQR(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Terjadi kesalahan saat membuat QR code');
    }
  };

  const downloadQRCode = () => {
    if (!showQR) return;
    
    const svg = document.getElementById('qr-code');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `meja-${tables.find(t => t.qr_code === showQR)?.table_number || 'qr'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Anda belum login</h2>
          <p className="text-gray-600">Silakan login untuk mengelola meja.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelola Meja</h1>
          <p className="mt-2 text-gray-600">Atur meja untuk dine-in customers</p>
        </div>
        <button
          onClick={() => {
            setEditingTable(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Tambah Meja
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">
            {editingTable ? 'Edit Meja' : 'Tambah Meja Baru'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nomor Meja *
                </label>
                <input
                  type="text"
                  required
                  value={formData.table_number}
                  onChange={(e) =>
                    setFormData({ ...formData, table_number: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                  placeholder="1, 2, A1, B2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nama Meja (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.table_name}
                  onChange={(e) =>
                    setFormData({ ...formData, table_name: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                  placeholder="Meja Keluarga, Meja VIP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kapasitas (orang)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90"
              >
                {editingTable ? 'Update Meja' : 'Simpan Meja'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {tables.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <div className="text-4xl mb-4">🪑</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada meja</h3>
          <p className="text-gray-600 mb-6">Mulai dengan menambahkan meja pertama Anda</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            + Tambah Meja Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`bg-white rounded-xl shadow p-6 border-2 ${
                table.is_available
                  ? 'border-green-200 hover:border-green-300'
                  : 'border-red-200 hover:border-red-300'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {table.table_name || `Meja ${table.table_number}`}
                  </h3>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className="text-sm text-gray-600">
                      No: {table.table_number}
                    </span>
                    <span className="text-sm text-gray-600">
                      Kapasitas: {table.capacity} orang
                    </span>
                  </div>
                  {table.qr_code && (
                    <div className="mt-3 text-xs text-gray-500 truncate">
                      QR: {new URL(table.qr_code).pathname}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleAvailability(table)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    table.is_available
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
                  {table.is_available ? 'Tersedia' : 'Terisi'}
                </button>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-2">
                  <button
                    onClick={() => generateQRCode(table.id, table.table_number)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg"
                    title="Generate QR Code"
                  >
                    <QrCodeIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => startEdit(table)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Edit"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex space-x-2">
                  {table.qr_code && (
                    <button
                      onClick={() => setShowQR(table.qr_code)}
                      className="px-3 py-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-full"
                    >
                      Lihat QR
                    </button>
                  )}
                  <button
                    onClick={() => deleteTable(table.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Hapus"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">QR Code Meja</h2>
              <button
                onClick={() => setShowQR(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg border mb-4">
                <QRCode 
                  id="qr-code"
                  value={showQR} 
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                />
              </div>
              <p className="text-sm text-gray-600 mb-2 text-center break-all">
                Scan untuk memesan di meja ini
              </p>
              <p className="text-xs text-gray-500 mb-4 text-center break-all">
                {showQR}
              </p>
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={downloadQRCode}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Download QR
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(showQR)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}