'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/layout/Navbar';

type InvoiceItem = {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string | null;
};

type InvoiceData = {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  payment_status: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  notes: string | null;
  subtotal: number;
  tax_percentage: number | null;
  tax_amount: number | null;
  service_charge_percentage: number | null;
  service_charge_amount: number | null;
  delivery_fee: number | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  total_amount: number;
  created_at: string | null;
  table_number: string | null;
  items: InvoiceItem[];
};

export default function PublicInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const orderId = params.orderId as string;

  const [restaurant, setRestaurant] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (slug && orderId) {
      fetchInvoice();
    }
  }, [slug, orderId]);

  const applyTheme = (primary?: string | null, secondary?: string | null) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', primary || '#3B82F6');
    root.style.setProperty('--secondary', secondary || '#10B981');
  };

  const fetchInvoice = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const normalizedSlug = slug.trim().toLowerCase();

      const { data: restaurantData, error: restaurantError } = await supabase
        .from('users')
        .select('id, restaurant_name, restaurant_slug')
        .ilike('restaurant_slug', normalizedSlug)
        .maybeSingle();

      if (restaurantError || !restaurantData) {
        setErrorMessage('Restoran tidak ditemukan.');
        return;
      }

      setRestaurant(restaurantData);

      const { data: settingsData } = await supabase
        .from('restaurant_settings')
        .select('*')
        .eq('user_id', restaurantData.id)
        .maybeSingle();

      const resolvedSettings = settingsData || {
        primary_color: '#3B82F6',
        secondary_color: '#10B981',
      };

      setSettings(resolvedSettings);
      applyTheme(resolvedSettings.primary_color, resolvedSettings.secondary_color);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_type,
          status,
          payment_status,
          customer_name,
          customer_phone,
          delivery_address,
          notes,
          subtotal,
          tax_percentage,
          tax_amount,
          service_charge_percentage,
          service_charge_amount,
          delivery_fee,
          discount_percentage,
          discount_amount,
          total_amount,
          created_at,
          restaurant_tables(table_number),
          order_items(
            quantity,
            unit_price,
            total_price,
            special_instructions,
            menu_items(name)
          )
        `)
        .eq('id', orderId)
        .eq('user_id', restaurantData.id)
        .maybeSingle();

      if (orderError || !orderData) {
        setErrorMessage('Invoice tidak ditemukan untuk order ini.');
        return;
      }

      const normalizedItems: InvoiceItem[] = (orderData.order_items || []).map((item: any) => {
        const qty = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const totalPrice = Number(item.total_price) || (qty * unitPrice);
        return {
          name: item.menu_items?.name || 'Menu item',
          quantity: qty,
          unit_price: unitPrice,
          total_price: totalPrice,
          special_instructions: item.special_instructions,
        };
      });

      // Recalculate subtotal from items if order subtotal is 0 or invalid
      const itemsSubtotal = normalizedItems.reduce((sum, item) => sum + item.total_price, 0);

      const tableRelation: any = orderData.restaurant_tables;
      const tableNumber = Array.isArray(tableRelation)
        ? tableRelation[0]?.table_number
        : tableRelation?.table_number;

      const subtotal = Number(orderData.subtotal) || itemsSubtotal || 0;
      const taxPercentage = Number(orderData.tax_percentage) || 0;
      const taxAmount = Number(orderData.tax_amount) || (subtotal * (taxPercentage / 100));
      const serviceChargePercentage = Number(orderData.service_charge_percentage) || 0;
      const serviceChargeAmount = Number(orderData.service_charge_amount) || (subtotal * (serviceChargePercentage / 100));
      const deliveryFee = Number(orderData.delivery_fee) || 0;
      const discountAmount = Number(orderData.discount_amount) || 0;
      const totalAmount = Number(orderData.total_amount) || (subtotal + taxAmount + serviceChargeAmount + deliveryFee - discountAmount);

      setInvoice({
        ...orderData,
        subtotal,
        tax_amount: taxAmount,
        service_charge_amount: serviceChargeAmount,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        table_number: tableNumber || null,
        items: normalizedItems,
      });
    } catch (error) {
      console.error('Error fetching invoice data:', error);
      setErrorMessage('Terjadi kesalahan saat memuat invoice.');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;

  return (
    <div className="public-invoice-page min-h-screen bg-gray-50">
      <style jsx global>{`
        @media print {
          .public-invoice-page nav {
            display: none !important;
          }

          .public-invoice-shell {
            max-width: 100% !important;
            padding: 0 !important;
          }

          .public-invoice-card {
            box-shadow: none !important;
            border: 0 !important;
          }

          .public-invoice-actions {
            display: none !important;
          }
        }
      `}</style>
      <Navbar mode="public" restaurant={restaurant} settings={settings} />

      <div className="public-invoice-shell max-w-4xl mx-auto px-4 py-10">
        {loading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-gray-600">Memuat invoice...</p>
          </div>
        ) : errorMessage ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Tidak Tersedia</h1>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button
              onClick={() => router.push(`/${slug}`)}
              className="px-5 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Kembali ke Menu
            </button>
          </div>
        ) : invoice ? (
          <div className="public-invoice-card bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Invoice {invoice.order_number}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {invoice.created_at
                    ? new Date(invoice.created_at).toLocaleString('id-ID')
                    : '-'}
                </p>
              </div>
              <div className="public-invoice-actions flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${invoice.payment_status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  Pembayaran: {invoice.payment_status}
                </span>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  Cetak
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h2 className="font-semibold text-gray-900 mb-2">Informasi Order</h2>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>Tipe: <span className="capitalize">{invoice.order_type.replace('_', ' ')}</span></p>
                    <p>Status: {invoice.status}</p>
                    {invoice.table_number && <p>Meja: {invoice.table_number}</p>}
                  </div>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 mb-2">Informasi Pelanggan</h2>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>Nama: {invoice.customer_name || '-'}</p>
                    <p>Telepon: {invoice.customer_phone || '-'}</p>
                    {invoice.delivery_address && <p>Alamat: {invoice.delivery_address}</p>}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-semibold text-gray-900 mb-3">Item Pesanan</h2>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-4 py-3">Item</th>
                        <th className="text-right px-4 py-3">Qty</th>
                        <th className="text-right px-4 py-3">Harga</th>
                        <th className="text-right px-4 py-3">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invoice.items.map((item, index) => (
                        <tr key={`${item.name}-${index}`}>
                          <td className="px-4 py-3 text-gray-900">
                            <div>{item.name}</div>
                            {item.special_instructions && (
                              <div className="text-xs text-gray-500 mt-1">Catatan: {item.special_instructions}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">{formatMoney(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatMoney(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="ml-auto w-full sm:w-80 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatMoney(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pajak ({invoice.tax_percentage || 0}%)</span>
                  <span>{formatMoney(invoice.tax_amount || 0)}</span>
                </div>
                {(invoice.service_charge_amount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Charge ({invoice.service_charge_percentage || 0}%)</span>
                    <span>{formatMoney(invoice.service_charge_amount || 0)}</span>
                  </div>
                )}
                {(invoice.delivery_fee || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Biaya Pengiriman</span>
                    <span>{formatMoney(invoice.delivery_fee || 0)}</span>
                  </div>
                )}
                {(invoice.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Diskon ({invoice.discount_percentage || 0}%)</span>
                    <span>- {formatMoney(invoice.discount_amount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total</span>
                  <span>{formatMoney(invoice.total_amount)}</span>
                </div>
              </div>

              {invoice.notes && (
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">Catatan:</span> {invoice.notes}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
