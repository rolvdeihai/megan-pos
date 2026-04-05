'use client';

import { useEffect, useMemo, useState } from 'react';
import { XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { buildTableAvailability, type TableOrderStatus } from '@/lib/table-availability';
import { combineReservationDateTime, getLocalDateInput, getLocalTimeInput } from '@/lib/reservation-datetime';
import { motion } from 'framer-motion';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  effective_is_available?: boolean;
  sold_out_reason?: string | null;
  ingredient_stock_issue?: boolean;
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
  is_available?: boolean; // add this line
}

interface OrderModalProps {
  tables: Table[];
  activeTableOrders?: TableOrderStatus[];
  menuItems: MenuItem[];
  categories: Category[];
  settings?: {
    tax_percentage?: number;
    service_charge_percentage?: number;
    delivery_fee?: number;
    enable_delivery?: boolean;
    [key: string]: any;
  };
  onSubmit: (orderData: any) => void;
  onClose: () => void;
}

interface CartItem extends MenuItem {
  quantity: number;
  specialInstructions?: string;
}

export default function OrderModal({
  tables,
  activeTableOrders = [],
  menuItems,
  categories,
  settings,
  onSubmit,
  onClose,
  isSubmitting = false,
}: OrderModalProps & { isSubmitting?: boolean }) {
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateInput());
  const [selectedHour, setSelectedHour] = useState<string>(() => getLocalTimeInput());

  const filteredItems = selectedCategoryId === 'all'
    ? menuItems
    : menuItems.filter(item => item.category_id === selectedCategoryId);

  const selectedTime = combineReservationDateTime(selectedDate, selectedHour);
  const effectiveSelectedTime = selectedTime || combineReservationDateTime(getLocalDateInput(), getLocalTimeInput());
  const tableOptions = useMemo(
    () => buildTableAvailability(tables, activeTableOrders, effectiveSelectedTime),
    [tables, activeTableOrders, effectiveSelectedTime]
  );

  useEffect(() => {
    if (!selectedTable) return;
    const selectedTableOption = tableOptions.find((table) => table.id === selectedTable);
    if (selectedTableOption && !selectedTableOption.is_selectable) {
      setSelectedTable('');
    }
  }, [selectedTable, tableOptions]);

  const addToCart = (item: MenuItem) => {
    if (item.effective_is_available === false) {
      alert(item.sold_out_reason || 'Menu ini sedang habis');
      return;
    }

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

  const calculateTax = () => {
    const taxPercentage = settings?.tax_percentage ?? 10;
    return calculateSubtotal() * (taxPercentage / 100);
  };

  const calculateServiceCharge = () => {
    const serviceChargePercentage = settings?.service_charge_percentage ?? 0;
    return calculateSubtotal() * (serviceChargePercentage / 100);
  };

  const calculateDeliveryFee = () => {
    if (orderType !== 'delivery') return 0;
    return settings?.delivery_fee ?? 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + calculateServiceCharge() + calculateDeliveryFee();
  };

  const handleSubmit = () => {
    if (cart.length === 0) {
      alert('Tambahkan minimal 1 item ke keranjang');
      return;
    }

    const unavailableItem = cart.find((item) => item.effective_is_available === false);
    if (unavailableItem) {
      alert(unavailableItem.sold_out_reason || `${unavailableItem.name} sedang habis`);
      return;
    }

    if (orderType === 'dine_in' && !selectedTable) {
      alert('Pilih meja untuk order dine-in');
      return;
    }

    // if ((orderType === 'takeaway' || orderType === 'delivery') && !customerPhone) {
    //   alert('Nomor telepon wajib diisi untuk order Takeaway dan Delivery');
    //   return;
    // }

    if (orderType === 'delivery' && !deliveryAddress) {
      alert('Alamat pengiriman wajib diisi untuk delivery');
      return;
    }

    const orderData = {
      order_type: orderType,
      table_id: orderType === 'dine_in' ? selectedTable : null,
      customer_name: customerName,
      customer_phone: customerPhone && customerPhone.trim() !== '' ? customerPhone : null,
      delivery_address: orderType === 'delivery' ? deliveryAddress : null,
      notes,
      scheduled_time: orderType === 'dine_in'
        ? (selectedTime || combineReservationDateTime(getLocalDateInput(), getLocalTimeInput()))
        : null,
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
    <motion.div
      // Customize modal backdrop animation here.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
    >
      <motion.div
        // Customize modal scale/fade animation here.
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.26, ease: 'easeOut' }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Order Baru</h2>
            <p className="text-sm text-gray-600">Buat order untuk customer</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Left Panel - Menu Items */}
          <div className="w-full lg:w-2/3 border-b lg:border-b-0 lg:border-r overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Order Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipe Order
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Reservasi
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary/30 focus:border-primary"
                        min={getLocalDateInput()}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jam Reservasi
                      </label>
                      <input
                        type="time"
                        value={selectedHour}
                        onChange={(e) => setSelectedHour(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary/30 focus:border-primary"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Tanggal otomatis hari ini, tinggal pilih jam jika perlu diubah.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pilih Meja
                      </label>
                      {tableOptions.length === 0 ? (
                        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                          Tidak ada meja yang tersedia. Harap tambahkan meja di menu Kelola Meja, atau selesaikan pesanan dine-in yang sedang aktif.
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {tableOptions.map((table) => {
                            const isSelected = selectedTable === table.id;
                            return (
                              <button
                                key={table.id}
                                type="button"
                                onClick={() => table.is_selectable && setSelectedTable(table.id)}
                                disabled={!table.is_selectable}
                                className={`rounded-xl border p-4 text-left transition ${isSelected
                                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                                  : table.is_selectable
                                    ? 'border-gray-200 hover:border-primary/40 hover:shadow-sm'
                                    : 'border-amber-200 bg-amber-50/70 opacity-90'
                                  } ${!table.is_selectable ? 'cursor-not-allowed' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {table.table_name || `Meja ${table.table_number}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Kapasitas {table.capacity} orang
                                    </p>
                                  </div>
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${table.is_selectable
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-amber-100 text-amber-800'
                                    }`}>
                                    {table.availability_label}
                                  </span>
                                </div>

                                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Slot Dipilih
                                  </p>
                                  <p className="mt-1 text-sm font-medium text-slate-900">
                                    {table.selected_slot_label}
                                  </p>
                                </div>

                                <div className="mt-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Jadwal Terpakai
                                  </p>
                                  {table.today_booking_ranges.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {table.today_booking_ranges.map((range) => (
                                        <span
                                          key={`${table.id}-${range}`}
                                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                                        >
                                          {range}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="mt-1 text-xs text-gray-500">Kosong sepanjang hari.</p>
                                  )}
                                </div>

                                {table.availability_hint && (
                                  <p className="mt-3 text-xs text-gray-600">{table.availability_hint}</p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {(orderType === 'takeaway' || orderType === 'delivery') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        placeholder="08xxxxxxxxxx (opsional)"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 transition-shadow ${item.effective_is_available === false
                      ? 'bg-gray-50 border-red-200'
                      : 'hover:shadow-md'
                      }`}
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
                        {item.effective_is_available === false && (
                          <p className="text-xs text-red-600 mt-2">
                            {item.sold_out_reason || 'Menu ini sedang habis'}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        disabled={item.effective_is_available === false}
                        className={`ml-2 p-2 rounded-full ${item.effective_is_available === false
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                      >
                        <PlusIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm px-2 py-1 rounded ${item.effective_is_available === false
                        ? 'bg-red-100 text-red-800'
                        : item.is_available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {item.effective_is_available === false ? 'Habis' : item.is_available ? 'Tersedia' : 'Habis'}
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
          <div className="w-full lg:w-1/3 flex flex-col min-h-[280px]">
            <div className="p-4 sm:p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Keranjang</h3>
              <p className="text-sm text-gray-600">{cart.length} item</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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
            <div className="border-t p-4 sm:p-6 bg-gray-50">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>Rp {calculateSubtotal().toLocaleString()}</span>
                </div>
                {(settings?.tax_percentage ?? 10) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pajak ({settings?.tax_percentage ?? 10}%)</span>
                    <span>Rp {calculateTax().toLocaleString()}</span>
                  </div>
                )}
                {(settings?.service_charge_percentage ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service Charge ({settings?.service_charge_percentage ?? 0}%)</span>
                    <span>Rp {calculateServiceCharge().toLocaleString()}</span>
                  </div>
                )}
                {orderType === 'delivery' && (settings?.delivery_fee ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Biaya Pengiriman</span>
                    <span>Rp {calculateDeliveryFee().toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg pt-3 border-t">
                  <span>Total (estimasi)</span>
                  <span>Rp {calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Memproses...
                    </>
                  ) : (
                    'Buat Order'
                  )}
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
      </motion.div>
    </motion.div>
  );
}