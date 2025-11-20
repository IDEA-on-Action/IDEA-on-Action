const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env and .env.local manually
['.env', '.env.local'].forEach(file => {
    const envPath = path.resolve(__dirname, '../../', file);
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
                process.env[key] = value;
            }
        });
    }
});

async function checkIntegration() {
    // Use local Supabase by default, or override with USE_PRODUCTION=true
    const useProduction = process.env.USE_PRODUCTION === 'true';

    const supabaseUrl = useProduction
        ? process.env.VITE_SUPABASE_URL
        : 'http://localhost:54321';

    const supabaseKey = useProduction
        ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)
        : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

    console.log(`\nUsing ${useProduction ? 'PRODUCTION' : 'LOCAL'} Supabase: ${supabaseUrl}\n`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- Subscription Integration Check ---');

    // 1. Define Date Range (Last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();

    console.log(`Period: ${startStr} ~ ${endStr}`);

    // 2. Query Orders Revenue
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'completed')
        .gte('created_at', startStr)
        .lte('created_at', endStr);

    if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return;
    }

    const ordersRevenue = (orders || []).reduce((sum, order) => sum + order.total_amount, 0);
    console.log(`[Orders Table] Revenue: ${ordersRevenue.toLocaleString()} KRW`);

    // 3. Query Subscription Payments Revenue
    const { data: subPayments, error: subError } = await supabase
        .from('subscription_payments')
        .select('amount')
        .eq('status', 'success')
        .gte('created_at', startStr)
        .lte('created_at', endStr);

    if (subError) {
        console.error('Error fetching subscription payments:', subError);
        console.log('Note: subscription_payments table might not exist or no permission.');
    }

    const subRevenue = subPayments ? subPayments.reduce((sum, p) => sum + p.amount, 0) : 0;
    console.log(`[Subscription Payments Table] Revenue: ${subRevenue.toLocaleString()} KRW`);

    const expectedTotal = ordersRevenue + subRevenue;
    console.log(`[Expected Total] Revenue: ${expectedTotal.toLocaleString()} KRW`);

    // 4. Call RPC get_revenue_by_date
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_revenue_by_date', {
        start_date: startStr,
        end_date: endStr,
        group_by: 'day'
    });

    if (rpcError) {
        console.error('Error calling RPC get_revenue_by_date:', rpcError);
        return;
    }

    const rpcTotal = (rpcData || []).reduce((sum, item) => sum + item.total, 0);
    console.log(`[RPC get_revenue_by_date] Total Revenue: ${rpcTotal.toLocaleString()} KRW`);

    // 5. Compare
    console.log('--------------------------------------');
    if (Math.abs(rpcTotal - expectedTotal) < 10) {
        console.log('✅ Integration Status: SUCCESS (RPC matches Orders + Subscriptions)');
    } else if (Math.abs(rpcTotal - ordersRevenue) < 10) {
        console.log('❌ Integration Status: FAILED (RPC only counts Orders)');
        console.log('   -> Subscription revenue is NOT included in the dashboard.');
    } else {
        console.log('⚠️ Integration Status: UNCERTAIN');
        console.log(`   Diff (RPC - Expected): ${rpcTotal - expectedTotal}`);
        console.log(`   Diff (RPC - Orders): ${rpcTotal - ordersRevenue}`);
    }
}

checkIntegration();
