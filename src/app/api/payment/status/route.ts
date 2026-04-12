import { NextRequest, NextResponse } from 'next/server';
import Midtrans from 'midtrans-client';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || '';
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

let _coreApi: InstanceType<typeof Midtrans.CoreApi> | null = null;

function getCoreApi() {
  if (!_coreApi) {
    _coreApi = new Midtrans.CoreApi({
      isProduction: MIDTRANS_IS_PRODUCTION,
      serverKey: MIDTRANS_SERVER_KEY,
      clientKey: MIDTRANS_CLIENT_KEY,
    });
  }
  return _coreApi;
}

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  try {
    const coreApi = getCoreApi();
    const status = await coreApi.transaction.status(orderId);

    const result: Record<string, any> = {
      order_id: status.order_id,
      transaction_status: status.transaction_status,
      payment_type: status.payment_type,
      gross_amount: status.gross_amount,
    };

    if (status.va_numbers?.length) {
      result.va_number = status.va_numbers[0].va_number;
      result.bank = status.va_numbers[0].bank;
    }

    if (status.permata_va_number) {
      result.va_number = status.permata_va_number;
      result.bank = 'permata';
    }

    if (status.bill_key && status.biller_code) {
      result.bill_key = status.bill_key;
      result.biller_code = status.biller_code;
      result.bank = 'mandiri';
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[payment/status] Midtrans API error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction status' },
      { status: 500 }
    );
  }
}
