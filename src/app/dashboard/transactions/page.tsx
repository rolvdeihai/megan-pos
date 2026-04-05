'use client';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PlusIcon,
  ReceiptRefundIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '@/components/auth/AuthProvider';
import { DocumentArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Tesseract from 'tesseract.js';
import { AnimatePresence, motion } from 'framer-motion';

type ParsedImportedTransaction = {
  amount: number;
  type?: string;
  transaction_number?: string;
  transaction_date?: string;
  category?: string;
  payment_method?: string;
  notes?: string;
};

type TempImportedTransaction = {
  id: string;
  amount: number;
  transaction_type: 'expense' | 'income';
  transaction_number: string;
  transaction_date: string;
  payment_method: string;
  expense_category: string;
  type_indicator: string;
  notes: string;
};

type PersistedTransactionType = 'sale' | 'refund' | 'expense';

type Transaction = {
  id: string;
  transaction_number: string;
  type: 'sale' | 'refund' | 'expense';
  amount: number;
  payment_method: string;
  status: string;
  notes: string;
  created_at: string;
  order_id: string;
  order_number?: string;
  customer_name?: string;
};

function CountUpValue({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    const from = 0;
    const diff = value - from;
    let raf = 0;

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + diff * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>Rp {display.toLocaleString('id-ID')}</>;
}

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_status: string;
};

const getTodayInputDate = () => new Date().toISOString().split('T')[0];

const normalizePaymentMethod = (
  paymentMethod: string | undefined,
  transactionType: 'expense' | 'income',
  fallbackText = ''
) => {
  const normalized = `${paymentMethod || ''} ${fallbackText}`.toLowerCase().trim();

  if (normalized.includes('transfer') || normalized.includes('bank')) return 'transfer';
  if (normalized.includes('qris') || normalized.includes('qr')) return 'qris';
  if (normalized.includes('kartu debit') || normalized.includes('debit card') || normalized.includes('credit card') || normalized.includes('kartu kredit') || (normalized.includes('card') && !normalized.includes('e-banking'))) return 'card';
  if (normalized.includes('cash') || normalized.includes('tunai')) return 'cash';

  return transactionType === 'income' ? 'transfer' : 'cash';
};

type BulkImportedTransactionsModalProps = {
  items: TempImportedTransaction[];
  setItems: Dispatch<SetStateAction<TempImportedTransaction[]>>;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
};

function BulkImportedTransactionsModal({
  items,
  setItems,
  activeIndex,
  setActiveIndex,
  onClose,
  onSave
}: BulkImportedTransactionsModalProps) {
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
  const [amountInput, setAmountInput] = useState('');

  useEffect(() => {
    if (!currentItem) return;
    setAmountInput(currentItem.amount ? String(currentItem.amount) : '');
  }, [currentItem?.id, currentItem?.amount]);

  if (!currentItem) return null;

  const updateCurrentItem = (updates: Partial<TempImportedTransaction>) => {
    setItems((prevItems) => {
      const nextItems = [...prevItems];
      const safeIndex = Math.min(activeIndex, nextItems.length - 1);
      if (safeIndex < 0) return prevItems;
      nextItems[safeIndex] = { ...nextItems[safeIndex], ...updates };
      return nextItems;
    });
  };

  const addNewItem = () => {
    const newItem: TempImportedTransaction = {
      id: `temp-${Date.now()}-${Math.random()}`,
      amount: 0,
      transaction_type: 'expense',
      transaction_number: '',
      transaction_date: getTodayInputDate(),
      payment_method: 'transfer',
      expense_category: 'operational',
      type_indicator: '',
      notes: '',
    };
    setItems((prevItems) => {
      setActiveIndex(prevItems.length);
      return [...prevItems, newItem];
    });
  };

  const removeCurrentItem = () => {
    if (items.length === 1) {
      alert('Setidaknya harus ada satu item');
      return;
    }
    setItems((prevItems) => {
      const newItems = prevItems.filter((_, i) => i !== activeIndex);
      setActiveIndex(Math.min(activeIndex, newItems.length - 1));
      return newItems;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Import Transaksi dari OCR</h2>
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
              <label className="block text-sm font-medium text-gray-700">Tipe Transaksi *</label>
              <select
                value={currentItem.transaction_type}
                onChange={(e) => updateCurrentItem({
                  transaction_type: e.target.value as 'expense' | 'income',
                  payment_method: normalizePaymentMethod(currentItem.payment_method, e.target.value as 'expense' | 'income'),
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">No. Transaksi / Deskripsi *</label>
              <input
                type="text"
                required
                value={currentItem.transaction_number}
                onChange={(e) => updateCurrentItem({ transaction_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Untuk mutasi rekening gunakan deskripsi transaksi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tanggal Transaksi *</label>
              <input
                type="date"
                required
                value={currentItem.transaction_date}
                onChange={(e) => updateCurrentItem({ transaction_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Jumlah (Rp) *</label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={amountInput}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, '');
                  setAmountInput(raw);
                  updateCurrentItem({ amount: raw ? Number(raw) : 0 });
                }}
                onBlur={() => {
                  setAmountInput(currentItem.amount ? String(currentItem.amount) : '');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Masukkan jumlah"
              />
            </div>

            {currentItem.transaction_type === 'expense' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Kategori Pengeluaran</label>
                <select
                  value={currentItem.expense_category}
                  onChange={(e) => updateCurrentItem({ expense_category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="operational">Operasional</option>
                  <option value="ingredients">Bahan Baku</option>
                  <option value="utilities">Listrik/Air/Internet</option>
                  <option value="salary">Gaji Karyawan</option>
                  <option value="rent">Sewa Tempat</option>
                  <option value="marketing">Marketing</option>
                  <option value="maintenance">Pemeliharaan</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Metode Pembayaran</label>
              <select
                value={currentItem.payment_method}
                onChange={(e) => updateCurrentItem({ payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Indikator Tipe (OCR)</label>
              <input
                type="text"
                value={currentItem.type_indicator}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-600 rounded-lg"
                placeholder="-"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Catatan</label>
              <textarea
                value={currentItem.notes}
                onChange={(e) => updateCurrentItem({ notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder={currentItem.transaction_type === 'expense'
                  ? 'Contoh: Beli bahan baku bulanan'
                  : 'Contoh: Transfer masuk dari pelanggan'}
              />
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
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  // Default filter: Bulan Ini (tanggal 1 sampai hari ini)
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const date = new Date();
    date.setDate(1); // Tanggal 1 bulan ini
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date; // Hari ini
  });
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [transactionType, setTransactionType] = useState<string>('all');
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalRefunds: 0,
    totalExpenses: 0,
    netIncome: 0,
    totalTransactions: 0,
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'refund'>('expense');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [unsavedImportedTransactions, setUnsavedImportedTransactions] = useState<TempImportedTransaction[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [activeImportIndex, setActiveImportIndex] = useState(0);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'cash',
    notes: '',
    order_id: '',
    refund_reason: '',
    expense_category: 'operational',
  });

  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
      fetchPaidOrders(); // Fetch orders for refund selection
    }
  }, [startDate, endDate, paymentMethod, transactionType, user]);

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

  const normalizeExpenseCategory = (category?: string) => {
    const normalized = category?.toLowerCase().trim() || '';

    if (normalized.includes('bahan')) return 'ingredients';
    if (normalized.includes('listrik') || normalized.includes('air') || normalized.includes('internet') || normalized.includes('utilit')) return 'utilities';
    if (normalized.includes('gaji') || normalized.includes('salary')) return 'salary';
    if (normalized.includes('sewa') || normalized.includes('rent')) return 'rent';
    if (normalized.includes('marketing') || normalized.includes('iklan') || normalized.includes('promo')) return 'marketing';
    if (normalized.includes('maintenance') || normalized.includes('pemeliharaan') || normalized.includes('service')) return 'maintenance';
    if (normalized.includes('lain') || normalized.includes('other')) return 'other';

    return 'operational';
  };

  const normalizeImportedTransactionType = (value?: string): 'expense' | 'income' => {
    const normalized = value?.toLowerCase().trim() || '';

    if (
      normalized.includes('income') ||
      normalized.includes('credit') ||
      normalized === 'cr' ||
      normalized.includes('pemasukan')
    ) {
      return 'income';
    }

    if (
      normalized.includes('expense') ||
      normalized.includes('debit') ||
      normalized === 'db' ||
      normalized.includes('pengeluaran')
    ) {
      return 'expense';
    }

    return 'expense';
  };

  const isImportedIncomeTransaction = (transaction: Transaction) => {
    return transaction.type === 'sale' && (transaction.notes || '').startsWith('[OCR_INCOME]');
  };

  const getDisplayTransactionType = (transaction: Transaction): 'sale' | 'refund' | 'expense' | 'income' => {
    return isImportedIncomeTransaction(transaction) ? 'income' : transaction.type;
  };

  const normalizeImportedDate = (rawDate?: string) => {
    if (!rawDate) return getTodayInputDate();

    const trimmed = rawDate.trim();
    if (!trimmed) return getTodayInputDate();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const monthMap: Record<string, string> = {
      jan: '01',
      january: '01',
      januari: '01',
      feb: '02',
      february: '02',
      februari: '02',
      mar: '03',
      march: '03',
      maret: '03',
      apr: '04',
      april: '04',
      may: '05',
      mei: '05',
      jun: '06',
      june: '06',
      juni: '06',
      jul: '07',
      july: '07',
      juli: '07',
      aug: '08',
      august: '08',
      agu: '08',
      agustus: '08',
      sep: '09',
      sept: '09',
      september: '09',
      oct: '10',
      october: '10',
      okt: '10',
      oktober: '10',
      nov: '11',
      november: '11',
      dec: '12',
      december: '12',
      des: '12',
      desember: '12',
    };

    const slashMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      const normalizedYear = year.length === 2 ? `20${year}` : year;
      return `${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const wordMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (wordMatch) {
      const [, day, monthText, year] = wordMatch;
      const month = monthMap[monthText.toLowerCase()];
      if (month) {
        return `${year}-${month}-${day.padStart(2, '0')}`;
      }
    }

    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }

    return getTodayInputDate();
  };

  const parseIdrAmount = (value: string) => {
    const cleaned = value.replace(/[^0-9.,]/g, '').trim();
    if (!cleaned) return 0;

    if (cleaned.includes(',') && cleaned.includes('.')) {
      return Number(cleaned.replace(/,/g, ''));
    }

    const commaCount = (cleaned.match(/,/g) || []).length;
    const dotCount = (cleaned.match(/\./g) || []).length;

    if (commaCount === 1 && dotCount === 0) {
      const [whole, decimal] = cleaned.split(',');
      if ((decimal || '').length === 2) {
        return Number(`${whole}.${decimal}`);
      }
      return Number(whole + decimal);
    }

    if (dotCount > 1 || commaCount > 1) {
      return Number(cleaned.replace(/[.,]/g, ''));
    }

    return Number(cleaned.replace(/,/g, '').replace(/\.(?=\d{3}\b)/g, ''));
  };

  const parseBankMutationTransactions = (ocrText: string): ParsedImportedTransaction[] => {
    const lines = ocrText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const monthMap: Record<string, string> = {
      jan: '01', januari: '01', january: '01',
      feb: '02', februari: '02', february: '02',
      mar: '03', maret: '03', march: '03',
      apr: '04', april: '04',
      mei: '05', may: '05',
      jun: '06', juni: '06', june: '06',
      jul: '07', juli: '07', july: '07',
      aug: '08', agustus: '08', august: '08',
      sep: '09', september: '09',
      okt: '10', oktober: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', des: '12', desember: '12', december: '12',
    };

    const isNoiseLine = (l: string) => {
      const lower = l.toLowerCase().trim();
      if (/^IDR\s/i.test(l)) return true;
      if (/^\d{4}$/.test(l.trim())) return true;
      if (!!monthMap[lower]) return true;
      if (/^mar\b/i.test(lower) && l.trim().length < 10) return true;
      if (/^\d{4}\s+IDR/i.test(l)) return true;
      if (/^\d{4}\s+\d{1,3}(?:[,.]\d{3})+/.test(l)) return true;
      return false;
    };

    // --- Step 1: Detect the header month (e.g. "Maret") ---
    let headerMonth: string | null = null;
    for (const line of lines) {
      const word = line.trim().toLowerCase();
      if (monthMap[word]) {
        headerMonth = monthMap[word];
        break;
      }
    }

    // --- Step 2: Find all type-indicator lines (THE anchors) ---
    const typePattern = /TRSF.*\b(CR|DB)\b|\bE-BANKING\s*(CR|DB)\b|TRANSAKSI\s*(DEBIT|CREDIT)/i;
    const typeIndices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (typePattern.test(lines[i])) {
        typeIndices.push(i);
      }
    }

    if (typeIndices.length === 0) return [];

    const headerEnd = lines.findIndex((l) => !!monthMap[l.toLowerCase().trim()]);
    const contentStart = headerEnd >= 0 ? headerEnd + 1 : 0;

    console.log(`[BankMutation] Found ${typeIndices.length} type-indicator lines`);

    // --- Step 3: For each type line, scan forward for amount, backward for description ---
    const results: ParsedImportedTransaction[] = [];

    for (let t = 0; t < typeIndices.length; t++) {
      const typeIdx = typeIndices[t];
      const typeLine = lines[typeIdx];
      const upper = typeLine.toUpperCase();

      // --- Type ---
      const hasDebit = /\bDB\b|DEBIT/.test(upper);
      const hasCredit = /\bCR\b|CREDIT/.test(upper);
      let transactionType: 'expense' | 'income';
      if (hasDebit && !hasCredit) transactionType = 'expense';
      else if (hasCredit && !hasDebit) transactionType = 'income';
      else transactionType = 'expense';

      // --- Amount: scan forward up to 3 lines (but not past next type line) ---
      let amount = 0;
      const nextBoundary = t < typeIndices.length - 1 ? typeIndices[t + 1] : lines.length;
      for (let a = typeIdx + 1; a < Math.min(typeIdx + 4, nextBoundary); a++) {
        const line = lines[a];
        const idrMatch = line.match(/IDR\s*([\d,.\s]+)/i);
        if (idrMatch) {
          amount = parseIdrAmount(idrMatch[1]);
          if (amount) break;
        }
        const amtMatch = line.match(/(\d{1,3}(?:[,.]\d{3})+(?:\.\d{2})?)/);
        if (amtMatch) {
          const parsed = parseIdrAmount(amtMatch[1]);
          if (parsed >= 1000) { amount = parsed; break; }
        }
      }

      // --- Description: scan backward from type line to previous boundary ---
      const prevBoundary = t === 0 ? contentStart : typeIndices[t - 1] + 1;
      const descParts: string[] = [];
      for (let d = typeIdx - 1; d >= prevBoundary; d--) {
        const line = lines[d];
        if (isNoiseLine(line)) continue;
        if (/IDR\s*[\d,.\s]+/i.test(line)) continue;
        descParts.unshift(line);
      }

      const description = descParts
        .map((l) =>
          l.trim()
            .replace(/^[^A-Za-z0-9]+/, '')
            .replace(/^(\d)\s+(\d)\s+/, '')
            .replace(/^\d{1,2}\s+(?=\d{3,}\/)/, '')
            .replace(/^\d{1,2}\s+(?=[A-Z])/, '')
            .trim()
        )
        .filter((l) => l.length > 0)
        .join(' ')
        .trim() || `OCR ${transactionType}`;

      // --- Date: gather from vicinity (desc lines + type line + forward lines) ---
      const vicinity = [
        ...descParts,
        typeLine,
        ...lines.slice(typeIdx + 1, Math.min(typeIdx + 3, nextBoundary)),
      ];
      let day: string | null = null;
      let month = headerMonth;
      let year: string | null = null;

      for (const line of vicinity) {
        if (!year) {
          const ym = line.match(/\b(20\d{2})\b/);
          if (ym) year = ym[1];
          if (!year) {
            const ymFuzzy = line.match(/\b([2-5]0\d{2})\b/);
            if (ymFuzzy) {
              const n = Number(ymFuzzy[1]);
              if (n >= 2020 && n <= 2030) year = String(n);
              else if (n >= 5020 && n <= 5030) year = String(n - 3000);
            }
          }
        }
        if (!month) {
          const mk = Object.keys(monthMap).find((k) => new RegExp(`\\b${k}\\b`, 'i').test(line));
          if (mk) month = monthMap[mk];
        }
      }

      for (const line of descParts) {
        if (day) break;
        const trimmed = line.trim();
        const splitDay = trimmed.match(/^(\d)\s+(\d)\b/);
        if (splitDay) {
          const c = Number(`${splitDay[1]}${splitDay[2]}`);
          if (c >= 1 && c <= 31) { day = String(c).padStart(2, '0'); continue; }
        }
        const directDay = trimmed.match(/^(\d{1,2})\b/);
        if (directDay) {
          let c = Number(directDay[1]);
          if (c > 31 && c <= 39) c = 31;
          if (c >= 1 && c <= 31) { day = String(c).padStart(2, '0'); continue; }
        }
        const tglMatch = trimmed.match(/TGL[:\s]*(\d{2})(\d{2})/i);
        if (tglMatch) {
          const d = Number(tglMatch[2]);
          if (d >= 1 && d <= 31) {
            day = String(d).padStart(2, '0');
            month = month || String(Number(tglMatch[1])).padStart(2, '0');
          }
        }
      }

      const txDate = (day && month && year)
        ? `${year}-${month}-${day}`
        : (day && month) ? `${new Date().getFullYear()}-${month}-${day}` : getTodayInputDate();

      console.log(`[BankMutation] #${t + 1}: typeLine="${typeLine}" | type=${transactionType} | amount=${amount} | desc="${description}"`);

      results.push({
        amount,
        type: transactionType,
        transaction_number: description,
        transaction_date: txDate,
        payment_method: 'transfer',
        notes: typeLine.trim(),
      });
    }

    return results;
  };

  const looksLikeBankMutation = (ocrText: string) => {
    const normalized = ocrText.toLowerCase();

    return (
      normalized.includes('mutasi') ||
      normalized.includes('rekening') ||
      normalized.includes('e-banking') ||
      normalized.includes('transaksi debit') ||
      normalized.includes('transaksi credit') ||
      normalized.includes('trsf') ||
      /\bidr\s*[\d,.]+\b/i.test(ocrText) && /(?:\bdb\b|\bcr\b|debit|credit)/i.test(ocrText)
    );
  };

  const parseExpenseWithAI = async (ocrText: string): Promise<ParsedImportedTransaction[]> => {
    const prompt = `Extract expense items from the following receipt/invoice text. Return a JSON array of objects with these exact fields:
  - amount (number, required) - the total amount paid
  - category (string, optional) - e.g. "Bahan Baku", "Operasional", "Listrik", "Sewa", "Gaji", "Marketing", "Pemeliharaan", "Lainnya"
  - payment_method (string, optional) - e.g. "cash", "card", "qris", "transfer"
  - notes (string, optional) - any additional description

  Only include items that are clearly expenses (purchases, bills). If the text contains multiple line items, you may combine them into one expense or split if they are separate transactions. Return **only** the JSON array, no explanation or markdown.

  Examples:
  Input: "Toko Maju Jaya\nBeras 5kg - 60.000\nMinyak 2L - 30.000\nTotal 90.000\nCash"
  Output: [{"amount":90000,"category":"Bahan Baku","payment_method":"cash","notes":"Pembelian beras dan minyak"}]

  Input: "PLN bulan Januari 2024\nBiaya listrik 450.000\nTransfer BCA"
  Output: [{"amount":450000,"category":"Listrik","payment_method":"transfer","notes":"Listrik Jan 2024"}]

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
      return Array.isArray(parsed)
        ? parsed.map((item) => ({
            amount: item.amount,
            type: 'expense',
            category: item.category,
            payment_method: item.payment_method,
            notes: item.notes,
          }))
        : [];
    } catch (e) {
      console.error('Invalid AI response:', jsonText);
      return [];
    }
  };

  const pickPreferredImportedTransaction = (
    existing: TempImportedTransaction,
    candidate: TempImportedTransaction
  ) => {
    const existingScore =
      existing.transaction_number.trim().length +
      existing.notes.trim().length +
      (existing.payment_method === 'transfer' ? 1 : 0);
    const candidateScore =
      candidate.transaction_number.trim().length +
      candidate.notes.trim().length +
      (candidate.payment_method === 'transfer' ? 1 : 0);

    return candidateScore > existingScore ? candidate : existing;
  };

  const parseTransactionsWithAI = async (ocrText: string): Promise<ParsedImportedTransaction[]> => {
    const prompt = `Extract financial transactions from the following OCR text. Return a JSON array of objects with these exact fields:
  - amount (number, required)
  - type (string, required) - must be "expense" or "income"
  - transaction_number (string, optional) - for bank mutation statements use the transaction description/reference as the transaction number
  - transaction_date (string, optional) - use YYYY-MM-DD if a date is present
  - category (string, optional) - only for expenses, e.g. "Bahan Baku", "Operasional", "Listrik", "Sewa", "Gaji", "Marketing", "Pemeliharaan", "Lainnya"
  - payment_method (string, optional) - e.g. "cash", "card", "qris", "transfer"
  - notes (string, optional)

  Rules:
  - If the OCR text is a bank mutation / mutasi rekening, classify DB or Debit as "expense", and CR or Credit as "income".
  - For mutasi rekening, set transaction_number from the description/reference text in the mutation.
  - For mutasi rekening, use payment_method "transfer" unless another bank payment method is explicit.
  - If the OCR text is a receipt or invoice, classify it as "expense".
  - Return only clear transactions. Return **only** the JSON array, no explanation or markdown.

  Examples:
  Input: "Toko Maju Jaya\nBeras 5kg - 60.000\nMinyak 2L - 30.000\nTotal 90.000\nCash"
  Output: [{"amount":90000,"type":"expense","transaction_number":"Toko Maju Jaya","transaction_date":"","category":"Bahan Baku","payment_method":"cash","notes":"Pembelian beras dan minyak"}]

  Input: "31 Mar 2026\n3103/FTFVA/WS95271 12208/SHOPEEPAY - - 2279513201\nTRSF E-BANKING DB\nIDR 66,000.00"
  Output: [{"amount":66000,"type":"expense","transaction_number":"3103/FTFVA/WS95271 12208/SHOPEEPAY - - 2279513201","transaction_date":"2026-03-31","category":"Operasional","payment_method":"transfer","notes":"TRSF E-BANKING DB"}]

  Input: "31 Mar 2026\n3103/FTSCY/WS95271 30000.00 ALEXANDER BRYAN HA\nTRSF E-BANKING CR\nIDR 30,000.00"
  Output: [{"amount":30000,"type":"income","transaction_number":"3103/FTSCY/WS95271 30000.00 ALEXANDER BRYAN HA","transaction_date":"2026-03-31","category":"","payment_method":"transfer","notes":"TRSF E-BANKING CR"}]

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

  const handleTransactionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      let allParsedItems: ParsedImportedTransaction[] = [];
      const MAX_CHUNKS = 5;
      const bankMutationMode = looksLikeBankMutation(text);

      if (bankMutationMode) {
        allParsedItems = parseBankMutationTransactions(text);
      } else {
        for (let i = 0; i < Math.min(chunks.length, MAX_CHUNKS); i++) {
          try {
            const parsed = await parseExpenseWithAI(chunks[i]);
            allParsedItems = [...allParsedItems, ...parsed];
          } catch (error) {
            console.error(`Error parsing chunk ${i + 1}:`, error);
          }
        }
      }

      const normalizedTransactions = allParsedItems.map((item, index) => {
        const transactionType = bankMutationMode
          ? (item.type === 'income' || item.type === 'expense' ? item.type : 'expense')
          : normalizeImportedTransactionType(
              [item.type, item.notes, item.transaction_number].filter(Boolean).join(' ')
            );
        const transactionNumber =
          item.transaction_number?.trim() ||
          item.notes?.trim() ||
          `${transactionType === 'expense' ? 'EXP' : 'INC'}-${Date.now().toString().slice(-6)}-${index + 1}`;

        return {
          id: `temp-${Date.now()}-${index}-${Math.random()}`,
          amount: item.amount || 0,
          transaction_type: transactionType,
          transaction_number: transactionNumber,
          transaction_date: normalizeImportedDate(item.transaction_date),
          payment_method: normalizePaymentMethod(
            item.payment_method,
            transactionType,
            [item.notes, item.transaction_number].filter(Boolean).join(' ')
          ),
          expense_category: normalizeExpenseCategory(item.category),
          type_indicator: item.notes || '',
          notes: '',
        };
      });

      const dedupedTransactionMap = new Map<string, TempImportedTransaction>();
      for (const item of normalizedTransactions) {
        const dedupeKey = bankMutationMode
          ? `${item.transaction_type}|${item.transaction_date}|${item.amount}`
          : `${item.transaction_type}|${item.transaction_date}|${item.amount}|${item.transaction_number}`;
        const existing = dedupedTransactionMap.get(dedupeKey);

        if (!existing) {
          dedupedTransactionMap.set(dedupeKey, item);
          continue;
        }

        dedupedTransactionMap.set(dedupeKey, pickPreferredImportedTransaction(existing, item));
      }

      const dedupedTransactions = Array.from(dedupedTransactionMap.values());

      if (dedupedTransactions.length === 0) {
        const blankTransaction: TempImportedTransaction = {
          id: `temp-${Date.now()}-${Math.random()}`,
          amount: 0,
          transaction_type: 'expense',
          transaction_number: '',
          transaction_date: getTodayInputDate(),
          payment_method: 'transfer',
          expense_category: 'operational',
          type_indicator: '',
          notes: '',
        };
        setUnsavedImportedTransactions([blankTransaction]);
      } else {
        setUnsavedImportedTransactions(dedupedTransactions);
      }

      setShowBulkModal(true);
      setActiveImportIndex(0);
    } catch (error: any) {
      console.error(error);
      alert('Gagal memproses gambar: ' + error.message);
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  const saveSingleImportedTransaction = async (item: TempImportedTransaction): Promise<void> => {
    if (!user) throw new Error('User tidak terautentikasi');
    const ownerId = user.user_type === 'staff' ? user.user_id : user.id;
    const prefix = item.transaction_type === 'expense' ? 'EXP' : 'INC';
    const fallbackTransactionNumber = `${prefix}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const transactionNumber = item.transaction_number.trim() || fallbackTransactionNumber;
    const normalizedDate = normalizeImportedDate(item.transaction_date);

    const baseNotes = item.notes.trim();
    const typeIndicator = item.type_indicator.trim();
    const notes = item.transaction_type === 'expense'
      ? `${item.expense_category}: ${typeIndicator ? `[${typeIndicator}] ` : ''}${baseNotes || 'Tidak ada catatan'}`
      : `[OCR_INCOME] ${typeIndicator ? `[${typeIndicator}] ` : ''}${baseNotes || 'Pemasukan dari mutasi rekening'}`;

    const persistedType: PersistedTransactionType = item.transaction_type === 'income' ? 'sale' : 'expense';

    const transactionData = {
      user_id: ownerId,
      transaction_number: transactionNumber,
      type: persistedType,
      amount: item.amount,
      payment_method: item.payment_method,
      status: 'completed',
      notes,
      created_at: new Date(`${normalizedDate}T12:00:00Z`).toISOString(),
    };

    const { error } = await supabase
      .from('transactions')
      .insert(transactionData);

    if (error) throw error;
  };

  const handleBulkSaveImportedTransactions = async () => {
    try {
      for (const transaction of unsavedImportedTransactions) {
        await saveSingleImportedTransaction(transaction);
      }
      setShowBulkModal(false);
      setUnsavedImportedTransactions([]);
      fetchTransactions();
      alert('Semua transaksi hasil OCR berhasil ditambahkan');
    } catch (error) {
      console.error('Error saving imported transactions:', error);
      alert('Gagal menyimpan beberapa transaksi. Silakan coba lagi.');
    }
  };

  const fetchTransactions = async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      const ownerId = user.user_type === 'staff' ? user.user_id : user.id;

      // SECURITY: Only fetch transactions for the current logged-in user
      // RLS policy also enforces this at database level
      let query = supabase
        .from('transactions')
        .select(`
          *,
          orders(
            order_number,
            customer_name
          )
        `)
        .eq('user_id', ownerId);

      // Apply date filter
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query = query.gte('created_at', start.toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }

      // Apply payment method filter
      if (paymentMethod !== 'all') {
        query = query.eq('payment_method', paymentMethod);
      }

      // Apply transaction type filter
      if (transactionType !== 'all') {
        query = query.eq('type', transactionType);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (!error && data) {
        const formattedTransactions = data.map((transaction: any) => ({
          ...transaction,
          order_number: transaction.orders?.order_number,
          customer_name: transaction.orders?.customer_name,
        }));

        setTransactions(formattedTransactions);

        // Calculate summary
        const sales = formattedTransactions.filter(t => t.type === 'sale');
        const refunds = formattedTransactions.filter(t => t.type === 'refund');
        const expenses = formattedTransactions.filter(t => t.type === 'expense');

        const totalSales = sales.reduce((sum, t) => sum + t.amount, 0);
        const totalRefunds = refunds.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

        setSummary({
          totalSales,
          totalRefunds,
          totalExpenses,
          netIncome: totalSales - totalRefunds - totalExpenses,
          totalTransactions: formattedTransactions.length,
        });
      } else {
        console.error('Error fetching transactions:', error);
      }
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaidOrders = async () => {
    if (!user?.id) return;

    try {
      const ownerId = user.user_type === 'staff' ? user.user_id : user.id;

      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, total_amount, payment_status')
        .eq('user_id', ownerId)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const openModal = (type: 'expense' | 'refund') => {
    setModalType(type);
    setFormData({
      amount: '',
      payment_method: 'cash',
      notes: '',
      order_id: '',
      refund_reason: '',
      expense_category: 'operational',
    });
    setModalError('');
    setShowModal(true);
  };

  const handleSubmitExpenseRefund = async () => {
    if (!user?.id) return;

    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setModalError('Jumlah harus lebih dari 0');
      return;
    }

    if (modalType === 'refund' && !formData.order_id) {
      setModalError('Pilih order untuk refund');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const ownerId = user.user_type === 'staff' ? user.user_id : user.id;
      const transactionNumber = `${modalType === 'expense' ? 'EXP' : 'REF'}-${Date.now().toString().slice(-6)}`;

      const transactionData: any = {
        user_id: ownerId,
        transaction_number: transactionNumber,
        type: modalType,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        status: 'completed',
        notes: modalType === 'expense'
          ? `${formData.expense_category}: ${formData.notes || 'Tidak ada catatan'}`
          : `Refund: ${formData.refund_reason || 'Tidak ada alasan'}`,
      };

      // For refund, link to order
      if (modalType === 'refund' && formData.order_id) {
        // Verify the order belongs to current user
        const { data: orderCheck, error: orderCheckError } = await supabase
          .from('orders')
          .select('id')
          .eq('id', formData.order_id)
          .eq('user_id', user.id)
          .single();
        
        if (orderCheckError || !orderCheck) {
          setModalError('Order tidak ditemukan atau bukan milik Anda');
          setModalLoading(false);
          return;
        }
        
        transactionData.order_id = formData.order_id;

        // Update order payment status to refunded
        await supabase
          .from('orders')
          .update({ payment_status: 'refunded' })
          .eq('id', formData.order_id)
          .eq('user_id', ownerId);
      }

      const { error } = await supabase
        .from('transactions')
        .insert(transactionData);

      if (error) throw error;

      // Close modal and refresh data
      setShowModal(false);
      setShowSuccessAnim(true);
      setTimeout(() => setShowSuccessAnim(false), 1300);
      fetchTransactions();

      // Reset form
      setFormData({
        amount: '',
        payment_method: 'cash',
        notes: '',
        order_id: '',
        refund_reason: '',
        expense_category: 'operational',
      });

    } catch (error: any) {
      console.error('Error adding transaction:', error);
      setModalError(error.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setModalLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'No. Transaksi',
      'Tanggal',
      'Tipe',
      'Jumlah',
      'Metode Pembayaran',
      'Status',
      'No. Order',
      'Customer',
      'Catatan',
    ];

    const csvData = transactions.map(transaction => [
      transaction.transaction_number,
      new Date(transaction.created_at).toLocaleDateString('id-ID'),
      getDisplayTransactionType(transaction) === 'sale'
        ? 'Penjualan'
        : getDisplayTransactionType(transaction) === 'income'
          ? 'Pemasukan'
          : getDisplayTransactionType(transaction) === 'refund'
            ? 'Refund'
            : 'Pengeluaran',
      transaction.amount,
      transaction.payment_method === 'cash' ? 'Cash' :
        transaction.payment_method === 'card' ? 'Card' :
          transaction.payment_method === 'qris' ? 'QRIS' : 'Transfer',
      transaction.status === 'completed' ? 'Selesai' : 'Pending',
      transaction.order_number || '-',
      transaction.customer_name || '-',
      transaction.notes || '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaksi-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-green-100 text-green-800';
      case 'income': return 'bg-blue-100 text-blue-800';
      case 'refund': return 'bg-red-100 text-red-800';
      case 'expense': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: 'sale' | 'refund' | 'expense' | 'income') => {
    switch (type) {
      case 'sale':
        return 'Penjualan';
      case 'income':
        return 'Pemasukan';
      case 'refund':
        return 'Refund';
      case 'expense':
        return 'Pengeluaran';
      default:
        return type;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return '💵';
      case 'card': return '💳';
      case 'qris': return '📱';
      case 'transfer': return '🏦';
      default: return '💰';
    }
  };

  const openTransactionDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  // Tampilkan loading jika auth masih loading
  if (authLoading || loading) {
    return (
      <div className="py-4 sm:py-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data transaksi...</p>
        </div>
      </div>
    );
  }

  // Tampilkan pesan jika tidak ada user (belum login)
  if (!user) {
    return (
      <div className="py-4 sm:py-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Anda belum login</h2>
          <p className="text-gray-600">Silakan login untuk melihat laporan transaksi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-6">
      <AnimatePresence>
        {showSuccessAnim && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
          >
            {/* Customize finance success animation here. */}
            <motion.div
              initial={{ scale: 0.72, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="h-24 w-24 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-2xl"
            >
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                <motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Laporan Transaksi</h1>
        <p className="mt-2 text-gray-600">Pantau semua transaksi keuangan restoran Anda</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pemasukan</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                <CountUpValue value={summary.totalSales} />
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {transactions.filter(t => getDisplayTransactionType(t) === 'sale' || getDisplayTransactionType(t) === 'income').length} transaksi
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Refund</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                <CountUpValue value={summary.totalRefunds} />
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">↩️</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {transactions.filter(t => t.type === 'refund').length} transaksi
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                <CountUpValue value={summary.totalExpenses} />
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💸</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {transactions.filter(t => t.type === 'expense').length} transaksi
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendapatan Bersih</p>
              <p className={`text-2xl font-bold mt-2 ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                <CountUpValue value={summary.netIncome} />
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${summary.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
              <span className="text-2xl">{summary.netIncome >= 0 ? '💰' : '📉'}</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {summary.totalTransactions} total transaksi
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4 sm:mb-0">
            <FunnelIcon className="w-5 h-5 mr-2" />
            Filter Laporan
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => openModal('expense')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
              >
                <BanknotesIcon className="w-5 h-5 mr-2" />
                Tambah Pengeluaran
              </button>
              <button
                onClick={() => openModal('refund')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center"
              >
                <ReceiptRefundIcon className="w-5 h-5 mr-2" />
                Tambah Refund
              </button>
              {/* New upload button */}
              <button
                onClick={() => document.getElementById('expense-image-upload')?.click()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                disabled={uploadLoading}
              >
                <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
                {uploadLoading ? 'Memproses...' : 'Upload Nota / Mutasi'}
              </button>
              <input
                id="expense-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleTransactionImageUpload}
              />
            </div>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center"
            >
              <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => {
              setStartDate(new Date());
              setEndDate(new Date());
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
          >
            Hari Ini
          </button>
          <button
            onClick={() => {
              const date = new Date();
              date.setDate(date.getDate() - 7);
              setStartDate(date);
              setEndDate(new Date());
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
          >
            7 Hari
          </button>
          <button
            onClick={() => {
              const date = new Date();
              date.setDate(date.getDate() - 30);
              setStartDate(date);
              setEndDate(new Date());
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
          >
            30 Hari
          </button>
          <button
            onClick={() => {
              const date = new Date();
              date.setMonth(date.getMonth() - 1);
              date.setDate(1);
              setStartDate(date);
              const endOfMonth = new Date();
              endOfMonth.setMonth(endOfMonth.getMonth() - 1);
              endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
              setEndDate(endOfMonth);
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
          >
            Bulan Lalu
          </button>
          <button
            onClick={() => {
              const date = new Date();
              date.setDate(1);
              setStartDate(date);
              setEndDate(new Date());
            }}
            className="px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 rounded-full text-primary font-medium"
          >
            Bulan Ini
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Mulai
            </label>
            <div className="relative">
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                dateFormat="dd/MM/yyyy"
              />
              <CalendarIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Akhir
            </label>
            <div className="relative">
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                dateFormat="dd/MM/yyyy"
              />
              <CalendarIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipe Transaksi
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
            >
              <option value="all">Semua Tipe</option>
              <option value="sale">Penjualan / Pemasukan</option>
              <option value="refund">Refund</option>
              <option value="expense">Pengeluaran</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metode Pembayaran
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
            >
              <option value="all">Semua Metode</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="qris">QRIS</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No. Transaksi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe & Metode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
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
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-primary/5 transition-colors duration-75">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {transaction.transaction_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(transaction.created_at).toLocaleDateString('id-ID')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(transaction.created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full mr-2 ${getTypeColor(transaction.type)}`}>
                        {getTypeLabel(getDisplayTransactionType(transaction))}
                      </span>
                      <span className="text-lg">
                        {getPaymentMethodIcon(transaction.payment_method)}
                      </span>
                      <span className="ml-2 text-sm text-gray-600 capitalize">
                        {transaction.payment_method}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${getDisplayTransactionType(transaction) === 'sale'
                      ? 'text-green-600'
                      : getDisplayTransactionType(transaction) === 'income'
                        ? 'text-blue-600'
                        : getDisplayTransactionType(transaction) === 'refund'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}>
                      {getDisplayTransactionType(transaction) === 'sale' || getDisplayTransactionType(transaction) === 'income' ? '+' : '-'}
                      Rp {transaction.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.order_number ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.order_number}
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.customer_name || '-'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${transaction.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {transaction.status === 'completed' ? 'Selesai' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openTransactionDetail(transaction)}
                      className="text-primary hover:text-primary flex items-center"
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      Lihat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900">Tidak ada transaksi</h3>
            <p className="mt-2 text-gray-600">
              Tidak ditemukan transaksi dengan filter yang dipilih
            </p>
            <div className="mt-6 flex gap-4 justify-center">
              <button
                onClick={() => openModal('expense')}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center"
              >
                <BanknotesIcon className="w-5 h-5 mr-2" />
                Tambah Pengeluaran Pertama
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expense/Refund Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                {modalType === 'expense' ? (
                  <>
                    <BanknotesIcon className="w-6 h-6 mr-3 text-red-600" />
                    Tambah Pengeluaran
                  </>
                ) : (
                  <>
                    <ReceiptRefundIcon className="w-6 h-6 mr-3 text-yellow-600" />
                    Tambah Refund
                  </>
                )}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modalError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {modalError}
              </div>
            )}

            <div className="space-y-6">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah (Rp) *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                  placeholder="Masukkan jumlah"
                  min="1"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metode Pembayaran *
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="qris">QRIS</option>
                  <option value="transfer">Transfer Bank</option>
                </select>
              </div>

              {/* Refund: Order Selection */}
              {modalType === 'refund' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Order untuk Refund *
                  </label>
                  <select
                    value={formData.order_id}
                    onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                    required
                  >
                    <option value="">Pilih order...</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.order_number} - {order.customer_name} (Rp {order.total_amount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                  {orders.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500">Tidak ada order yang sudah dibayar untuk direfund</p>
                  )}
                </div>
              )}

              {/* Expense: Category */}
              {modalType === 'expense' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori Pengeluaran
                  </label>
                  <select
                    value={formData.expense_category}
                    onChange={(e) => setFormData({ ...formData, expense_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="operational">Operasional</option>
                    <option value="ingredients">Bahan Baku</option>
                    <option value="utilities">Listrik/Air/Internet</option>
                    <option value="salary">Gaji Karyawan</option>
                    <option value="rent">Sewa Tempat</option>
                    <option value="marketing">Marketing</option>
                    <option value="maintenance">Pemeliharaan</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
              )}

              {/* Refund: Reason */}
              {modalType === 'refund' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alasan Refund
                  </label>
                  <input
                    type="text"
                    value={formData.refund_reason}
                    onChange={(e) => setFormData({ ...formData, refund_reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                    placeholder="Contoh: Pesanan salah, Pelanggan tidak puas, dll."
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {modalType === 'expense' ? 'Keterangan Pengeluaran' : 'Catatan Tambahan'}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary/30 focus:border-primary"
                  rows={3}
                  placeholder={modalType === 'expense'
                    ? 'Contoh: Beli bahan baku bulanan, Bayar listrik Januari, dll.'
                    : 'Catatan tambahan untuk transaksi ini...'}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                disabled={modalLoading}
              >
                Batal
              </button>
              <button
                onClick={handleSubmitExpenseRefund}
                disabled={modalLoading}
                className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 flex items-center"
              >
                {modalLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-5 h-5 mr-2" />
                    {modalType === 'expense' ? 'Simpan Pengeluaran' : 'Simpan Refund'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {showBulkModal && (
        <BulkImportedTransactionsModal
          items={unsavedImportedTransactions}
          setItems={setUnsavedImportedTransactions}
          activeIndex={activeImportIndex}
          setActiveIndex={setActiveImportIndex}
          onClose={() => setShowBulkModal(false)}
          onSave={handleBulkSaveImportedTransactions}
        />
      )}

      {/* Transaction Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">Detail Transaksi</h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTransaction(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">No. Transaksi</span>
                <span className="font-semibold text-gray-900 text-right">{selectedTransaction.transaction_number}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Tipe</span>
                <span className="font-medium text-gray-900">{getTypeLabel(getDisplayTransactionType(selectedTransaction))}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Jumlah</span>
                <span className="font-semibold text-gray-900">Rp {selectedTransaction.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Metode Bayar</span>
                <span className="font-medium text-gray-900 capitalize">{selectedTransaction.payment_method}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Tanggal</span>
                <span className="font-medium text-gray-900">
                  {new Date(selectedTransaction.created_at).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-gray-500 mb-1">Catatan</p>
                <p className="text-gray-900">{selectedTransaction.notes || 'Tidak ada catatan'}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTransaction(null);
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}