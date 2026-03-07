'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { getOwnerId, isEnterprise } from '@/lib/user-scope';
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

type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  category: string;
};

type RecipeItem = {
  inventory_id: string;
  inventory_name?: string;
  inventory_unit?: string;
  quantity: number;
  unit: string;
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
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
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
    recipeItems: [] as RecipeItem[],
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    display_order: 0,
    is_active: true,
  });

  const { user } = useAuth();
  const ownerId = getOwnerId(user);
  const canUseGramasi = isEnterprise(user);

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
    if (!user || !ownerId) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user || !ownerId) return;
    if (!ownerId) return;

    try {
      setLoading(true);

      // Fetch categories
      const { data: categoriesData, error: catError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('user_id', ownerId)
        .order('display_order');

      if (catError) {
        console.error('Error fetching categories:', catError);
      } else {
        setCategories(categoriesData || []);
      }

      // Fetch inventory for recipes
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('id, name, unit, category')
        .eq('user_id', ownerId)
        .order('name');

      if (invError) {
        console.error('Error fetching inventory:', invError);
      } else {
        setInventoryItems(invData || []);
      }

      // Fetch menu items with category names
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          *,
          menu_categories!inner(name)
        `)
        .eq('user_id', ownerId)
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

    const sku = itemForm.sku || `SKU-${Date.now().toString().slice(-6)}`;

    const { recipeItems, ...restForm } = itemForm;

    const itemData = {
      ...restForm,
      sku,
      user_id: ownerId,
      price: parseFloat(itemForm.price) || 0,
      cost_price: parseFloat(itemForm.cost_price) || 0,
      preparation_time: parseInt(itemForm.preparation_time) || 0,
      tags: itemForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
    };

    try {
      let menuItemId = editingItem?.id;

      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { data: newItem, error } = await supabase
          .from('menu_items')
          .insert(itemData)
          .select()
          .single();

        if (error) throw error;
        menuItemId = newItem.id;
      }

      // Save Recipe Items (menu_item_ingredients) - Enterprise only
      if (menuItemId && canUseGramasi) {
        // Delete existing recipe items first
        await supabase
          .from('menu_item_ingredients')
          .delete()
          .eq('menu_item_id', menuItemId);

        // Insert new recipe items
        if (itemForm.recipeItems.length > 0) {
          const recipeRows = itemForm.recipeItems.map((ri) => ({
            menu_item_id: menuItemId,
            inventory_id: ri.inventory_id,
            quantity: ri.quantity,
            unit: ri.unit || 'gram',
          }));

          const { error: recipeError } = await supabase
            .from('menu_item_ingredients')
            .insert(recipeRows);

          if (recipeError) {
            console.error('Error inserting recipe items:', recipeError);
          }
        }
      }

      alert(editingItem ? 'Item berhasil diperbarui' : 'Item berhasil ditambahkan');
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
            user_id: ownerId,
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

  const editItem = async (item: MenuItem) => {
    setEditingItem(item);

    // Fetch recipe items for this menu item
    let fetchedRecipes: RecipeItem[] = [];
    const { data: recipeData } = await supabase
      .from('menu_item_ingredients')
      .select('*, inventory(name, unit)')
      .eq('menu_item_id', item.id);

    if (recipeData) {
      fetchedRecipes = recipeData.map((r: any) => ({
        inventory_id: r.inventory_id,
        inventory_name: r.inventory?.name,
        inventory_unit: r.inventory?.unit,
        quantity: r.quantity,
        unit: r.unit,
      }));
    }

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
      recipeItems: fetchedRecipes,
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
      recipeItems: [],
    });
  };

  const handleAddRecipeItem = () => {
    setItemForm({
      ...itemForm,
      recipeItems: [...itemForm.recipeItems, { inventory_id: '', quantity: 0, unit: 'gram' }]
    });
  };

  const handleRemoveRecipeItem = (index: number) => {
    const newRecipes = [...itemForm.recipeItems];
    newRecipes.splice(index, 1);
    setItemForm({ ...itemForm, recipeItems: newRecipes });
  };

  const handleRecipeChange = (index: number, field: keyof RecipeItem, value: string | number) => {
    const newRecipes = [...itemForm.recipeItems];
    newRecipes[index] = { ...newRecipes[index], [field]: value };
    setItemForm({ ...itemForm, recipeItems: newRecipes });
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center"
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
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${category.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                    }`}>
                    {category.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => editCategory(category)}
                    className="p-1 text-primary hover:bg-primary/10 rounded"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
            />

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
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
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 flex items-center justify-center"
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
                                    className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
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
                            className={`px-3 py-1 text-xs rounded-full w-24 ${item.is_available
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
                            className="text-primary hover:text-primary"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori
                    </label>
                    <select
                      value={itemForm.category_id}
                      onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
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
                        className="h-4 w-4 text-primary focus:ring-primary/30 border-gray-300 rounded"
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
                        className="h-4 w-4 text-primary focus:ring-primary/30 border-gray-300 rounded"
                      />
                      <label htmlFor="is_featured" className="ml-2 text-sm text-gray-700">
                        Featured Item
                      </label>
                    </div>
                  </div>

                  {/* Recipes / Grammage section - Enterprise only */}
                  {canUseGramasi ? (
                    <div className="md:col-span-2 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Resep / Gramasi (Opsional)</h3>
                        <button
                          type="button"
                          onClick={handleAddRecipeItem}
                          className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                          + Tambah Bahan
                        </button>
                      </div>
                      {itemForm.recipeItems.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Belum ada bahan baku yang diatur. Jika Anda mengatur bahan makanan, stok inventory akan otomatis berkurang saat menu ini dipesan.</p>
                      ) : (
                        <div className="space-y-3">
                          {itemForm.recipeItems.map((recipe, index) => (
                            <div key={index} className="flex gap-4 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Bahan Baku</label>
                                <select
                                  value={recipe.inventory_id}
                                  onChange={(e) => handleRecipeChange(index, 'inventory_id', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                  required
                                >
                                  <option value="">Pilih Bahan</option>
                                  {inventoryItems.map(inv => (
                                    <option key={inv.id} value={inv.id}>
                                      {inv.name} ({inv.category}) - {inv.unit}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-24">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={recipe.quantity}
                                  onChange={(e) => handleRecipeChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                  required
                                />
                              </div>
                              <div className="w-24">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Satuan</label>
                                <select
                                  value={recipe.unit}
                                  onChange={(e) => handleRecipeChange(index, 'unit', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                >
                                  <option value="gram">Gram</option>
                                  <option value="kg">Kg</option>
                                  <option value="ml">Mililiter</option>
                                  <option value="liter">Liter</option>
                                  <option value="pcs">Pcs</option>
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveRecipeItem(index)}
                                className="mb-1 p-2 text-red-500 hover:bg-red-50 rounded-md"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="md:col-span-2 pt-4 border-t border-gray-200">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">🔒</div>
                          <div>
                            <h3 className="font-medium text-gray-900">Fitur Gramasi</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Atur resep dan gramasi bahan baku untuk pengurangan inventory otomatis. 
                              Upgrade ke paket <span className="font-semibold text-primary">Enterprise</span> untuk mengaktifkan fitur ini.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="category_active"
                    checked={categoryForm.is_active}
                    onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                    className="h-4 w-4 text-primary focus:ring-primary/30 border-gray-300 rounded"
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
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
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