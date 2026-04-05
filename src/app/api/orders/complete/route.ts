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
    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('order_id', orderId)
      .eq('type', 'sale')
      .maybeSingle();

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

    // --- DUPLICATE HANDLING ---
    if (existingTx) {
      // If order is already completed, nothing to do
      if (order.status === 'completed') {
        return NextResponse.json({
          success: true,
          message: 'Order sudah selesai',
          duplicate: true,
          shouldProcessInventory: false,
        });
      }

      // Order is pending but transaction exists – complete the order
      console.log('Transaction exists but order pending – completing order');

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          payment_status: 'paid',
          payment_method: paymentMethod || order.payment_method || 'cash',
        })
        .eq('id', orderId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      if (order.table_id) {
        await supabaseAdmin
          .from('restaurant_tables')
          .update({ is_available: true })
          .eq('id', order.table_id);
      }

      return NextResponse.json({
        success: true,
        message: 'Order telah diselesaikan (transaksi sudah ada)',
        duplicate: true,
        shouldProcessInventory: true, // client must process inventory (stock + expenses)
      });
    }

    // --- NO EXISTING TRANSACTION – NORMAL FLOW ---
    // Update order status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        payment_status: 'paid',
        payment_method: paymentMethod || order.payment_method || 'cash',
      })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Free the table
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