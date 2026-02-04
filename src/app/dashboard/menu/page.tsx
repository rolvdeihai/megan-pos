'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { PlusIcon, PencilIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  cost_price: number;
  sku: string;
  is_available: boolean;
  is_featured: boolean;
  image_url: string;
  preparation_time: number;
  category_id: string;
  category_name?: string;
  tags: string[];
};

type Category = {
  id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
};

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    cost_price: '',
    sku: '',
    is_available: true,
    is_featured: false,
    image_url: '',
    preparation_time: '',
    category_id: '',
    tags: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    display_order: 0,
    is_active: true,
  });

  const { user } = useAuth();

  // Filtered items logic
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      // Filter by category
      if (selectedCategory !== 'all' && item.category_id !== selectedCategory) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [menuItems, selectedCategory, searchTerm]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: categoriesData, error: catError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order');

      if (catError) {
        console.error('Error fetching categories:', catError);
      } else {
        setCategories(categoriesData || []);
      }

      // Fetch menu items with category names
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          *,
          menu_categories!inner(name)
        `)
        .eq('user_id', user.id)
        .order('name');

      if (itemsError) {
        console.error('Error fetching menu items:', itemsError);
      } else {
        const formattedItems = (itemsData || []).map(item => ({
          ...item,
          category_name: item.menu_categories?.name || '',
        }));
        setMenuItems(formattedItems);
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const itemData = {
      ...itemForm,
      user_id: user.id,
      price: parseFloat(itemForm.price) || 0,
      cost_price: parseFloat(itemForm.cost_price) || 0,
      preparation_time: parseInt(itemForm.preparation_time) || 0,
      tags: itemForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        alert('Item berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert(itemData);

        if (error) throw error;
        alert('Item berhasil ditambahkan');
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Gagal menyimpan item');
    }

    setShowItemModal(false);
    setEditingItem(null);
    resetItemForm();
    fetchData();
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('menu_categories')
          .update(categoryForm)
          .eq('id', editingCategory.id);

        if (error) throw error;
        alert('Kategori berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('menu_categories')
          .insert({
            ...categoryForm,
            user_id: user.id,
          });

        if (error) throw error;
        alert('Kategori berhasil ditambahkan');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Gagal menyimpan kategori');
    }

    setShowCategoryModal(false);
    setEditingCategory(null);
    resetCategoryForm();
    fetchData();
  };

  const deleteItem = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus item ini?')) {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (!error) {
        fetchData();
      }
    }
  };

  const deleteCategory = async (id: string) => {
    // Check if category has items
    const { data: items } = await supabase
      .from('menu_items')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (items && items.length > 0) {
      alert('Tidak dapat menghapus kategori yang masih memiliki item menu');
      return;
    }

    if (confirm('Apakah Anda yakin ingin menghapus kategori ini?')) {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', id);

      if (!error) {
        fetchData();
      }
    }
  };

  const toggleItemAvailability = async (item: MenuItem) => {
    await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);

    fetchData();
  };

  const editItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      cost_price: item.cost_price?.toString() || '',
      sku: item.sku || '',
      is_available: item.is_available,
      is_featured: item.is_featured,
      image_url: item.image_url || '',
      preparation_time: item.preparation_time?.toString() || '',
      category_id: item.category_id || '',
      tags: item.tags?.join(', ') || '',
    });
    setShowItemModal(true);
  };

  const editCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setShowCategoryModal(true);
  };

  const resetItemForm = () => {
    setItemForm({
      name: '',
      description: '',
      price: '',
      cost_price: '',
      sku: '',
      is_available: true,
      is_featured: false,
      image_url: '',
      preparation_time: '',
      category_id: categories[0]?.id || '',
      tags: '',
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      display_order: 0,
      is_active: true,
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manajemen Menu</h1>
        <p className="mt-2 text-gray-600">Kelola menu restoran Anda</p>
      </div>

      {/* Categories Section */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Kategori Menu</h2>
          <button
            onClick={() => {
              setEditingCategory(null);
              setShowCategoryModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Tambah Kategori
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map(category => (
            <div
              key={category.id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                    category.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {category.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => editCategory(category)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Order: {category.display_order}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Items Section */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Item Menu</h2>
            <p className="text-sm text-gray-600 mt-1">{filteredItems.length} item ditemukan</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <input
              type="text"
              placeholder="Cari item menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setEditingItem(null);
                resetItemForm();
                setShowItemModal(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Tambah Item
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <PhotoIcon className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada item menu</h3>
              <p className="text-gray-500">Tambahkan item menu pertama Anda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Harga
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-12 h-12 rounded-lg object-cover mr-4"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mr-4">
                              <PhotoIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {item.description}
                            </div>
                            {item.tags && item.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.category_name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          Rp {item.price.toLocaleString()}
                        </div>
                        {item.cost_price > 0 && (
                          <div className="text-xs text-gray-500">
                            HPP: Rp {item.cost_price.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => toggleItemAvailability(item)}
                            className={`px-3 py-1 text-xs rounded-full w-24 ${
                              item.is_available
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {item.is_available ? 'Tersedia' : 'Habis'}
                          </button>
                          {item.is_featured && (
                            <span className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full w-24 text-center">
                              Featured
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => editItem(item)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingItem ? 'Edit Item Menu' : 'Tambah Item Menu'}
                </h2>
                <button
                  onClick={() => setShowItemModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleItemSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Item *
                    </label>
                    <input
                      type="text"
                      required
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi
                    </label>
                    <textarea
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harga Jual *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="100"
                      value={itemForm.price}
                      onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harga Pokok
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={itemForm.cost_price}
                      onChange={(e) => setItemForm({ ...itemForm, cost_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={itemForm.sku}
                      onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Kode stok (opsional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Waktu Penyajian (menit)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={itemForm.preparation_time}
                      onChange={(e) => setItemForm({ ...itemForm, preparation_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori
                    </label>
                    <select
                      value={itemForm.category_id}
                      onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Pilih Kategori</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL Gambar
                    </label>
                    <input
                      type="url"
                      value={itemForm.image_url}
                      onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (pisahkan dengan koma)
                    </label>
                    <input
                      type="text"
                      value={itemForm.tags}
                      onChange={(e) => setItemForm({ ...itemForm, tags: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="spicy, vegan, bestseller"
                    />
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_available"
                        checked={itemForm.is_available}
                        onChange={(e) => setItemForm({ ...itemForm, is_available: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_available" className="ml-2 text-sm text-gray-700">
                        Tersedia
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_featured"
                        checked={itemForm.is_featured}
                        onChange={(e) => setItemForm({ ...itemForm, is_featured: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_featured" className="ml-2 text-sm text-gray-700">
                        Featured Item
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowItemModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingItem ? 'Update Item' : 'Tambah Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
                </h2>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCategorySubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Kategori *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi
                  </label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urutan Tampilan
                  </label>
                  <input
                    type="number"
                    value={categoryForm.display_order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="category_active"
                    checked={categoryForm.is_active}
                    onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="category_active" className="ml-2 text-sm text-gray-700">
                    Kategori Aktif
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingCategory ? 'Update Kategori' : 'Tambah Kategori'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}