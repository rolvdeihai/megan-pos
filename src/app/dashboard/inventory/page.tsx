// src/app/dashboard/inventory/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider'; // Import useAuth

type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  cost_per_unit: number;
  supplier: string;
  last_restocked: string;
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    unit: 'pcs',
    current_stock: 0,
    minimum_stock: 10,
    cost_per_unit: 0,
    supplier: '',
  });

  // Gunakan useAuth hook
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchInventory();
    }
  }, [user]);

  const fetchInventory = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (!error) {
      setItems(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;
    
    // Generate SKU if empty
    const sku = formData.sku || `INV-${Date.now().toString().slice(-6)}`;
    
    const { error } = await supabase.from('inventory').insert({
      ...formData,
      sku,
      user_id: user.id,
      last_restocked: new Date().toISOString(),
    });

    if (!error) {
      setShowForm(false);
      setFormData({
        sku: '',
        name: '',
        category: '',
        unit: 'pcs',
        current_stock: 0,
        minimum_stock: 10,
        cost_per_unit: 0,
        supplier: '',
      });
      fetchInventory();
    } else {
      console.error('Error saving inventory:', error);
      alert('Gagal menyimpan item inventory');
    }
  };

  const updateStock = async (id: string, adjustment: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newStock = Math.max(0, item.current_stock + adjustment);
    
    const { error } = await supabase
      .from('inventory')
      .update({
        current_stock: newStock,
        last_restocked: adjustment > 0 ? new Date().toISOString() : item.last_restocked,
      })
      .eq('id', id);

    if (!error) {
      fetchInventory();
    } else {
      console.error('Error updating stock:', error);
      alert('Gagal update stock');
    }
  };

  // Tampilkan loading jika auth masih loading
  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data inventory...</p>
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
          <p className="text-gray-600">Silakan login untuk mengelola inventory.</p>
        </div>
      </div>
    );
  }

  const lowStockItems = items.filter(item => item.current_stock <= item.minimum_stock);

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Inventory</h1>
          {lowStockItems.length > 0 && (
            <div className="mt-2 text-sm text-red-600">
              ⚠️ {lowStockItems.length} item perlu restock
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Tambah Item
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Tambah Item Inventory</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  SKU (optional)
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nama Item *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kategori
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pcs">Pieces</option>
                  <option value="kg">Kilogram</option>
                  <option value="gram">Gram</option>
                  <option value="liter">Liter</option>
                  <option value="pack">Pack</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stock Awal
                </label>
                <input
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) =>
                    setFormData({ ...formData, current_stock: parseFloat(e.target.value) })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Stock
                </label>
                <input
                  type="number"
                  value={formData.minimum_stock}
                  onChange={(e) =>
                    setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Harga Beli per Unit
                </label>
                <input
                  type="number"
                  value={formData.cost_per_unit}
                  onChange={(e) =>
                    setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Supplier
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Simpan
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Harga Beli
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr
                key={item.id}
                className={item.current_stock <= item.minimum_stock ? 'bg-red-50' : ''}
              >
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                  {item.sku}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {item.name}
                  </div>
                  <div className="text-sm text-gray-500">{item.category}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm font-medium">
                      {item.current_stock} {item.unit}
                    </span>
                    {item.current_stock <= item.minimum_stock && (
                      <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Rendah
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {item.minimum_stock} {item.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  Rp {item.cost_per_unit.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {item.supplier}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateStock(item.id, 1)}
                      className="text-green-600 hover:text-green-900"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => updateStock(item.id, -1)}
                      className="text-red-600 hover:text-red-900"
                      disabled={item.current_stock <= 0}
                    >
                      -1
                    </button>
                    <button
                      onClick={() => updateStock(item.id, 10)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      +10
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}