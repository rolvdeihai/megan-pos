import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { orderId, paymentMethod, userId } = await request.json();

    if (!orderId || !userId) {
      return NextResponse.json(
        { error: 'Order ID dan User ID diperlukan' },
        { status: 400 }
      );
    }

    // Check if transaction already exists
    const { data: existingTx, error: checkError } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({
        success: true,
        message: 'Transaksi sudah ada',
        duplicate: true,
      });
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order tidak ditemukan' },
        { status: 404 }
      );
    }

    // Update order status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        payment_status: 'paid',
      })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Create transaction record
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        order_id: orderId,
        transaction_number: `TRX-${Date.now().toString().slice(-6)}`,
        type: 'sale',
        amount: order.total_amount || 0,
        payment_method: paymentMethod || 'cash',
        status: 'completed',
        notes: `Pembayaran untuk order ${order.order_number}`,
      });

    if (transactionError) {
      // Handle unique constraint violation (duplicate transaction)
      if (transactionError.code === '23505') {
        return NextResponse.json({
          success: true,
          message: 'Transaksi sudah ada',
          duplicate: true,
        });
      }
      return NextResponse.json(
        { error: transactionError.message },
        { status: 500 }
      );
    }

    // Free the table if dine-in
    if (order.table_id) {
      await supabaseAdmin
        .from('restaurant_tables')
        .update({ is_available: true })
        .eq('id', order.table_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Order berhasil diselesaikan',
    });

  } catch (error: any) {
    console.error('Complete order error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}
