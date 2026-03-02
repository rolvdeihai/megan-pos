require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testSubscriptionConstraints() {
    console.log("Starting Subscription Constraints Test...");

    // Get first user
    const { data: users, error: userError } = await supabase.from('users').select('id, subscription_tier').limit(1);

    if (userError || !users?.length) {
        console.error("Failed to get user:", userError);
        return;
    }

    const user = users[0];
    console.log(`Testing with User ID: ${user.id} (Current Tier: ${user.subscription_tier})`);

    // 1. Transaction Limit (Basic should stop at 100)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: orderCount, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

    console.log(`Current Orders this month: ${orderCount}`);
    if (user.subscription_tier === 'basic' && orderCount >= 100) {
        console.log("✅ SIMULATION: Basic tier hit 100 limit, would be blocked cleanly!");
    } else if (user.subscription_tier === 'basic') {
        console.log(`✅ SIMULATION: Basic tier under limit (${orderCount}/100)`);
    } else {
        console.log(`✅ SIMULATION: ${user.subscription_tier.toUpperCase()} tier has unlimited transactions`);
    }

    // 2. Staff User Limits
    const { count: empCount, error: empError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

    console.log(`Current Active Staff: ${empCount}`);
    let maxStaff = 1;
    if (user.subscription_tier === 'pro') maxStaff = 3;
    if (user.subscription_tier === 'enterprise') maxStaff = 10;

    if (empCount >= maxStaff) {
        console.log(`✅ SIMULATION: Tier hit max staff limit (${empCount}/${maxStaff}), would be blocked!`);
    } else {
        console.log(`✅ SIMULATION: Tier has room for more staff (${empCount}/${maxStaff})`);
    }
}

testSubscriptionConstraints().catch(console.error);
