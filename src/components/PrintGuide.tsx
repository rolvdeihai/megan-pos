'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PrintGuideProps {
  onClose: () => void;
}

export default function PrintGuide({ onClose }: PrintGuideProps) {
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
    else if (/android/.test(ua)) setPlatform('android');
    else if (/windows/.test(ua)) setPlatform('windows');
    else if (/macintosh/.test(ua)) setPlatform('macos');
    else setPlatform('other');
  }, []);

  const renderGuide = () => {
    switch (platform) {
      case 'windows':
      case 'macos':
        return (
          <div className="space-y-4 text-gray-700">
            <h3 className="text-lg font-bold">🖨️ Cara Cetak di Windows/macOS</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Download dan install <a href="https://qz.io/download" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">QZ Tray</a></li>
              <li>Install driver printer thermal (biasanya driver POS58)</li>
              <li>Hubungkan printer via USB dan nyalakan</li>
              <li>Jalankan QZ Tray (ada ikon di system tray)</li>
              <li>Klik <strong>"Detect Printers"</strong> di aplikasi</li>
              <li>Pilih printer dari dropdown</li>
              <li>Upload certificate jika diperlukan (klik tombol <strong>"Cert"</strong>)</li>
              <li>Klik <strong>"Cetak"</strong> – struk langsung keluar</li>
            </ol>
            <div className="bg-yellow-50 p-3 rounded text-sm">
              ⚠️ Pastikan QZ Tray berjalan sebelum mencetak
            </div>
          </div>
        );
      case 'android':
        return (
          <div className="space-y-4 text-gray-700">
            <h3 className="text-lg font-bold">📱 Cara Cetak di Android</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Nyalakan Bluetooth HP dan printer thermal</li>
              <li>Klik <strong>"Scan Printer"</strong> di aplikasi</li>
              <li>Pilih printer dari daftar</li>
              <li>Klik <strong>"Cetak Bluetooth"</strong> – struk langsung keluar</li>
            </ol>
            <div className="bg-green-50 p-3 rounded text-sm">
              ✅ Tidak perlu driver tambahan, cukup Bluetooth
            </div>
          </div>
        );
      case 'ios':
        return (
          <div className="space-y-4 text-gray-700">
            <h3 className="text-lg font-bold">📱 Cara Cetak di iOS (iPhone/iPad)</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Printer harus mendukung <strong>AirPrint</strong> (biasanya printer WiFi)</li>
              <li>Pastikan HP dan printer dalam satu jaringan WiFi</li>
              <li>Klik tombol <strong>"Cetak AirPrint"</strong> (berwarna oranye)</li>
              <li>Pilih printer AirPrint dari daftar</li>
              <li>Klik <strong>"Print"</strong> – struk akan keluar</li>
            </ol>
            <div className="bg-yellow-50 p-3 rounded text-sm">
              ⚠️ Jika printer tidak support AirPrint, gunakan tombol <strong>"HTML"</strong> (fallback)
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-4 text-gray-700">
            <h3 className="text-lg font-bold">🖨️ Panduan Cetak</h3>
            <p className="text-sm">Deteksi platform gagal. Silakan coba:</p>
            <ul className="list-disc list-inside text-sm">
              <li>Untuk Windows/macOS: install <a href="https://qz.io/download" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">QZ Tray</a> dan driver printer</li>
              <li>Untuk Android: nyalakan Bluetooth dan scan printer</li>
              <li>Untuk iOS: gunakan AirPrint atau tombol HTML fallback</li>
            </ul>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900">📖 Panduan Cetak</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        {renderGuide()}
        <div className="mt-6 flex justify-end items-center">
          <button
            onClick={() => {
              localStorage.setItem('print_guide_dismissed', 'true');
              onClose();
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Jangan tampilkan lagi
          </button>
          <button
            onClick={onClose}
            className="ml-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}