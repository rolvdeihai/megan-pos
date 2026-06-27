// lib/printService.ts
import { Capacitor } from '@capacitor/core';

// Plugin hanya di-import jika Android
let CapacitorThermalPrinter: any = null;
if (Capacitor.getPlatform() === 'android') {
  // Dynamic import untuk menghindari error di iOS
  import('capacitor-thermal-printer').then((mod) => {
    CapacitorThermalPrinter = mod.CapacitorThermalPrinter;
  });
}

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

export interface PrintOrderData {
  orderNumber: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  customerName?: string;
  restaurantName: string;
}

export class PrintService {
  private static instance: PrintService;
  private connectedDevice: any = null;

  static getInstance(): PrintService {
    if (!PrintService.instance) {
      PrintService.instance = new PrintService();
    }
    return PrintService.instance;
  }

  // ==================== ANDROID (Bluetooth) ====================
  async scanPrinters(): Promise<any[]> {
    if (platform !== 'android') {
      throw new Error('Scan hanya tersedia di Android');
    }
    if (!CapacitorThermalPrinter) {
      throw new Error('Plugin Bluetooth belum dimuat');
    }

    return new Promise((resolve, reject) => {
      const devices: any[] = [];
      CapacitorThermalPrinter.addListener('discoverDevices', (data: any) => {
        devices.push(...data.devices);
      });

      CapacitorThermalPrinter.startScan({ duration: 10 })
        .then(() => resolve(devices))
        .catch((error: any) => reject(error));
    });
  }

  async connect(address: string): Promise<void> {
    if (platform !== 'android') {
      throw new Error('Koneksi Bluetooth hanya di Android');
    }
    if (!CapacitorThermalPrinter) {
      throw new Error('Plugin Bluetooth belum dimuat');
    }
    try {
      this.connectedDevice = await CapacitorThermalPrinter.connect({ address });
    } catch (error) {
      console.error('Gagal konek:', error);
      throw error;
    }
  }

  async printBluetooth(data: PrintOrderData): Promise<void> {
    if (platform !== 'android') {
      throw new Error('Print Bluetooth hanya di Android');
    }
    if (!this.connectedDevice) {
      throw new Error('Printer belum terhubung');
    }
    if (!CapacitorThermalPrinter) {
      throw new Error('Plugin Bluetooth belum dimuat');
    }

    try {
      const printer = CapacitorThermalPrinter.begin();
      printer
        .align('center')
        .bold()
        .text(`${data.restaurantName}\n`)
        .clearFormatting()
        .text('='.repeat(32) + '\n')
        .text(`No. Order: ${data.orderNumber}\n`)
        .text(`Tanggal: ${new Date().toLocaleString()}\n`)
        .text('-'.repeat(32) + '\n')
        .align('left');

      data.items.forEach((item) => {
        const name = item.name.length > 20 ? item.name.slice(0, 20) : item.name;
        printer.text(`${name}\n`);
        printer.text(`  ${item.quantity} x Rp ${item.price.toLocaleString()}\n`);
      });

      printer
        .text('-'.repeat(32) + '\n')
        .align('right')
        .bold()
        .text(`TOTAL: Rp ${data.total.toLocaleString()}\n`)
        .clearFormatting()
        .text('\n'.repeat(3))
        .align('center')
        .text('Terima kasih\n')
        .cutPaper();

      await printer.write();
    } catch (error) {
      console.error('Gagal cetak Bluetooth:', error);
      throw error;
    }
  }

  // ==================== iOS (AirPrint) ====================
  // AirPrint menggunakan fitur bawaan iOS: window.print() dengan formatting khusus
  // Kita akan generate HTML yang dioptimalkan untuk AirPrint
  async printAirPrint(data: PrintOrderData): Promise<void> {
    if (platform !== 'ios') {
      throw new Error('AirPrint hanya tersedia di iOS');
    }

    // Buat konten HTML untuk dicetak dengan format struk 58mm
    const receiptHtml = this.generateReceiptHTML(data);
    
    // Buka window baru dengan konten, lalu panggil print
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      throw new Error('Pop-up diblokir. Izinkan pop-up untuk mencetak.');
    }

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  private generateReceiptHTML(data: PrintOrderData): string {
    const itemsRows = data.items.map((item) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">Rp ${item.price.toLocaleString()}</td>
        <td style="text-align:right">Rp ${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Struk ${data.orderNumber}</title>
        <style>
          /* Gaya khusus untuk AirPrint (struk 58mm) */
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 58mm;
            margin: 0 auto;
            padding: 8px;
            background: white;
            color: black;
          }
          .header {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
          }
          .divider {
            border-top: 1px dashed #333;
            margin: 8px 0;
          }
          table {
            width: 100%;
            font-size: 12px;
          }
          td {
            padding: 2px 0;
          }
          .total {
            font-weight: bold;
            font-size: 14px;
          }
          .footer {
            text-align: center;
            margin-top: 12px;
            font-size: 11px;
          }
          @media print {
            body { margin: 0; padding: 4px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">${data.restaurantName}</div>
        <div class="divider"></div>
        <div>No. Order: ${data.orderNumber}</div>
        <div>Tanggal: ${new Date().toLocaleString()}</div>
        ${data.customerName ? `<div>Customer: ${data.customerName}</div>` : ''}
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Harga</th>
              <th style="text-align:right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div class="divider"></div>
        <div style="text-align:right;font-weight:bold;font-size:14px;">
          TOTAL: Rp ${data.total.toLocaleString()}
        </div>
        <div class="divider"></div>
        <div class="footer">Terima kasih telah berbelanja</div>
        <div style="text-align:center;font-size:10px;margin-top:8px;">
          Dicetak via AirPrint
        </div>
      </body>
      </html>
    `;
  }

  // Method umum untuk memilih metode cetak berdasarkan platform
  async print(data: PrintOrderData): Promise<void> {
    if (platform === 'android') {
      // Pastikan sudah connect, jika belum lempar error
      if (!this.connectedDevice) {
        throw new Error('Belum terhubung ke printer Bluetooth. Lakukan scan dan connect terlebih dahulu.');
      }
      await this.printBluetooth(data);
    } else if (platform === 'ios') {
      await this.printAirPrint(data);
    } else {
      // Web fallback
      window.print();
    }
  }
}

export const printService = PrintService.getInstance();