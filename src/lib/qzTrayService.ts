// src/lib/qzTrayService.ts
import qz from "qz-tray";
import { CERTIFICATE as DEFAULT_CERTIFICATE } from "./qzTrayConfig";

let connected = false;

// Fungsi untuk mendapatkan certificate dari localStorage atau default
function getCertificate(): string {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('qz_certificate');
        if (stored) return stored;
    }
    return DEFAULT_CERTIFICATE;
}

async function setupQZTray() {
    if (connected) return;

    const cert = getCertificate();
    qz.security.setCertificatePromise((resolve) => {
        resolve(cert);
    });

    qz.security.setSignatureAlgorithm("SHA512");

    try {
        await qz.websocket.disconnect();
    } catch {}

    await qz.websocket.connect();

    connected = true;
}

// Ekspor fungsi untuk memaksa reconnect dengan certificate baru
export async function reloadQZTrayWithNewCertificate() {
    try {
        await qz.websocket.disconnect();
    } catch {}
    connected = false;
    await setupQZTray();
}

export async function getAvailablePrinters(): Promise<string[]> {
    await setupQZTray();

    const printers = await qz.printers.find();

    if (!printers) return [];

    return Array.isArray(printers) ? printers : [printers];
}

export async function printReceiptWithQZ(
    orderDetails: any,
    printerName?: string
) {
    await setupQZTray();

    const printers = await getAvailablePrinters();

    if (printers.length === 0) {
        throw new Error("Printer tidak ditemukan");
    }

    const selectedPrinter =
        printerName && printers.includes(printerName)
            ? printerName
            : printers[0];

    console.log("Printing to", selectedPrinter);

    const config = qz.configs.create(selectedPrinter, {
        encoding: "CP437",
    });

    const receipt = buildReceipt(orderDetails);

    await qz.print(config, [
        {
            type: "raw",
            format: "command",
            flavor: "plain",
            data: receipt,
        },
    ]);
}

function buildReceipt(order: any): string {
    const WIDTH = 32;

    const ESC_INIT = "\x1B\x40";
    const ESC_ALIGN_CENTER = "\x1B\x61\x01";
    const ESC_ALIGN_LEFT = "\x1B\x61\x00";
    const ESC_BOLD_ON = "\x1B\x45\x01";
    const ESC_BOLD_OFF = "\x1B\x45\x00";
    const CUT = "\x1D\x56\x00";

    const hr = "=".repeat(WIDTH);
    const line = "-".repeat(WIDTH);

    const center = (text: string) => {
        if (text.length >= WIDTH) return text;
        const left = Math.floor((WIDTH - text.length) / 2);
        return " ".repeat(left) + text;
    };

    const money = (v: number) => v.toLocaleString("id-ID");

    const lr = (left: string, right: string) => {
        const space = WIDTH - left.length - right.length;
        if (space <= 1) return left + " " + right;
        return left + " ".repeat(space) + right;
    };

    const itemLine = (name: string, qty: number, total: number) => {
        if (name.length > 18) name = name.substring(0, 18);
        return name.padEnd(18) + qty.toString().padStart(3) + money(total).padStart(11);
    };

    const date = new Date(order.created_at ?? new Date());

    let text = "";

    text += ESC_INIT;

    text += ESC_ALIGN_CENTER;
    text += ESC_BOLD_ON;
    text += center(order.restaurantName ?? "JetNote POS");
    text += "\r\n";

    text += ESC_BOLD_OFF;
    text += center("INVOICE");
    text += "\r\n";

    text += center(order.orderNumber ?? "-");
    text += "\r\n";

    text += center(date.toLocaleString("id-ID"));
    text += "\r\n";

    text += ESC_ALIGN_LEFT;

    text += hr + "\r\n";

    text += `Order : ${order.orderNumber ?? "-"}\r\n`;
    text += `Tipe  : ${order.orderType ?? "-"}\r\n`;

    if (order.tableNumber) {
        text += `Meja  : ${order.tableNumber}\r\n`;
    }

    text += `Cust  : ${order.customerName ?? "-"}\r\n`;

    text += line + "\r\n";

    text += "ITEM               QTY     TOTAL\r\n";

    text += line + "\r\n";

    for (const item of order.items ?? []) {
        text += itemLine(item.name, item.quantity, item.total_price);
        text += "\r\n";
    }

    text += line + "\r\n";

    text += lr("Subtotal", money(order.subtotal ?? 0)) + "\r\n";

    if ((order.discountAmount ?? 0) > 0) {
        text += lr("Diskon", "-" + money(order.discountAmount)) + "\r\n";
    }

    text += lr("Pajak", money(order.taxAmount ?? 0)) + "\r\n";

    if ((order.serviceChargeAmount ?? 0) > 0) {
        text += lr("Service", money(order.serviceChargeAmount)) + "\r\n";
    }

    if ((order.deliveryFee ?? 0) > 0) {
        text += lr("Delivery", money(order.deliveryFee)) + "\r\n";
    }

    text += hr + "\r\n";

    text += ESC_BOLD_ON;
    text += lr("TOTAL", money(order.totalAmount ?? 0)) + "\r\n";
    text += ESC_BOLD_OFF;

    text += hr + "\r\n";

    if (order.notes) {
        text += order.notes + "\r\n";
    }

    text += "\r\n";

    text += ESC_ALIGN_CENTER;
    text += "Terima kasih\r\n";
    text += "Sampai jumpa lagi!\r\n";

    text += "\r\n";
    text += "\r\n";
    text += "\r\n";

    text += CUT;

    return text;
}