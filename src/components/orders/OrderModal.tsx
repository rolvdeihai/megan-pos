'use client';

import { useState } from 'react';
import { XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  preparation_time?: number;
  category_id?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Table {
  id: string;
  table_number: string;
  table_name?: string;
  capacity: number;
}

interface OrderModalProps {
  tables: Table[];
  menuItems: MenuItem[];
  categories: Category[];
  settings?: any;
  onSubmit: (orderData: any) => void;
  onClose: () => void;
}

interface CartItem extends MenuItem {
  quantity: number;
  specialInstructions?: string;
}

export default function OrderModal({
  tables,
  menuItems,
  categories,
  settings,
  onSubmit,
  onClose,
}: OrderModalProps) {
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  const filteredItems = selectedCategoryId === 'all'
    ? menuItems
    : menuItems.filter(item => item.category_id === selectedCategoryId);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter(item => item.id !== itemId);
    });
  };

  const updateSpecialInstructions = (itemId: string, instructions: string) => {
    setCart(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, specialInstructions: instructions } : item
      )
    );
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = subtotal * ((settings?.tax_percentage || 0) / 100);
    const serviceCharge = subtotal * ((settings?.service_charge_percentage || 0) / 100);
    const deliveryFee = orderType === 'delivery' ? (settings?.delivery_fee || 0) : 0;

    return subtotal + tax + serviceCharge + deliveryFee;
  };

  const handleSubmit = () => {
    if (cart.length === 0) {
      alert('Tambahkan minimal 1 item ke keranjang');
      return;
    }

    if (orderType === 'dine_in' && !selectedTable) {
      alert('Pilih meja untuk order dine-in');
      return;
    }

    if ((orderType === 'takeaway' || orderType === 'delivery') && !customerPhone) {
      alert('Nomor telepon wajib diisi untuk order Takeaway dan Delivery');
      return;
    }

    if (orderType === 'delivery' && !deliveryAddress) {
      alert('Alamat pengiriman wajib diisi untuk delivery');
      return;
    }

    const orderData = {
      order_type: orderType,
      table_id: orderType === 'dine_in' ? selectedTable : null,
      customer_name: customerName,
      customer_phone: customerPhone,
      delivery_address: orderType === 'delivery' ? deliveryAddress : null,
      notes,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        special_instructions: item.specialInstructions,
      })),
    };

    onSubmit(orderData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Order Baru</h2>
            <p className="text-sm text-gray-600">Buat order untuk customer</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Menu Items */}
          <div className="w-2/3 border-r overflow-y-auto">
            <div className="p-6">
              {/* Order Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipe Order
                </label>
                <div className="flex space-x-3">
                  {[
                    { value: 'dine_in', label: 'Dine In', icon: '🍽️' },
                    { value: 'takeaway', label: 'Takeaway', icon: '🥡' },
                    { value: 'delivery', label: 'Delivery', icon: '🚚' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setOrderType(type.value as any)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 flex flex-col items-center justify-center ${orderType === type.value
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <span className="text-2xl mb-2">{type.icon}</span>
                      <span className="font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Details */}
              <div className="mb-6 space-y-4">
                {orderType === 'dine_in' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pilih Meja
                    </label>
                    {tables.length === 0 ? (
                      <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                        Tidak ada meja yang tersedia. Harap tambahkan meja di menu Kelola Meja, atau selesaikan pesanan dine-in yang sedang aktif.
                      </div>
                    ) : (
                      <select
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary/30 focus:border-primary"
                        required
                      >
                        <option value="">Pilih Meja</option>
                        {tables.map(table => (
                          <option key={table.id} value={table.id}>
                            {table.table_name || `Meja ${table.table_number}`} (Max {table.capacity} orang)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {(orderType === 'takeaway' || orderType === 'delivery') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Customer
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary/30 focus:border-primary"
                        placeholder="Nama customer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        No. Telepon
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary/30 focus:border-primary"
                        placeholder="08xxxxxxxxxx"
                        required={orderType === 'takeaway' || orderType === 'delivery'}
                      />
                    </div>
                  </div>
                )}

                {orderType === 'delivery' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alamat Pengiriman
                    </label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary/30 focus:border-primary"
                      rows={3}
                      placeholder="Alamat lengkap untuk pengiriman"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary/30 focus:border-primary"
                    rows={2}
                    placeholder="Catatan khusus untuk order ini"
                  />
                </div>
              </div>

              {/* Menu Categories */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Kategori Menu
                </label>
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId('all')}
                    className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategoryId === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    Semua
                  </button>
                  {categories.map(category => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategoryId === category.id
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-lg font-bold text-primary mt-1">
                          Rp {item.price.toLocaleString()}
                        </p>
                        {item.preparation_time && (
                          <p className="text-sm text-gray-500 mt-1">
                            ⏱️ {item.preparation_time} menit
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        className="ml-2 p-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20"
                      >
                        <PlusIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm px-2 py-1 rounded ${item.is_available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {item.is_available ? 'Tersedia' : 'Habis'}
                      </span>
                      {cart.find(cartItem => cartItem.id === item.id) && (
                        <span className="text-sm text-gray-600">
                          {cart.find(cartItem => cartItem.id === item.id)?.quantity} ×
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Cart */}
          <div className="w-1/3 flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Keranjang</h3>
              <p className="text-sm text-gray-600">{cart.length} item</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">🛒</div>
                  <p>Keranjang kosong</p>
                  <p className="text-sm">Tambahkan item dari menu</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">
                            Rp {item.price.toLocaleString()} × {item.quantity}
                          </p>
                          <p className="font-medium text-gray-900 mt-1">
                            Rp {(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <MinusIcon className="w-5 h-5" />
                          </button>
                          <span className="font-medium">{item.quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <PlusIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <input
                          type="text"
                          value={item.specialInstructions || ''}
                          onChange={(e) => updateSpecialInstructions(item.id, e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary/30 focus:border-primary"
                          placeholder="Catatan khusus (optional)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary */}
            <div className="border-t p-6 bg-gray-50">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>Rp {calculateSubtotal().toLocaleString()}</span>
                </div>
                {settings?.service_charge_percentage > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service Charge ({settings.service_charge_percentage}%)</span>
                    <span>Rp {(calculateSubtotal() * (settings.service_charge_percentage / 100)).toLocaleString()}</span>
                  </div>
                )}
                {settings?.tax_percentage > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pajak ({settings.tax_percentage}%)</span>
                    <span>Rp {(calculateSubtotal() * (settings.tax_percentage / 100)).toLocaleString()}</span>
                  </div>
                )}
                {orderType === 'delivery' && settings?.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Biaya Pengiriman</span>
                    <span>Rp {settings.delivery_fee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg pt-3 border-t">
                  <span>Total</span>
                  <span>Rp {calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSubmit}
                  className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
                >
                  Buat Order
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}