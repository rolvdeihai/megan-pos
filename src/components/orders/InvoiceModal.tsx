'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PrinterIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

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
  discount_percentage: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  notes: string;
  created_at: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions?: string;
  }>;
}

export default function InvoiceModal({ order, onComplete, onClose }: InvoiceModalProps) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [changeAmount, setChangeAmount] = useState<number>(0);

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
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice ${orderDetails?.order_number}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .invoice-header { text-align: center; margin-bottom: 30px; }
                .invoice-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .invoice-details { margin-bottom: 20px; }
                .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .invoice-table th { background-color: #f5f5f5; }
                .totals { margin-left: auto; width: 300px; }
                .totals-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .total-amount { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
                .footer { margin-top: 40px; text-align: center; color: #666; }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
              <div class="footer">
                <p>Terima kasih telah berbelanja di restoran kami!</p>
                <p>${new Date().toLocaleString('id-ID')}</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handlePayment = async () => {
    if (!paymentMethod) {
      alert('Pilih metode pembayaran terlebih dahulu');
      return;
    }

    if (paymentMethod === 'cash' && cashReceived < (orderDetails?.total_amount || 0)) {
      alert('Jumlah uang kurang dari total pembayaran');
      return;
    }

    try {
      // Update order payment status
      const { error } = await supabase
        .from('orders')
        .update({
          payment_method: paymentMethod,
          payment_status: 'paid',
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: orderDetails?.user_id,
        order_id: order.id,
        transaction_number: `TRX-${Date.now().toString().slice(-6)}`,
        type: 'sale',
        amount: orderDetails?.total_amount || 0,
        payment_method: paymentMethod,
        status: 'completed',
        notes: `Pembayaran untuk order ${orderDetails?.order_number}`,
      });

      alert('Pembayaran berhasil!');
      onComplete();
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Terjadi kesalahan saat memproses pembayaran');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PrinterIcon className="w-5 h-5 mr-2" />
              Cetak
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
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
              <p className="text-gray-600">Restoran Megan POS</p>
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
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      orderDetails.status === 'completed'
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
                        className={`py-3 px-4 rounded-lg border-2 flex flex-col items-center justify-center ${
                          paymentMethod === method
                            ? 'border-blue-500 bg-blue-50'
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
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                  disabled={!paymentMethod || (paymentMethod === 'cash' && cashReceived < orderDetails.total_amount)}
                  className="w-full py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <CheckCircleIcon className="w-6 h-6 mr-2" />
                  Konfirmasi Pembayaran
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