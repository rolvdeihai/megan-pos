// src/app/api/send-invoice/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, orderNumber, customerName, totalAmount, items, invoiceHtml } = await request.json();

    const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_EMAIL_URL;
    if (!GAS_URL) {
      return NextResponse.json({ success: false, error: 'Email service not configured' }, { status: 500 });
    }

    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'invoice',
        email,
        orderNumber,
        customerName,
        totalAmount,
        items,
        invoiceHtml,
      }),
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}