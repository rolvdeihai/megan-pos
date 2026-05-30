'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PrinterIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/auth/AuthProvider';
import { isEnterprise } from '@/lib/user-scope';

interface InvoiceModalProps {
  order: any;
  onComplete: () => void;
  onClose: () => void;
}

interface OrderDetails {
  id: string;
  user_id: string;
  order_number: string;
  table_id: string;
  table_number?: string;
  order_type: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  status: string;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  service_charge_percentage: number;
  service_charge_amount: number;
  delivery_fee: number;
  discount_percentage: number;
  discount_amount: number;
  total_amount: number;
  payment_method?: string | null;
  payment_status: string;
  notes: string;
  created_at: string;
  items: Array<{
    menu_item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions?: string;
  }>;
}

export default function InvoiceModal({ order, onComplete, onClose }: InvoiceModalProps) {
  const { user } = useAuth();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const formatMoney = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;
  const formatOrderType = (orderType: string) => orderType.replace('_', ' ');
  const formatInvoiceDate = (value: string) => new Date(value).toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  useEffect(() => {
    fetchOrderDetails();
  }, [order]);

  const fetchOrderDetails = async () => {
    try {
      // Fetch order with items
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant_tables(table_number),
          order_items(
            menu_item_id,
            menu_items(name),
            quantity,
            unit_price,
            total_price,
            special_instructions
          )
        `)
        .eq('id', order.id)
        .single();

      if (orderData) {
        const items = orderData.order_items.map((item: any) => ({
          menu_item_id: item.menu_item_id,
          name: item.menu_items.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          special_instructions: item.special_instructions,
        }));

        setOrderDetails({
          ...orderData,
          table_number: orderData.restaurant_tables?.table_number,
          items,
        });
        setPaymentMethod(orderData.payment_method || 'cash');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const restaurantName = user?.restaurant_name || 'Restoran JetNote Pos';
        const createdAt = orderDetails?.created_at ? formatInvoiceDate(orderDetails.created_at) : '-';
        const itemRows = (orderDetails?.items || []).map((item) => `
          <tr>
            <td class="item-cell">
              <div class="item-name">${item.name}</div>
              ${item.special_instructions ? `<div class="item-note">Catatan: ${item.special_instructions}</div>` : ''}
            </td>
            <td class="qty-cell">${item.quantity}</td>
            <td class="price-cell">${formatMoney(item.unit_price)}</td>
            <td class="price-cell total-cell">${formatMoney(item.total_price)}</td>
          </tr>
        `).join('');
        const summaryRows = [
          `<div class="summary-row"><span>Subtotal</span><span>${formatMoney(orderDetails?.subtotal || 0)}</span></div>`,
          (orderDetails?.discount_amount || 0) > 0
            ? `<div class="summary-row discount"><span>Diskon (${orderDetails?.discount_percentage || 0}%)</span><span>- ${formatMoney(orderDetails?.discount_amount || 0)}</span></div>`
            : '',
          `<div class="summary-row"><span>Pajak (${orderDetails?.tax_percentage || 0}%)</span><span>${formatMoney(orderDetails?.tax_amount || 0)}</span></div>`,
          (orderDetails?.service_charge_amount || 0) > 0
            ? `<div class="summary-row"><span>Service Charge (${orderDetails?.service_charge_percentage || 0}%)</span><span>${formatMoney(orderDetails?.service_charge_amount || 0)}</span></div>`
            : '',
          (orderDetails?.delivery_fee || 0) > 0
            ? `<div class="summary-row"><span>Biaya Pengiriman</span><span>${formatMoney(orderDetails?.delivery_fee || 0)}</span></div>`
            : '',
        ].filter(Boolean).join('');

        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice ${orderDetails?.order_number}</title>
              <style>
                * { box-sizing: border-box; }
                body {
                  margin: 0;
                  font-family: Arial, sans-serif;
                  background: #f8fafc;
                  color: #0f172a;
                }
                .page {
                  padding: 32px 20px;
                }
                .shell {
                  max-width: 920px;
                  margin: 0 auto;
                }
                .card {
                  background: #ffffff;
                  border: 1px solid #e5e7eb;
                  border-radius: 24px;
                  overflow: hidden;
                  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
                }
                .header {
                  display: flex;
                  justify-content: space-between;
                  gap: 24px;
                  padding: 24px;
                  border-bottom: 1px solid #e5e7eb;
                  background: #f8fafc;
                }
                .eyebrow {
                  display: inline-block;
                  margin-bottom: 8px;
                  padding: 6px 12px;
                  border-radius: 999px;
                  background: rgba(37, 99, 235, 0.1);
                  color: #2563eb;
                  font-size: 12px;
                  font-weight: 700;
                }
                .title {
                  margin: 0;
                  font-size: 30px;
                  line-height: 1.2;
                }
                .subtitle {
                  margin: 6px 0 0;
                  color: #64748b;
                  font-size: 14px;
                }
                .meta {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 10px;
                  align-content: flex-start;
                }
                .meta-chip {
                  padding: 8px 12px;
                  border-radius: 999px;
                  background: #ffffff;
                  border: 1px solid #dbe2ea;
                  color: #334155;
                  font-size: 12px;
                  font-weight: 700;
                }
                .content {
                  padding: 24px;
                }
                .info-grid {
                  display: grid;
                  grid-template-columns: repeat(2, minmax(0, 1fr));
                  gap: 16px;
                  margin-bottom: 24px;
                }
                .info-card {
                  border: 1px solid #e5e7eb;
                  border-radius: 18px;
                  padding: 18px;
                  background: #ffffff;
                }
                .info-title {
                  margin: 0 0 14px;
                  font-size: 12px;
                  font-weight: 800;
                  letter-spacing: 0.08em;
                  text-transform: uppercase;
                  color: #64748b;
                }
                .info-list {
                  display: grid;
                  gap: 10px;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  gap: 16px;
                  font-size: 14px;
                }
                .info-label {
                  color: #64748b;
                }
                .info-value {
                  font-weight: 600;
                  text-align: right;
                }
                .section-title {
                  margin: 0 0 12px;
                  font-size: 18px;
                }
                .table-wrap {
                  border: 1px solid #e5e7eb;
                  border-radius: 18px;
                  overflow: hidden;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                }
                thead {
                  background: #f8fafc;
                }
                th {
                  padding: 14px 18px;
                  font-size: 12px;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  color: #64748b;
                  text-align: left;
                }
                td {
                  padding: 16px 18px;
                  border-top: 1px solid #edf2f7;
                  vertical-align: top;
                  font-size: 14px;
                }
                .qty-cell, .price-cell {
                  text-align: right;
                  white-space: nowrap;
                }
                .item-name {
                  font-weight: 700;
                  color: #111827;
                }
                .item-note {
                  margin-top: 6px;
                  font-size: 12px;
                  color: #6b7280;
                }
                .summary {
                  width: min(100%, 360px);
                  margin: 24px 0 0 auto;
                  padding: 18px 20px;
                  border: 1px solid #e5e7eb;
                  border-radius: 18px;
                  background: #ffffff;
                }
                .summary-row {
                  display: flex;
                  justify-content: space-between;
                  gap: 12px;
                  margin-bottom: 10px;
                  font-size: 14px;
                }
                .summary-row span:first-child {
                  color: #64748b;
                }
                .discount span {
                  color: #dc2626 !important;
                }
                .summary-total {
                  display: flex;
                  justify-content: space-between;
                  gap: 12px;
                  margin-top: 14px;
                  padding-top: 14px;
                  border-top: 1px solid #e5e7eb;
                  font-size: 18px;
                  font-weight: 800;
                }
                .notes {
                  margin-top: 24px;
                  padding: 18px;
                  border-radius: 18px;
                  background: #f8fafc;
                  border: 1px solid #e5e7eb;
                  font-size: 14px;
                  color: #334155;
                }
                .notes strong {
                  color: #0f172a;
                }
                .footer {
                  margin-top: 24px;
                  text-align: center;
                  color: #64748b;
                  font-size: 13px;
                }
                @media print {
                  body { background: #ffffff; }
                  .page { padding: 0; }
                  .card {
                    box-shadow: none;
                    border: 0;
                    border-radius: 0;
                  }
                  .header, .info-card, .summary, .notes, .table-wrap {
                    break-inside: avoid;
                  }
                }
                @media (max-width: 640px) {
                  .header, .info-grid {
                    grid-template-columns: 1fr;
                    display: grid;
                  }
                }
              </style>
            </head>
            <body>
              <div class="page">
                <div class="shell">
                  <div class="card">
                    <div class="header">
                      <div>
                        <div class="eyebrow">Invoice Pesanan</div>
                        <h1 class="title">Invoice ${orderDetails?.order_number || ''}</h1>
                        <p class="subtitle">${restaurantName}</p>
                        <p class="subtitle">${createdAt}</p>
                      </div>
                      <div class="meta">
                        <span class="meta-chip">${formatOrderType(orderDetails?.order_type || '-')}</span>
                        ${orderDetails?.table_number ? `<span class="meta-chip">Meja ${orderDetails.table_number}</span>` : ''}
                      </div>
                    </div>

                    <div class="content">
                      <div class="info-grid">
                        <div class="info-card">
                          <h2 class="info-title">Informasi Order</h2>
                          <div class="info-list">
                            <div class="info-row"><span class="info-label">No. Order</span><span class="info-value">${orderDetails?.order_number || '-'}</span></div>
                            <div class="info-row"><span class="info-label">Tipe</span><span class="info-value">${formatOrderType(orderDetails?.order_type || '-')}</span></div>
                            ${orderDetails?.table_number ? `<div class="info-row"><span class="info-label">Meja</span><span class="info-value">${orderDetails.table_number}</span></div>` : ''}
                          </div>
                        </div>
                        <div class="info-card">
                          <h2 class="info-title">Informasi Pelanggan</h2>
                          <div class="info-list">
                            <div class="info-row"><span class="info-label">Nama</span><span class="info-value">${orderDetails?.customer_name || '-'}</span></div>
                            <div class="info-row"><span class="info-label">Telepon</span><span class="info-value">${orderDetails?.customer_phone || '-'}</span></div>
                            ${orderDetails?.delivery_address ? `<div class="info-row"><span class="info-label">Alamat</span><span class="info-value">${orderDetails.delivery_address}</span></div>` : ''}
                          </div>
                        </div>
                      </div>

                      <h2 class="section-title">Item Pesanan</h2>
                      <div class="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th class="qty-cell">Qty</th>
                              <th class="price-cell">Harga</th>
                              <th class="price-cell">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${itemRows}
                          </tbody>
                        </table>
                      </div>

                      <div class="summary">
                        ${summaryRows}
                        <div class="summary-total">
                          <span>Total</span>
                          <span>${formatMoney(orderDetails?.total_amount || 0)}</span>
                        </div>
                      </div>

                      ${orderDetails?.notes ? `<div class="notes"><strong>Catatan:</strong> ${orderDetails.notes}</div>` : ''}
                    </div>
                  </div>

                  <div class="footer">
                    <p>Terima kasih telah berbelanja di ${restaurantName}.</p>
                  </div>
                </div>
              </div>
              <div class="footer">
                <p>${new Date().toLocaleString('id-ID')}</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  const [isProcessing, setIsProcessing] = useState(false);

  // ==================== INVENTORY & EXPENSE PROCESSING ====================
  const processInventoryAndExpenses = async (skipStockUpdate = false) => {
    if (!orderDetails || !user) return;

    const canUseGramasi = user?.subscription_tier === 'pro' || user?.subscription_tier === 'enterprise';
    if (!canUseGramasi) return;

    for (const item of orderDetails.items) {
      const { data: recipes } = await supabase
        .from('menu_item_ingredients')
        .select('*')
        .eq('menu_item_id', item.menu_item_id);

      if (!recipes || recipes.length === 0) continue;

      for (const recipe of recipes) {
        const totalDeduction = recipe.quantity * item.quantity;

        const { data: invItem, error: invError } = await supabase
          .from('inventory')
          .select('id, name, current_stock')
          .eq('id', recipe.inventory_id)
          .single();

        if (invError || !invItem) {
          console.error('Inventory item not found:', recipe.inventory_id);
          continue;
        }

        // 1. Update stock (if not skipped)
        if (!skipStockUpdate) {
          const newStock = Math.max(0, invItem.current_stock - totalDeduction);
          await supabase
            .from('inventory')
            .update({ current_stock: newStock })
            .eq('id', recipe.inventory_id);
        }

        // Gramasi order hanya mengurangi stok inventory.
        // Jangan catat ke transactions agar tidak dobel dengan expense pembelian/restock inventory.
      }
    }

    // Free the table if dine-in (idempotent)
    if (orderDetails.table_id) {
      await supabase
        .from('restaurant_tables')
        .update({ is_available: true })
        .eq('id', orderDetails.table_id);
    }
  };
  // ========================================================================

  const handlePayment = async () => {
    if (isProcessing) return;
    if (!paymentMethod) {
      alert('Pilih metode pembayaran terlebih dahulu');
      return;
    }
    if (paymentMethod === 'cash' && cashReceived < (orderDetails?.total_amount || 0)) {
      alert('Jumlah uang kurang dari total pembayaran');
      return;
    }

    setIsProcessing(true);

    try {
      const userId = orderDetails?.user_id;
      if (!userId) throw new Error('User ID not found');

      const response = await fetch('/api/orders/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, paymentMethod, userId }),
      });

      const data = await response.json();

      if (data.duplicate) {
        console.log('Duplicate transaction detected', data);
        if (data.shouldProcessInventory) {
          await processInventoryAndExpenses(false);
        } else {
          await processInventoryAndExpenses(true);
        }
        // ✅ JANGAN PANGGIL onComplete()
        await fetchOrderDetails(); // refresh data order
        alert('Pembayaran sudah tercatat sebelumnya, invoice diperbarui.');
        return;
      }

      if (!response.ok) {
        if (data.error?.includes('duplicate') || data.error?.includes('unique_transaction_per_order')) {
          console.log('Duplicate error, processing missing expenses');
          await processInventoryAndExpenses(true);
          await fetchOrderDetails();
          alert('Pembayaran sudah tercatat, invoice diperbarui.');
          return;
        }
        throw new Error(data.error || 'Gagal memproses pembayaran');
      }

      // First-time success
      await processInventoryAndExpenses(false);
      await fetchOrderDetails(); // ✅ refresh data order
      alert('Pembayaran berhasil! Invoice telah diperbarui.');

    } catch (error: any) {
      console.error('Error processing payment:', error);
      if (error.message?.includes('duplicate') || error.message?.includes('unique_transaction_per_order')) {
        console.log('Duplicate in error, processing missing expenses');
        await processInventoryAndExpenses(true);
        await fetchOrderDetails();
        alert('Pembayaran sudah tercatat, invoice diperbarui.');
        return;
      }
      alert(error.message || 'Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendToOwner = async () => {
    // Guard: ensure orderDetails exists (should not happen, but satisfies TypeScript)
    if (!orderDetails) {
      alert('Data order belum tersedia.');
      return;
    }

    if (!user?.email) {
      alert('Email owner tidak ditemukan.');
      return;
    }

    // Get the current invoice HTML from the DOM
    const invoiceElement = document.getElementById('invoice-content');
    if (!invoiceElement) {
      alert('Konten invoice tidak ditemukan.');
      return;
    }

    // Clone to avoid altering the displayed content
    const clone = invoiceElement.cloneNode(true) as HTMLElement;
    // Remove any interactive buttons (e.g., the Cetak button inside the clone)
    clone.querySelectorAll('button').forEach(btn => btn.remove());

    const invoiceHtml = clone.outerHTML;

    // Prepare items array for the email
    const itemsForEmail = orderDetails.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.unit_price,
    }));

    setSendingEmail(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice_owner',
          email: user.email,
          orderNumber: orderDetails.order_number,
          customerName: orderDetails.customer_name,
          totalAmount: orderDetails.total_amount,
          items: itemsForEmail,
          invoiceHtml,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('Salinan invoice berhasil dikirim ke email owner.');
      } else {
        alert('Gagal mengirim email: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat mengirim email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const calculateChange = (received: number) => {
    const total = orderDetails?.total_amount || 0;
    setCashReceived(received);
    setChangeAmount(received > total ? received - total : 0);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat invoice...</p>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Invoice</h2>
            <p className="text-sm text-gray-600">Order #{orderDetails.order_number}</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Cetak button */}
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <PrinterIcon className="w-5 h-5 mr-2" />
              Cetak
            </button>

            {/* NEW: Send Email button */}
            <button
              onClick={handleSendToOwner}
              disabled={sendingEmail}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {sendingEmail ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
              Send Email
            </button>

            {/* Close button */}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <XMarkIcon className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Invoice Content */}
          <div id="invoice-content">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <p className="text-gray-600">Restoran JetNote Pos</p>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(orderDetails.created_at).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Order Info */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Informasi Order</h3>
                <div className="space-y-1">
                  <p><span className="text-gray-600">No. Order:</span> {orderDetails.order_number}</p>
                  <p>
                    <span className="text-gray-600">Tipe:</span>{' '}
                    <span className="capitalize">
                      {orderDetails.order_type.replace('_', ' ')}
                    </span>
                  </p>
                  {orderDetails.table_number && (
                    <p><span className="text-gray-600">Meja:</span> {orderDetails.table_number}</p>
                  )}
                  <p>
                    <span className="text-gray-600">Status:</span>{' '}
                    <span className={`px-2 py-1 text-xs rounded-full ${orderDetails.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {orderDetails.status}
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Informasi Customer</h3>
                <div className="space-y-1">
                  <p><span className="text-gray-600">Nama:</span> {orderDetails.customer_name || '-'}</p>
                  <p><span className="text-gray-600">Telepon:</span> {orderDetails.customer_phone || '-'}</p>
                  {orderDetails.delivery_address && (
                    <p><span className="text-gray-600">Alamat:</span> {orderDetails.delivery_address}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-700 mb-4">Items</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Harga
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orderDetails.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          {item.special_instructions && (
                            <div className="text-sm text-gray-500 italic">
                              Note: {item.special_instructions}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          Rp {item.unit_price.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          Rp {item.total_price.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="ml-auto w-full md:w-1/2">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>Rp {orderDetails.subtotal.toLocaleString()}</span>
                </div>
                {orderDetails.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Diskon ({orderDetails.discount_percentage}%)</span>
                    <span>- Rp {orderDetails.discount_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Pajak ({orderDetails.tax_percentage}%)</span>
                  <span>Rp {orderDetails.tax_amount.toLocaleString()}</span>
                </div>
                {orderDetails.service_charge_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge ({orderDetails.service_charge_percentage}%)</span>
                    <span>Rp {orderDetails.service_charge_amount.toLocaleString()}</span>
                  </div>
                )}
                {orderDetails.delivery_fee > 0 && (
                  <div className="flex justify-between">
                    <span>Biaya Pengiriman</span>
                    <span>Rp {orderDetails.delivery_fee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                  <span>Total</span>
                  <span>Rp {orderDetails.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {orderDetails.notes && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">Catatan:</h4>
                <p className="text-gray-600">{orderDetails.notes}</p>
              </div>
            )}
          </div>

          {/* Payment Section */}
          {orderDetails.payment_status !== 'paid' && (
            <div className="mt-8 border-t pt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pembayaran</h3>

              <div className="space-y-6">
                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {['cash', 'card', 'qris', 'transfer'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-3 px-4 rounded-lg border-2 flex flex-col items-center justify-center ${paymentMethod === method
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <span className="text-2xl mb-2">
                          {method === 'cash' && '💵'}
                          {method === 'card' && '💳'}
                          {method === 'qris' && '📱'}
                          {method === 'transfer' && '🏦'}
                        </span>
                        <span className="text-sm font-medium capitalize">
                          {method === 'qris' ? 'QRIS' : method}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash Payment Details */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Uang Diterima
                      </label>
                      <input
                        type="number"
                        value={cashReceived || ''}
                        onChange={(e) => calculateChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                        placeholder="Masukkan jumlah uang"
                      />
                    </div>
                    {cashReceived > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-lg">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-bold">Rp {orderDetails.total_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-lg">
                          <span className="text-gray-600">Dibayar:</span>
                          <span className="font-bold">Rp {cashReceived.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-lg text-green-600 font-bold pt-2 border-t">
                          <span>Kembalian:</span>
                          <span>Rp {changeAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Button */}
                <button
                  onClick={handlePayment}
                  disabled={isProcessing || !paymentMethod || (paymentMethod === 'cash' && cashReceived < orderDetails.total_amount)}
                  className="w-full py-4 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-6 h-6 mr-2" />
                      Konfirmasi Pembayaran
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                Invoice ini akan tersimpan di database
              </p>
            </div>
            <div className="flex space-x-3">
              {orderDetails.payment_status === 'paid' && (
                <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center">
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Lunas
                </span>
              )}
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
