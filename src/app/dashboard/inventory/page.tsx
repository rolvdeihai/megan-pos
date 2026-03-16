'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { DocumentArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Tesseract from 'tesseract.js';

type ParsedInventoryItem = {
  name: string;
  sku?: string;
  category?: string;
  unit?: string;
  current_stock?: number;
  minimum_stock?: number;
  cost_per_unit?: number;
  supplier?: string;
  // transactions_connected and expense_payment_method are usually not in images, default false/cash
};

// Extend InventoryItem for temporary items
type TempInventoryItem = InventoryItem & { id: string }; // id is temporary

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
  transactions_connected: boolean;
  expense_payment_method: string;
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // new
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    unit: 'pcs',
    current_stock: 0,
    minimum_stock: 10,
    cost_per_unit: 0,
    supplier: '',
    transactions_connected: false,
    expense_payment_method: 'cash',
  });
  const [unsavedItems, setUnsavedItems] = useState<TempInventoryItem[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchInventory();
    }
  }, [user]);

  const splitTextIntoChunks = (text: string, maxCharsPerChunk: number): string[] => {
    const lines = text.split('\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const line of lines) {
      if (line.length > maxCharsPerChunk) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
        for (let i = 0; i < line.length; i += maxCharsPerChunk) {
          chunks.push(line.slice(i, i + maxCharsPerChunk));
        }
        continue;
      }

      if ((currentChunk + '\n' + line).length > maxCharsPerChunk) {
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + line : line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }
    return chunks;
  };

  const parseInventoryWithAI = async (ocrText: string): Promise<ParsedInventoryItem[]> => {
    const prompt = `Extract inventory items from the following OCR text. Return a JSON array of objects with these exact fields:
  - name (string, required)
  - sku (string, optional, if present e.g. "INV-001")
  - category (string, optional, e.g. "Bahan Pokok", "Minuman")
  - unit (string, optional, e.g. "kg", "pcs", "liter", "pack") – if not present, assume "pcs"
  - current_stock (number, optional, if a quantity is mentioned, otherwise omit or set to 0)
  - minimum_stock (number, optional, if a reorder level is mentioned, otherwise omit or set to 10)
  - cost_per_unit (number, optional, if a price per unit is mentioned, otherwise omit or set to 0)
  - supplier (string, optional, if a supplier name is mentioned)

  Only include items that are clearly inventory items (goods, ingredients, supplies). If the text contains multiple sections, merge them. Return **only** the JSON array, no explanation or markdown.

  Examples:
  Input: "SKU001, Beras 5kg, 50 kg, Reorder 10 kg, Rp 12000/kg, Supplier: UD Maju"
  Output: [{"name":"Beras","sku":"SKU001","category":"Bahan Pokok","unit":"kg","current_stock":50,"minimum_stock":10,"cost_per_unit":12000,"supplier":"UD Maju"}]

  Input: "Gula Pasir 1kg @15000, stok 30"
  Output: [{"name":"Gula Pasir","unit":"kg","cost_per_unit":15000,"current_stock":30}]

  Input: "Minyak Goreng 2L, stok 12, reorder 5, supplier: IndoFood"
  Output: [{"name":"Minyak Goreng","unit":"liter","current_stock":12,"minimum_stock":5,"supplier":"IndoFood"}]

  OCR text:
  """${ocrText}"""`;

    const response = await fetch('https://fatmagician-megan-ai.hf.space/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: prompt, context: '' })
    });

    if (!response.ok) throw new Error('Gagal menghubungi AI');

    const data = await response.json();
    let jsonText = data.response;

    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonText = jsonMatch[1];

    try {
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Invalid AI response:', jsonText);
      return [];
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setOcrError(null);

    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log(m)
      });

      if (!text.trim()) throw new Error('Tidak ada teks yang terdeteksi');
      console.log('OCR text:', text);

      const MAX_CHARS_PER_CHUNK = 800;
      const chunks = splitTextIntoChunks(text, MAX_CHARS_PER_CHUNK);
      console.log(`Splitting OCR text into ${chunks.length} chunks`);

      let allParsedItems: ParsedInventoryItem[] = [];
      const MAX_CHUNKS = 5;

      for (let i = 0; i < Math.min(chunks.length, MAX_CHUNKS); i++) {
        try {
          const parsed = await parseInventoryWithAI(chunks[i]);
          allParsedItems = [...allParsedItems, ...parsed];
        } catch (error) {
          console.error(`Error parsing chunk ${i + 1}:`, error);
        }
      }

      // Convert to temporary InventoryItem objects
      const newUnsavedItems = allParsedItems.map((item, index) => ({
        id: `temp-${Date.now()}-${index}-${Math.random()}`,
        sku: item.sku || `INV-${Date.now().toString().slice(-6)}-${index}`,
        name: item.name || '',
        category: item.category || '',
        unit: item.unit || 'pcs',
        current_stock: item.current_stock ?? 0,
        minimum_stock: item.minimum_stock ?? 10,
        cost_per_unit: item.cost_per_unit ?? 0,
        supplier: item.supplier || '',
        last_restocked: new Date().toISOString(),
        transactions_connected: false,
        expense_payment_method: 'cash',
      }));

      if (newUnsavedItems.length === 0) {
        const blankItem: TempInventoryItem = {
          id: `temp-${Date.now()}-${Math.random()}`,
          sku: '',
          name: '',
          category: '',
          unit: 'pcs',
          current_stock: 0,
          minimum_stock: 10,
          cost_per_unit: 0,
          supplier: '',
          last_restocked: new Date().toISOString(),
          transactions_connected: false,
          expense_payment_method: 'cash',
        };
        setUnsavedItems([blankItem]);
      } else {
        setUnsavedItems(newUnsavedItems);
      }

      setShowBulkModal(true);
      setActiveItemIndex(0);
    } catch (error: any) {
      console.error(error);
      alert('Gagal memproses gambar: ' + error.message);
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  const saveSingleInventoryItem = async (item: TempInventoryItem): Promise<void> => {
    const payload = {
      sku: item.sku,
      name: item.name,
      category: item.category,
      unit: item.unit,
      current_stock: item.current_stock,
      minimum_stock: item.minimum_stock,
      cost_per_unit: item.cost_per_unit,
      supplier: item.supplier,
      last_restocked: item.last_restocked,
      transactions_connected: item.transactions_connected,
      expense_payment_method: item.expense_payment_method,
      user_id: user?.id,
    };

    const { error } = await supabase
      .from('inventory')
      .insert(payload);

    if (error) throw error;
  };

  const handleBulkSave = async () => {
    try {
      for (const item of unsavedItems) {
        await saveSingleInventoryItem(item);
      }
      setShowBulkModal(false);
      setUnsavedItems([]);
      fetchInventory(); // refresh table
      alert('Semua item berhasil ditambahkan');
    } catch (error) {
      console.error('Error saving bulk items:', error);
      alert('Gagal menyimpan beberapa item. Silakan coba lagi.');
    }
  };

  const BulkInventoryImportModal = ({
    items,
    setItems,
    activeIndex,
    setActiveIndex,
    onClose,
    onSave
  }: {
    items: TempInventoryItem[];
    setItems: (items: TempInventoryItem[]) => void;
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    onClose: () => void;
    onSave: () => Promise<void>;
  }) => {
    if (items.length === 0) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <p className="text-center">Tidak ada item untuk ditampilkan.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
              Tutup
            </button>
          </div>
        </div>
      );
    }

    const currentItem = items[activeIndex];
    if (!currentItem) return null;

    const updateCurrentItem = (updates: Partial<TempInventoryItem>) => {
      const newItems = [...items];
      newItems[activeIndex] = { ...newItems[activeIndex], ...updates };
      setItems(newItems);
    };

    const addNewItem = () => {
      const newItem: TempInventoryItem = {
        id: `temp-${Date.now()}-${Math.random()}`,
        sku: '',
        name: '',
        category: '',
        unit: 'pcs',
        current_stock: 0,
        minimum_stock: 10,
        cost_per_unit: 0,
        supplier: '',
        last_restocked: new Date().toISOString(),
        transactions_connected: false,
        expense_payment_method: 'cash',
      };
      setItems([...items, newItem]);
      setActiveIndex(items.length);
    };

    const removeCurrentItem = () => {
      if (items.length === 1) {
        alert('Setidaknya harus ada satu item');
        return;
      }
      const newItems = items.filter((_, i) => i !== activeIndex);
      setItems(newItems);
      setActiveIndex(Math.min(activeIndex, newItems.length - 1));
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Tambah Item Inventory</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                disabled={activeIndex === 0}
                className="p-2 disabled:opacity-50"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Item {activeIndex + 1} dari {items.length}
              </span>
              <button
                onClick={() => setActiveIndex(Math.min(items.length - 1, activeIndex + 1))}
                disabled={activeIndex === items.length - 1}
                className="p-2 disabled:opacity-50"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">SKU</label>
                <input
                  type="text"
                  value={currentItem.sku}
                  onChange={(e) => updateCurrentItem({ sku: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Item *</label>
                <input
                  type="text"
                  required
                  value={currentItem.name}
                  onChange={(e) => updateCurrentItem({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kategori</label>
                <input
                  type="text"
                  value={currentItem.category}
                  onChange={(e) => updateCurrentItem({ category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit</label>
                <select
                  value={currentItem.unit}
                  onChange={(e) => updateCurrentItem({ unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="pcs">Pcs</option>
                  <option value="kg">Kg</option>
                  <option value="gram">Gram</option>
                  <option value="liter">Liter</option>
                  <option value="pack">Pack</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Stok Awal</label>
                <input
                  type="number"
                  value={currentItem.current_stock}
                  onChange={(e) => updateCurrentItem({ current_stock: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Stok</label>
                <input
                  type="number"
                  value={currentItem.minimum_stock}
                  onChange={(e) => updateCurrentItem({ minimum_stock: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Harga Beli per Unit</label>
                <input
                  type="number"
                  value={currentItem.cost_per_unit}
                  onChange={(e) => updateCurrentItem({ cost_per_unit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Supplier</label>
                <input
                  type="text"
                  value={currentItem.supplier}
                  onChange={(e) => updateCurrentItem({ supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={currentItem.transactions_connected}
                    onChange={(e) => updateCurrentItem({ transactions_connected: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">Connect to transactions</span>
                </label>
                {currentItem.transactions_connected && (
                  <select
                    value={currentItem.expense_payment_method}
                    onChange={(e) => updateCurrentItem({ expense_payment_method: e.target.value })}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="qris">QRIS</option>
                    <option value="transfer">Transfer</option>
                  </select>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-6 pt-4 border-t">
              <button
                type="button"
                onClick={removeCurrentItem}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
              >
                Hapus Item Ini
              </button>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={addNewItem}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  + Tambah Item Manual
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={onSave}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Tambah Item-Item ({items.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const fetchInventory = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (!error) setItems(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      category: '',
      unit: 'pcs',
      current_stock: 0,
      minimum_stock: 10,
      cost_per_unit: 0,
      supplier: '',
      transactions_connected: false,
      expense_payment_method: 'cash',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData({
      sku: item.sku,
      name: item.name,
      category: item.category || '',
      unit: item.unit,
      current_stock: item.current_stock,
      minimum_stock: item.minimum_stock,
      cost_per_unit: item.cost_per_unit,
      supplier: item.supplier || '',
      transactions_connected: item.transactions_connected ?? false,
      expense_payment_method: item.expense_payment_method || 'cash',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const sku = formData.sku || `INV-${Date.now().toString().slice(-6)}`;
    const payload = {
      ...formData,
      sku,
      user_id: user.id,
      last_restocked: new Date().toISOString(),
    };

    let error = null;
    if (editingId) {
      // Update existing item
      const { error: updateError } = await supabase
        .from('inventory')
        .update(payload)
        .eq('id', editingId);
      error = updateError;
    } else {
      // Insert new item
      const { error: insertError } = await supabase
        .from('inventory')
        .insert(payload);
      error = insertError;
    }

    if (!error) {
      resetForm();
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
    if (!error) fetchInventory();
    else {
      console.error('Error updating stock:', error);
      alert('Gagal update stock');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data inventory...</p>
        </div>
      </div>
    );
  }

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

  let tier = user.subscription_tier || 'basic';
  if (tier === 'free') tier = 'basic';
  if (tier === 'basic') {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-orange-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Fitur Terkunci 🔒</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Fitur Manajemen Inventory hanya tersedia untuk pelanggan paket <strong>Pro</strong> dan <strong>Enterprise</strong>. Upgrade sekarang untuk mengontrol stok bahan baku restoran Anda.
          </p>
          <a
            href="/dashboard/billing"
            className="inline-block px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 font-medium transition-colors"
          >
            Upgrade ke Paket Pro
          </a>
        </div>
      </div>
    );
  }

  const lowStockItems = items.filter(item => item.current_stock <= item.minimum_stock);

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex space-x-3">
        <button
          onClick={() => document.getElementById('inventory-image-upload')?.click()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
          disabled={uploadLoading}
        >
          <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
          {uploadLoading ? 'Memproses...' : 'Upload Foto Inventory'}
        </button>
        <input
          id="inventory-image-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          + Tambah Item
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Item Inventory' : 'Tambah Item Inventory'}
          </h2>
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary/30 focus:border-primary"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary/30 focus:border-primary"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary/30 focus:border-primary"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary/30 focus:border-primary"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary/30 focus:border-primary"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary/30 focus:border-primary"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary/30 focus:border-primary"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="col-span-2">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.transactions_connected}
                      onChange={(e) => setFormData({ ...formData, transactions_connected: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">Connect to transactions (auto‑record as expense)</span>
                  </label>

                  {formData.transactions_connected && (
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Payment method:</label>
                      <select
                        value={formData.expense_payment_method}
                        onChange={(e) => setFormData({ ...formData, expense_payment_method: e.target.value })}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="qris">QRIS</option>
                        <option value="transfer">Transfer</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary/90"
              >
                {editingId ? 'Update' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={resetForm}
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
                  <div className="flex flex-col sm:flex-row gap-2 items-start">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateStock(item.id, 1)}
                        className="px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-semibold"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => updateStock(item.id, -1)}
                        className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={item.current_stock <= 0}
                      >
                        -1
                      </button>
                      <button
                        onClick={() => updateStock(item.id, 10)}
                        className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-semibold"
                      >
                        +10
                      </button>
                    </div>
                    <button
                      onClick={() => handleEdit(item)}
                      className="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-semibold"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showBulkModal && (
        <BulkInventoryImportModal
          items={unsavedItems}
          setItems={setUnsavedItems}
          activeIndex={activeItemIndex}
          setActiveIndex={setActiveItemIndex}
          onClose={() => setShowBulkModal(false)}
          onSave={handleBulkSave}
        />
      )}
    </div>
  );
}