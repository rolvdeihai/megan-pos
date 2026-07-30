'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PrinterIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/auth/AuthProvider';
import { isEnterprise } from '@/lib/user-scope';
import { printService, platform, isNative } from '@/lib/printService';
import { printReceiptWithQZ, getAvailablePrinters, reloadQZTrayWithNewCertificate } from '@/lib/qzTrayService';
import PrintGuide from '@/components/PrintGuide';

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

// ===== FUNGSI DETEKSI OS =====
function getPlatform(): 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows/.test(ua)) return 'windows';
  if (/macintosh/.test(ua)) return 'macos';
  if (/linux/.test(ua)) return 'linux';
  return 'unknown';
}

export default function InvoiceModal({ order, onComplete, onClose }: InvoiceModalProps) {
  const { user } = useAuth();

  // ===== STATE DASAR =====
  const [sendingEmail, setSendingEmail] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [showGuide, setShowGuide] = useState(false);

  // ===== STATE EDIT =====
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<Array<{
    menu_item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions?: string;
  }>>([]);
  const [editSubtotal, setEditSubtotal] = useState(0);
  const [editTaxPercentage, setEditTaxPercentage] = useState(0);
  const [editTaxAmount, setEditTaxAmount] = useState(0);
  const [editDiscountPercentage, setEditDiscountPercentage] = useState(0);
  const [editDiscountAmount, setEditDiscountAmount] = useState(0);
  const [editServiceChargePercentage, setEditServiceChargePercentage] = useState(0);
  const [editServiceChargeAmount, setEditServiceChargeAmount] = useState(0);
  const [editDeliveryFee, setEditDeliveryFee] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('');

  // ===== STATE PRINTER WINDOWS (QZ Tray) =====
  const [windowsPrinters, setWindowsPrinters] = useState<string[]>([]);
  const [selectedWindowsPrinter, setSelectedWindowsPrinter] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState(false);

  // ===== STATE PRINTER ANDROID (Bluetooth) =====
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // ===== STATE OS & CERTIFICATE =====
  const [platformOS, setPlatformOS] = useState<'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown'>('unknown');
  const [showCertUpload, setShowCertUpload] = useState(false);
  const [certificateStatus, setCertificateStatus] = useState<string>('');

  // ===== FORMATTERS =====
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

  // ===== HELPER ESCAPE HTML =====
  function escapeHtml(str: string) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  useEffect(() => {
    const dismissed = localStorage.getItem('print_guide_dismissed');
    if (!dismissed) {
      // Tampilkan guide otomatis setelah 2 detik (opsional)
      // setShowGuide(true);
    }
  }, []);

  // ===== FETCH ORDER DETAILS =====
  const fetchOrderDetails = async () => {
    try {
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

  // ===== EFFECT: LOAD DATA AWAL =====
  useEffect(() => {
    fetchOrderDetails();
  }, [order]);

  // ===== EFFECT: DETEKSI OS & LOAD PREFERENSI =====
  useEffect(() => {
    const os = getPlatform();
    setPlatformOS(os);

    // Load printer Windows dari localStorage
    const savedPrinter = localStorage.getItem('qz_printer');
    if (savedPrinter) {
      setSelectedWindowsPrinter(savedPrinter);
    }

    // Load printer Android dari localStorage
    const savedAndroidPrinter = localStorage.getItem('android_printer');
    if (savedAndroidPrinter) {
      setSelectedPrinter(savedAndroidPrinter);
    }

    // Cek certificate
    const cert = localStorage.getItem('qz_certificate');
    if (cert) {
      setCertificateStatus('✅ Certificate tersimpan');
    } else {
      setCertificateStatus('⚠️ Gunakan default certificate');
    }

    // Jika Windows, auto detect printer
    if (os === 'windows' || os === 'macos') {
      handleDetectWindowsPrinters();
    }
  }, []);

  // ===== FUNGSI: DETEKSI PRINTER WINDOWS =====
  const handleDetectWindowsPrinters = async () => {
    setIsDetecting(true);
    try {
      const printers = await getAvailablePrinters();
      setWindowsPrinters(printers);
      if (printers.length > 0) {
        const savedPrinter = localStorage.getItem('qz_printer');
        const defaultPrinter = printers.includes(savedPrinter || '') ? savedPrinter : printers[0];
        setSelectedWindowsPrinter(defaultPrinter as string);
      } else {
        alert('Tidak ada printer terdeteksi. Pastikan printer terhubung dan QZ Tray berjalan.');
      }
    } catch (error: any) {
      console.error('Detect printer error:', error);
      // Jangan tampilkan alert error, biarkan user tahu dari tombol yang disable
    } finally {
      setIsDetecting(false);
    }
  };

  // ===== FUNGSI: UPLOAD CERTIFICATE =====
  const handleCertificateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      localStorage.setItem('qz_certificate', content);
      setCertificateStatus('✅ Certificate berhasil disimpan!');
      try {
        await reloadQZTrayWithNewCertificate();
        alert('Certificate berhasil disimpan dan QZ Tray reloaded!');
      } catch (err) {
        alert('Certificate disimpan, tapi gagal reload QZ Tray. Coba restart QZ Tray.');
      }
    };
    reader.readAsText(file);
  };

  // ===== CETAK VIA QZ TRAY (Windows/macOS) =====
  const handlePrint = async () => {
    if (!orderDetails) return;
    setIsPrinting(true);

    try {
      // Simpan pilihan printer ke localStorage
      if (selectedWindowsPrinter) {
        localStorage.setItem('qz_printer', selectedWindowsPrinter);
      }

      const printData = {
        restaurantName: user?.restaurant_name || "Restoran JetNote POS",
        orderNumber: orderDetails.order_number,
        orderType: orderDetails.order_type,
        tableNumber: orderDetails.table_number,
        customerName: orderDetails.customer_name,
        items: orderDetails.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        subtotal: orderDetails.subtotal,
        discountAmount: orderDetails.discount_amount,
        taxAmount: orderDetails.tax_amount,
        serviceChargeAmount: orderDetails.service_charge_amount,
        deliveryFee: orderDetails.delivery_fee,
        totalAmount: orderDetails.total_amount,
        notes: orderDetails.notes,
        created_at: orderDetails.created_at,
      };

      await printReceiptWithQZ(printData, selectedWindowsPrinter || undefined);
      alert('✅ Struk berhasil dicetak!');
    } catch (error: any) {
      console.error('Print error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat mencetak.';
      const useFallback = confirm(
        `❌ ${errorMessage}\n\nIngin mencoba cetak HTML biasa? (Hasil mungkin kurang rapi)`
      );
      if (useFallback) {
        handlePrintHTML();
      }
    } finally {
      setIsPrinting(false);
    }
  };

  // ===== CETAK FALLBACK HTML (untuk iOS & semua platform) =====
  const handlePrintHTML = () => {
    if (!orderDetails) return;

    if (platformOS === 'ios') {
      alert('⚠️ Cetak via AirPrint menggunakan HTML. Hasil mungkin tidak sepresisi cetak native.');
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.error('Cannot access iframe document');
      document.body.removeChild(iframe);
      return;
    }

    const restaurantName = user?.restaurant_name || 'Restoran JetNote Pos';
    const createdAt = orderDetails.created_at ? formatInvoiceDate(orderDetails.created_at) : '-';

    const itemRows = (orderDetails.items || []).map((item) => `
      <tr>
        <td class="item-name">${escapeHtml(item.name)}</td>
        <td class="qty-cell">${item.quantity}</td>
        <td class="price-cell">${formatMoney(item.unit_price)}</td>
        <td class="price-cell">${formatMoney(item.total_price)}</td>
      </tr>
    `).join('');

    const summaryRows = [
      `<div class="summary-row"><span>Subtotal</span><span>${formatMoney(orderDetails.subtotal)}</span></div>`,
      (orderDetails.discount_amount || 0) > 0 ? `<div class="summary-row discount"><span>Diskon</span><span>- ${formatMoney(orderDetails.discount_amount)}</span></div>` : '',
      `<div class="summary-row"><span>Pajak</span><span>${formatMoney(orderDetails.tax_amount)}</span></div>`,
      (orderDetails.service_charge_amount || 0) > 0 ? `<div class="summary-row"><span>Service</span><span>${formatMoney(orderDetails.service_charge_amount)}</span></div>` : '',
      (orderDetails.delivery_fee || 0) > 0 ? `<div class="summary-row"><span>Kirim</span><span>${formatMoney(orderDetails.delivery_fee)}</span></div>` : '',
    ].filter(Boolean).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${orderDetails.order_number}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 10px;
            width: 58mm;
            margin: 0 auto;
            padding: 2mm;
            background: white;
            color: black;
            line-height: 1.3;
          }
          .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 4px; margin-bottom: 6px; }
          .title { font-size: 15px; font-weight: bold; }
          .subtitle { font-size: 10px; }
          .info-row { display: flex; justify-content: space-between; font-size: 9.5px; padding: 1px 0; }
          .section-title { font-weight: bold; font-size: 11px; margin: 6px 0 3px; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
          th, td { padding: 2px 0; text-align: left; border: none; }
          .qty-cell, .price-cell { text-align: right; }
          .item-name { max-width: 60%; word-break: break-word; }
          .summary { margin-top: 6px; padding-top: 4px; border-top: 1px dashed #333; }
          .summary-row { display: flex; justify-content: space-between; font-size: 9.5px; padding: 1px 0; }
          .discount span { color: #dc2626; }
          .summary-total { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; border-top: 2px solid #000; padding-top: 4px; margin-top: 4px; }
          .notes { margin-top: 6px; padding: 4px 6px; background: #f8f8f8; font-size: 9px; border-left: 2px solid #aaa; }
          .footer { text-align: center; font-size: 8.5px; margin-top: 10px; color: #444; }
          @media print { body { width: 58mm; margin: 0; padding: 1mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${escapeHtml(restaurantName)}</div>
          <div class="subtitle">INVOICE #${orderDetails.order_number}</div>
          <div class="subtitle">${createdAt}</div>
        </div>
        <div style="margin-bottom:4px;">
          <div class="info-row"><span>Order</span><span>${orderDetails.order_number}</span></div>
          <div class="info-row"><span>Tipe</span><span>${formatOrderType(orderDetails.order_type)}</span></div>
          ${orderDetails.table_number ? `<div class="info-row"><span>Meja</span><span>${orderDetails.table_number}</span></div>` : ''}
          <div class="info-row"><span>Pelanggan</span><span>${escapeHtml(orderDetails.customer_name || '-')}</span></div>
        </div>
        <div class="section-title">ITEM</div>
        <table>
          <thead><tr><th>Nama</th><th class="qty-cell">Qty</th><th class="price-cell">Harga</th><th class="price-cell">Total</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div class="summary">
          ${summaryRows}
          <div class="summary-total"><span>TOTAL</span><span>${formatMoney(orderDetails.total_amount)}</span></div>
        </div>
        ${orderDetails.notes ? `<div class="notes">📝 ${escapeHtml(orderDetails.notes)}</div>` : ''}
        <div class="footer">Terima kasih • Selamat datang kembali</div>
      </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };

    if (iframe.contentWindow?.document.readyState === 'complete') {
      iframe.onload?.(new Event('load'));
    }
  };

  // ===== CETAK PDF INVOICE (versi lama dengan layout penuh) =====
  const handlePrintPDF = () => {
    if (!orderDetails) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.error('Cannot access iframe document');
      document.body.removeChild(iframe);
      return;
    }

    const restaurantName = user?.restaurant_name || 'Restoran JetNote Pos';
    const createdAt = orderDetails.created_at ? formatInvoiceDate(orderDetails.created_at) : '-';

    const itemRows = (orderDetails.items || []).map((item) => `
      <tr>
        <td class="item-cell">
          <div class="item-name">${escapeHtml(item.name)}</div>
          ${item.special_instructions ? `<div class="item-note">Catatan: ${escapeHtml(item.special_instructions)}</div>` : ''}
        </td>
        <td class="qty-cell">${item.quantity}</td>
        <td class="price-cell">${formatMoney(item.unit_price)}</td>
        <td class="price-cell total-cell">${formatMoney(item.total_price)}</td>
      </tr>
    `).join('');

    const summaryRows = [
      `<div class="summary-row"><span>Subtotal</span><span>${formatMoney(orderDetails.subtotal)}</span></div>`,
      (orderDetails.discount_amount || 0) > 0
        ? `<div class="summary-row discount"><span>Diskon (${orderDetails.discount_percentage || 0}%)</span><span>- ${formatMoney(orderDetails.discount_amount || 0)}</span></div>`
        : '',
      `<div class="summary-row"><span>Pajak (${orderDetails.tax_percentage || 0}%)</span><span>${formatMoney(orderDetails.tax_amount || 0)}</span></div>`,
      (orderDetails.service_charge_amount || 0) > 0
        ? `<div class="summary-row"><span>Service Charge (${orderDetails.service_charge_percentage || 0}%)</span><span>${formatMoney(orderDetails.service_charge_amount || 0)}</span></div>`
        : '',
      (orderDetails.delivery_fee || 0) > 0
        ? `<div class="summary-row"><span>Biaya Pengiriman</span><span>${formatMoney(orderDetails.delivery_fee || 0)}</span></div>`
        : '',
    ].filter(Boolean).join('');

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice ${orderDetails.order_number}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: Arial, sans-serif;
              background: white;
              color: #0f172a;
              padding: 32px 20px;
            }
            .shell { max-width: 920px; margin: 0 auto; }
            .card {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 24px;
              overflow: hidden;
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
            .title { margin: 0; font-size: 30px; }
            .subtitle { margin: 6px 0 0; color: #64748b; font-size: 14px; }
            .meta { display: flex; flex-wrap: wrap; gap: 10px; }
            .meta-chip {
              padding: 8px 12px;
              border-radius: 999px;
              background: #ffffff;
              border: 1px solid #dbe2ea;
              font-size: 12px;
              font-weight: 700;
            }
            .content { padding: 24px; }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 16px;
              margin-bottom: 24px;
            }
            .info-card {
              border: 1px solid #e5e7eb;
              border-radius: 18px;
              padding: 18px;
            }
            .info-title {
              margin: 0 0 14px;
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              color: #64748b;
            }
            .info-list { display: grid; gap: 10px; }
            .info-row {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              font-size: 14px;
            }
            .section-title { margin: 0 0 12px; font-size: 18px; }
            .table-wrap {
              border: 1px solid #e5e7eb;
              border-radius: 18px;
              overflow: hidden;
            }
            table { width: 100%; border-collapse: collapse; }
            thead { background: #f8fafc; }
            th {
              padding: 14px 18px;
              font-size: 12px;
              text-transform: uppercase;
              text-align: left;
            }
            td {
              padding: 16px 18px;
              border-top: 1px solid #edf2f7;
              font-size: 14px;
            }
            .qty-cell, .price-cell { text-align: right; white-space: nowrap; }
            .item-name { font-weight: 700; }
            .item-note { margin-top: 6px; font-size: 12px; color: #6b7280; }
            .summary {
              width: min(100%, 360px);
              margin: 24px 0 0 auto;
              padding: 18px 20px;
              border: 1px solid #e5e7eb;
              border-radius: 18px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .discount span { color: #dc2626; }
            .summary-total {
              display: flex;
              justify-content: space-between;
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
              font-size: 14px;
            }
            .footer {
              margin-top: 24px;
              text-align: center;
              color: #64748b;
              font-size: 13px;
            }
            @media (max-width: 640px) {
              .info-grid { grid-template-columns: 1fr; }
            }
          </style>
        </head>
        <body>
          <div class="shell">
            <div class="card">
              <div class="header">
                <div>
                  <div class="eyebrow">Invoice Pesanan</div>
                  <h1 class="title">Invoice ${orderDetails.order_number}</h1>
                  <p class="subtitle">${escapeHtml(restaurantName)}</p>
                  <p class="subtitle">${createdAt}</p>
                </div>
                <div class="meta">
                  <span class="meta-chip">${formatOrderType(orderDetails.order_type)}</span>
                  ${orderDetails.table_number ? `<span class="meta-chip">Meja ${orderDetails.table_number}</span>` : ''}
                </div>
              </div>
              <div class="content">
                <div class="info-grid">
                  <div class="info-card">
                    <h2 class="info-title">Informasi Order</h2>
                    <div class="info-list">
                      <div class="info-row"><span>No. Order</span><span>${orderDetails.order_number}</span></div>
                      <div class="info-row"><span>Tipe</span><span>${formatOrderType(orderDetails.order_type)}</span></div>
                      ${orderDetails.table_number ? `<div class="info-row"><span>Meja</span><span>${orderDetails.table_number}</span></div>` : ''}
                    </div>
                  </div>
                  <div class="info-card">
                    <h2 class="info-title">Informasi Pelanggan</h2>
                    <div class="info-list">
                      <div class="info-row"><span>Nama</span><span>${escapeHtml(orderDetails.customer_name || '-')}</span></div>
                      <div class="info-row"><span>Telepon</span><span>${escapeHtml(orderDetails.customer_phone || '-')}</span></div>
                      ${orderDetails.delivery_address ? `<div class="info-row"><span>Alamat</span><span>${escapeHtml(orderDetails.delivery_address)}</span></div>` : ''}
                    </div>
                  </div>
                </div>
                <h2 class="section-title">Item Pesanan</h2>
                <div class="table-wrap">
                  <table>
                    <thead><tr><th>Item</th><th class="qty-cell">Qty</th><th class="price-cell">Harga</th><th class="price-cell">Subtotal</th></tr></thead>
                    <tbody>${itemRows}</tbody>
                  </table>
                </div>
                <div class="summary">
                  ${summaryRows}
                  <div class="summary-total"><span>Total</span><span>${formatMoney(orderDetails.total_amount)}</span></div>
                </div>
                ${orderDetails.notes ? `<div class="notes"><strong>Catatan:</strong> ${escapeHtml(orderDetails.notes)}</div>` : ''}
              </div>
            </div>
            <div class="footer"><p>Terima kasih telah berbelanja di ${escapeHtml(restaurantName)}.</p></div>
          </div>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(invoiceHtml);
    iframeDoc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };

    if (iframe.contentWindow?.document.readyState === 'complete') {
      iframe.onload?.(new Event('load'));
    }
  };

  // ===== CETAK SURAT JALAN =====
  const handlePrintDeliveryNote = () => {
    if (!orderDetails) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.error('Cannot access iframe document');
      document.body.removeChild(iframe);
      return;
    }

    const restaurantName = user?.restaurant_name || 'Restoran JetNote Pos';
    const createdAt = orderDetails.created_at ? formatInvoiceDate(orderDetails.created_at) : '-';

    const itemRows = (orderDetails.items || []).map((item) => `
      <tr>
        <td class="item-cell">
          <div class="item-name">${escapeHtml(item.name)}</div>
          ${item.special_instructions ? `<div class="item-note">Catatan: ${escapeHtml(item.special_instructions)}</div>` : ''}
        </td>
        <td class="qty-cell">${item.quantity}</td>
      </tr>
    `).join('');

    const deliveryHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Surat Jalan ${orderDetails.order_number}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; background: white; color: #0f172a; padding: 32px 20px; }
            .shell { max-width: 720px; margin: 0 auto; }
            .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 24px; overflow: hidden; }
            .header { padding: 24px; border-bottom: 1px solid #e5e7eb; background: #f8fafc; text-align: center; }
            .title { margin: 0; font-size: 28px; }
            .subtitle { margin: 6px 0 0; color: #64748b; font-size: 14px; }
            .content { padding: 24px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
            .info-card { border: 1px solid #e5e7eb; border-radius: 18px; padding: 18px; }
            .info-title { margin: 0 0 14px; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; }
            .info-list { display: grid; gap: 10px; }
            .info-row { display: flex; justify-content: space-between; gap: 16px; font-size: 14px; }
            .section-title { margin: 0 0 12px; font-size: 18px; }
            .table-wrap { border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; }
            table { width: 100%; border-collapse: collapse; }
            thead { background: #f8fafc; }
            th { padding: 14px 18px; font-size: 12px; text-transform: uppercase; text-align: left; }
            td { padding: 16px 18px; border-top: 1px solid #edf2f7; font-size: 14px; }
            .qty-cell { text-align: right; white-space: nowrap; }
            .item-name { font-weight: 700; }
            .item-note { margin-top: 6px; font-size: 12px; color: #6b7280; }
            .footer { margin-top: 24px; text-align: center; color: #64748b; font-size: 13px; }
            @media (max-width: 640px) { .info-grid { grid-template-columns: 1fr; } }
          </style>
        </head>
        <body>
          <div class="shell">
            <div class="card">
              <div class="header">
                <h1 class="title">SURAT JALAN</h1>
                <p class="subtitle">${escapeHtml(restaurantName)}</p>
                <p class="subtitle">${createdAt}</p>
              </div>
              <div class="content">
                <div class="info-grid">
                  <div class="info-card">
                    <h2 class="info-title">Informasi Order</h2>
                    <div class="info-list">
                      <div class="info-row"><span>No. Order</span><span>${orderDetails.order_number}</span></div>
                      <div class="info-row"><span>Tipe</span><span>${formatOrderType(orderDetails.order_type)}</span></div>
                      ${orderDetails.table_number ? `<div class="info-row"><span>Meja</span><span>${orderDetails.table_number}</span></div>` : ''}
                    </div>
                  </div>
                  <div class="info-card">
                    <h2 class="info-title">Informasi Pelanggan</h2>
                    <div class="info-list">
                      <div class="info-row"><span>Nama</span><span>${escapeHtml(orderDetails.customer_name || '-')}</span></div>
                      <div class="info-row"><span>Telepon</span><span>${escapeHtml(orderDetails.customer_phone || '-')}</span></div>
                      ${orderDetails.delivery_address ? `<div class="info-row"><span>Alamat</span><span>${escapeHtml(orderDetails.delivery_address)}</span></div>` : ''}
                    </div>
                  </div>
                </div>
                <h2 class="section-title">Item Pesanan</h2>
                <div class="table-wrap">
                  <table>
                    <thead><tr><th>Item</th><th class="qty-cell">Qty</th></tr></thead>
                    <tbody>${itemRows}</tbody>
                  </table>
                </div>
                ${orderDetails.notes ? `<div class="notes" style="margin-top:24px;"><strong>Catatan:</strong> ${escapeHtml(orderDetails.notes)}</div>` : ''}
              </div>
            </div>
            <div class="footer"><p>Terima kasih telah berbelanja di ${escapeHtml(restaurantName)}.</p></div>
          </div>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(deliveryHtml);
    iframeDoc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };

    if (iframe.contentWindow?.document.readyState === 'complete') {
      iframe.onload?.(new Event('load'));
    }
  };

  // ===== FUNGSI ANDROID BLUETOOTH =====
  const handleScan = async () => {
    if (platform !== 'android') {
      alert('Scan hanya tersedia di Android.');
      return;
    }
    setIsScanning(true);
    try {
      const devices = await printService.scanPrinters();
      setPrinters(devices);
      if (devices.length === 0) alert('Tidak ditemukan printer.');
    } catch (err) {
      alert('Gagal scan: ' + (err as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (address: string) => {
    try {
      await printService.connect(address);
      localStorage.setItem('android_printer', address);
      setSelectedPrinter(address);
      alert('Terhubung ke printer!');
    } catch (err) {
      alert('Gagal konek: ' + (err as Error).message);
    }
  };

  const handlePrintReceipt = async () => {
    if (!orderDetails) return;
    setIsPrinting(true);
    try {
      const data = {
        orderNumber: orderDetails.order_number,
        items: orderDetails.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.unit_price,
        })),
        total: orderDetails.total_amount,
        customerName: orderDetails.customer_name,
        restaurantName: user?.restaurant_name || 'Restoran JetNote Pos',
      };
      await printService.print(data);
    } catch (err) {
      alert('Gagal mencetak: ' + (err as Error).message);
    } finally {
      setIsPrinting(false);
    }
  };

  // ===== FUNGSI EDIT =====
  const startEditing = () => {
    if (!orderDetails) return;
    setEditItems(orderDetails.items.map(item => ({ ...item })));
    setEditSubtotal(orderDetails.subtotal);
    setEditTaxPercentage(orderDetails.tax_percentage);
    setEditTaxAmount(orderDetails.tax_amount);
    setEditDiscountPercentage(orderDetails.discount_percentage);
    setEditDiscountAmount(orderDetails.discount_amount);
    setEditServiceChargePercentage(orderDetails.service_charge_percentage);
    setEditServiceChargeAmount(orderDetails.service_charge_amount);
    setEditDeliveryFee(orderDetails.delivery_fee);
    setEditNotes(orderDetails.notes);
    setEditCustomerName(orderDetails.customer_name || '');
    setEditCustomerPhone(orderDetails.customer_phone || '');
    setEditDeliveryAddress(orderDetails.delivery_address || '');
    setIsEditing(true);
  };

  const updateEditItem = (index: number, field: string, value: any) => {
    const newItems = [...editItems];
    const item = newItems[index];
    if (field === 'quantity') {
      item.quantity = Number(value);
      item.total_price = item.unit_price * item.quantity;
    } else if (field === 'unit_price') {
      item.unit_price = Number(value);
      item.total_price = item.unit_price * item.quantity;
    }
    setEditItems(newItems);
    const newSubtotal = newItems.reduce((sum, i) => sum + i.total_price, 0);
    setEditSubtotal(newSubtotal);
    const newTaxAmount = (newSubtotal * editTaxPercentage) / 100;
    const newDiscountAmount = (newSubtotal * editDiscountPercentage) / 100;
    const newServiceChargeAmount = (newSubtotal * editServiceChargePercentage) / 100;
    setEditTaxAmount(newTaxAmount);
    setEditDiscountAmount(newDiscountAmount);
    setEditServiceChargeAmount(newServiceChargeAmount);
  };

  const handleSaveEdit = async () => {
    if (!orderDetails || !user) return;
    setSavingEdit(true);

    try {
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderDetails.id);
      if (deleteError) throw deleteError;

      const newOrderItems = editItems.map(item => ({
        order_id: orderDetails.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        special_instructions: item.special_instructions || null,
      }));

      const { error: insertError } = await supabase
        .from('order_items')
        .insert(newOrderItems);
      if (insertError) throw insertError;

      const newTotalAmount = editSubtotal + editTaxAmount + editServiceChargeAmount + editDeliveryFee - editDiscountAmount;
      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({
          customer_name: editCustomerName,
          customer_phone: editCustomerPhone,
          delivery_address: editDeliveryAddress || null,
          subtotal: editSubtotal,
          tax_percentage: editTaxPercentage,
          tax_amount: editTaxAmount,
          discount_percentage: editDiscountPercentage,
          discount_amount: editDiscountAmount,
          service_charge_percentage: editServiceChargePercentage,
          service_charge_amount: editServiceChargeAmount,
          delivery_fee: editDeliveryFee,
          total_amount: newTotalAmount,
          notes: editNotes,
        })
        .eq('id', orderDetails.id);
      if (updateOrderError) throw updateOrderError;

      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('order_id', orderDetails.id)
        .single();

      if (existingTransaction) {
        const { error: updateTransError } = await supabase
          .from('transactions')
          .update({ amount: newTotalAmount })
          .eq('order_id', orderDetails.id);
        if (updateTransError) throw updateTransError;
      }

      await fetchOrderDetails();
      alert('Transaksi berhasil diupdate');
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan perubahan');
    } finally {
      setSavingEdit(false);
    }
  };

  // ===== INVENTORY =====
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
        const { data: invItem } = await supabase
          .from('inventory')
          .select('id, current_stock')
          .eq('id', recipe.inventory_id)
          .single();
        if (!invItem) continue;

        if (!skipStockUpdate) {
          const newStock = Math.max(0, invItem.current_stock - totalDeduction);
          await supabase
            .from('inventory')
            .update({ current_stock: newStock })
            .eq('id', recipe.inventory_id);
        }
      }
    }

    if (orderDetails.table_id) {
      await supabase
        .from('restaurant_tables')
        .update({ is_available: true })
        .eq('id', orderDetails.table_id);
    }
  };

  // ===== PAYMENT =====
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
        await fetchOrderDetails();
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

      await processInventoryAndExpenses(false);
      await fetchOrderDetails();
      alert('Pembayaran berhasil! Invoice telah diperbarui.');
    } catch (error: any) {
      console.error('Error processing payment:', error);
      if (error.message?.includes('duplicate') || error.message?.includes('unique_transaction_per_order')) {
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

  // ===== SEND EMAIL =====
  const handleSendToOwner = async () => {
    if (!orderDetails) {
      alert('Data order belum tersedia.');
      return;
    }
    if (!user?.email) {
      alert('Email owner tidak ditemukan.');
      return;
    }

    const invoiceElement = document.getElementById('invoice-content');
    if (!invoiceElement) {
      alert('Konten invoice tidak ditemukan.');
      return;
    }

    const clone = invoiceElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('button').forEach(btn => btn.remove());
    const invoiceHtml = clone.outerHTML;

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

  // ===== LOADING =====
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

  // ===== RENDER =====
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ===== HEADER ===== */}
        <div className="border-b bg-gray-50 p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">

            {/* LEFT TITLE */}
            <div className="flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900">Invoice</h2>
              <p className="text-sm text-gray-600">Order #{orderDetails.order_number}</p>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex flex-col gap-2 w-full lg:w-auto">
              {/* Row 1: Primary actions (Print & Send Email) */}
              <div className="flex flex-wrap items-center gap-2">
                {/* ===== CETAK UTAMA ===== */}
                {(platformOS === 'windows' || platformOS === 'macos') && (
                  <button
                    onClick={handlePrint}
                    disabled={isPrinting || isDetecting}
                    className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    <PrinterIcon className="w-5 h-5 mr-2" />
                    {isPrinting ? 'Mencetak...' : 'Print'}
                  </button>
                )}
                {platformOS === 'ios' && (
                  <button
                    onClick={() => { alert('⚠️ Cetak via AirPrint menggunakan HTML.'); handlePrintHTML(); }}
                    className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    <PrinterIcon className="w-5 h-5 mr-2" />
                    Cetak AirPrint
                  </button>
                )}
                {isNative && platform === 'android' && (
                  <button
                    onClick={handlePrintReceipt}
                    disabled={isPrinting || !selectedPrinter}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isPrinting ? 'Mencetak...' : 'Cetak Bluetooth'}
                    <PrinterIcon className="w-5 h-5 ml-2" />
                  </button>
                )}

                {/* Send Email */}
                <button
                  onClick={handleSendToOwner}
                  disabled={sendingEmail}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  ) : (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19h14a2 2 0 002-2V7" />
                    </svg>
                  )}
                  Email
                </button>
              </div>

              {/* Row 2: Secondary actions (smaller buttons) */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* PDF Invoice */}
                <button
                  onClick={handlePrintPDF}
                  className="flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <PrinterIcon className="w-4 h-4 mr-1" />
                  PDF Invoice
                </button>

                {/* HTML fallback */}
                <button
                  onClick={handlePrintHTML}
                  className="flex items-center px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  <PrinterIcon className="w-4 h-4 mr-1" />
                  HTML
                </button>

                {/* Surat Jalan - hanya jika takeaway */}
                {(orderDetails.order_type === 'delivery' || orderDetails.order_type === 'delivery') && (
                  <button
                    onClick={handlePrintDeliveryNote}
                    className="flex items-center px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    <PrinterIcon className="w-4 h-4 mr-1" />
                    Surat Jalan
                  </button>
                )}

                {/* Edit */}
                {!isEditing && (
                  <button
                    onClick={startEditing}
                    className="flex items-center px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}

                {/* Windows/Mac extra tools */}
                {(platformOS === 'windows' || platformOS === 'macos') && (
                  <>
                    <button
                      onClick={handleDetectWindowsPrinters}
                      disabled={isDetecting}
                      className="flex items-center px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      {isDetecting ? 'Mendeteksi...' : 'Detect'}
                    </button>

                    {windowsPrinters.length > 0 && (
                      <select
                        value={selectedWindowsPrinter}
                        onChange={(e) => {
                          setSelectedWindowsPrinter(e.target.value);
                          localStorage.setItem("qz_printer", e.target.value);
                        }}
                        className="px-2 py-1 text-xs border rounded bg-white"
                      >
                        {windowsPrinters.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    )}

                    <button
                      onClick={() => setShowCertUpload(!showCertUpload)}
                      className="flex items-center px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Cert
                    </button>

                    {showCertUpload && (
                      <div className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                        <input type="file" accept=".pem,.crt,.txt" onChange={handleCertificateUpload} className="text-xs" />
                        <span className="text-xs text-gray-600">{certificateStatus}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Android extra tools */}
                {isNative && platform === 'android' && (
                  <>
                    <button
                      onClick={handleScan}
                      disabled={isScanning}
                      className="flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isScanning ? 'Memindai...' : 'Scan'}
                    </button>

                    {printers.length > 0 && (
                      <select
                        value={selectedPrinter || ""}
                        onChange={(e) => handleConnect(e.target.value)}
                        className="px-2 py-1 text-xs border rounded bg-white"
                      >
                        <option value="">Pilih Printer</option>
                        {printers.map((p) => (
                          <option key={p.address} value={p.address}>{p.name || p.address}</option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right icons (close, guide) */}
            <div className="flex items-start gap-2 flex-shrink-0">
              <button onClick={() => setShowGuide(true)} className="p-2 rounded-full hover:bg-gray-100" title="Panduan">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {showGuide && (
          <PrintGuide onClose={() => setShowGuide(false)} />
        )}

        {/* ===== CONTENT ===== */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <div className="space-y-6">
              {/* Edit UI (sama seperti sebelumnya) */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Edit Transaksi</h3>
                <button onClick={() => setIsEditing(false)} className="text-red-500">Batal</button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium">Informasi Pelanggan</h4>
                <div><label className="block text-sm text-gray-600">Nama Customer</label><input type="text" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} className="w-full border rounded px-3 py-2" /></div>
                <div><label className="block text-sm text-gray-600">Telepon</label><input type="text" value={editCustomerPhone} onChange={(e) => setEditCustomerPhone(e.target.value)} className="w-full border rounded px-3 py-2" /></div>
                <div><label className="block text-sm text-gray-600">Alamat Pengiriman</label><textarea value={editDeliveryAddress} onChange={(e) => setEditDeliveryAddress(e.target.value)} className="w-full border rounded px-3 py-2" rows={2} /></div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead className="bg-gray-50"><tr><th>Item</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {editItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td><input type="number" min="0" value={item.quantity} onChange={(e) => updateEditItem(idx, 'quantity', e.target.value)} className="w-20 border rounded px-2 py-1" /></td>
                        <td><input type="number" min="0" value={item.unit_price} onChange={(e) => updateEditItem(idx, 'unit_price', e.target.value)} className="w-28 border rounded px-2 py-1" /></td>
                        <td>Rp {item.total_price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span>Subtotal</span><span>Rp {editSubtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Diskon (%)</span><input type="number" value={editDiscountPercentage} onChange={(e) => { const val = Number(e.target.value); setEditDiscountPercentage(val); setEditDiscountAmount((editSubtotal * val) / 100); }} className="w-24 border rounded px-2 py-1 text-right" /><span>- Rp {editDiscountAmount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Pajak (%)</span><input type="number" value={editTaxPercentage} onChange={(e) => { const val = Number(e.target.value); setEditTaxPercentage(val); setEditTaxAmount((editSubtotal * val) / 100); }} className="w-24 border rounded px-2 py-1 text-right" /><span>Rp {editTaxAmount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Service Charge (%)</span><input type="number" value={editServiceChargePercentage} onChange={(e) => { const val = Number(e.target.value); setEditServiceChargePercentage(val); setEditServiceChargeAmount((editSubtotal * val) / 100); }} className="w-24 border rounded px-2 py-1 text-right" /><span>Rp {editServiceChargeAmount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Biaya Kirim</span><input type="number" value={editDeliveryFee} onChange={(e) => setEditDeliveryFee(Number(e.target.value))} className="w-28 border rounded px-2 py-1 text-right" /></div>
                <div className="flex justify-between font-bold"><span>Total</span><span>Rp {(editSubtotal + editTaxAmount + editServiceChargeAmount + editDeliveryFee - editDiscountAmount).toLocaleString()}</span></div>
                <div><label>Catatan</label><textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="w-full border rounded px-2 py-1" rows={2} /></div>
              </div>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="w-full py-2 bg-green-600 text-white rounded-lg">{savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          ) : (
            <div id="invoice-content">
              {/* ===== INVOICE DISPLAY ===== */}
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
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Informasi Order</h3>
                  <div className="space-y-1">
                    <p><span className="text-gray-600">No. Order:</span> {orderDetails.order_number}</p>
                    <p><span className="text-gray-600">Tipe:</span> <span className="capitalize">{orderDetails.order_type.replace('_', ' ')}</span></p>
                    {orderDetails.table_number && <p><span className="text-gray-600">Meja:</span> {orderDetails.table_number}</p>}
                    <p><span className="text-gray-600">Status:</span> <span className={`px-2 py-1 text-xs rounded-full ${orderDetails.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{orderDetails.status}</span></p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Informasi Customer</h3>
                  <div className="space-y-1">
                    <p><span className="text-gray-600">Nama:</span> {orderDetails.customer_name || '-'}</p>
                    <p><span className="text-gray-600">Telepon:</span> {orderDetails.customer_phone || '-'}</p>
                    {orderDetails.delivery_address && <p><span className="text-gray-600">Alamat:</span> {orderDetails.delivery_address}</p>}
                  </div>
                </div>
              </div>
              <div className="mb-8">
                <h3 className="font-semibold text-gray-700 mb-4">Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th></tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orderDetails.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{item.name}</div>{item.special_instructions && <div className="text-sm text-gray-500 italic">Note: {item.special_instructions}</div>}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">Rp {item.unit_price.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">Rp {item.total_price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="ml-auto w-full md:w-1/2">
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>Rp {orderDetails.subtotal.toLocaleString()}</span></div>
                  {orderDetails.discount_amount > 0 && <div className="flex justify-between text-red-600"><span>Diskon ({orderDetails.discount_percentage}%)</span><span>- Rp {orderDetails.discount_amount.toLocaleString()}</span></div>}
                  <div className="flex justify-between"><span>Pajak ({orderDetails.tax_percentage}%)</span><span>Rp {orderDetails.tax_amount.toLocaleString()}</span></div>
                  {orderDetails.service_charge_amount > 0 && <div className="flex justify-between"><span>Service Charge ({orderDetails.service_charge_percentage}%)</span><span>Rp {orderDetails.service_charge_amount.toLocaleString()}</span></div>}
                  {orderDetails.delivery_fee > 0 && <div className="flex justify-between"><span>Biaya Pengiriman</span><span>Rp {orderDetails.delivery_fee.toLocaleString()}</span></div>}
                  <div className="flex justify-between text-lg font-bold pt-3 border-t"><span>Total</span><span>Rp {orderDetails.total_amount.toLocaleString()}</span></div>
                </div>
              </div>
              {orderDetails.notes && <div className="mt-8 p-4 bg-gray-50 rounded-lg"><h4 className="font-semibold text-gray-700 mb-2">Catatan:</h4><p className="text-gray-600">{orderDetails.notes}</p></div>}
            </div>
          )}

          {/* ===== PAYMENT SECTION ===== */}
          {orderDetails.payment_status !== 'paid' && (
            <div className="mt-8 border-t pt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pembayaran</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Metode Pembayaran</label>
                  <div className="grid grid-cols-4 gap-3">
                    {['cash', 'card', 'qris', 'transfer'].map((method) => (
                      <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`py-3 px-4 rounded-lg border-2 flex flex-col items-center justify-center ${paymentMethod === method ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-gray-300'}`}>
                        <span className="text-2xl mb-2">{method === 'cash' && '💵'}{method === 'card' && '💳'}{method === 'qris' && '📱'}{method === 'transfer' && '🏦'}</span>
                        <span className="text-sm font-medium capitalize">{method === 'qris' ? 'QRIS' : method}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {paymentMethod === 'cash' && (
                  <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Uang Diterima</label><input type="number" value={cashReceived || ''} onChange={(e) => calculateChange(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary" placeholder="Masukkan jumlah uang" /></div>
                    {cashReceived > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-lg"><span className="text-gray-600">Total:</span><span className="font-bold">Rp {orderDetails.total_amount.toLocaleString()}</span></div>
                        <div className="flex justify-between text-lg"><span className="text-gray-600">Dibayar:</span><span className="font-bold">Rp {cashReceived.toLocaleString()}</span></div>
                        <div className="flex justify-between text-lg text-green-600 font-bold pt-2 border-t"><span>Kembalian:</span><span>Rp {changeAmount.toLocaleString()}</span></div>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={handlePayment} disabled={isProcessing || !paymentMethod || (paymentMethod === 'cash' && cashReceived < orderDetails.total_amount)} className="w-full py-4 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                  {isProcessing ? (<><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>Memproses...</>) : (<><CheckCircleIcon className="w-6 h-6 mr-2" />Konfirmasi Pembayaran</>)}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <div><p className="text-sm text-gray-600">Invoice ini akan tersimpan di database</p></div>
            <div className="flex space-x-3">
              {orderDetails.payment_status === 'paid' && (<span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center"><CheckCircleIcon className="w-4 h-4 mr-2" />Lunas</span>)}
              <button onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Tutup</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}