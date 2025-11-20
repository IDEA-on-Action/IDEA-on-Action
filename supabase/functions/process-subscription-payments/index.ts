
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Toss Payments API Configuration
const TOSS_PAYMENTS_SECRET_KEY = Deno.env.get('TOSS_PAYMENTS_SECRET_KEY')
const TOSS_PAYMENTS_API_URL = 'https://api.tosspayments.com/v1/billing'

interface Subscription {
  id: string
  user_id: string
  plan_id: string
  billing_key_id: string
  current_period_end: string
  next_billing_date: string
  status: string
  cancel_at_period_end: boolean
  billing_key: {
    billing_key: string
    customer_key: string
  }
  plan: {
    price: number
    plan_name: string
    billing_cycle: string
  }
}

Deno.serve(async (req: Request) => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Security Check: Verify CRON_SECRET
    const cronSecret = Deno.env.get('CRON_SECRET')
    const authHeader = req.headers.get('Authorization')

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized attempt to execute cron job')
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders
      })
    }

    // Initialize Supabase Client (Service Role for Admin Access)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get subscriptions due for payment
    // Status is active or trial, and next_billing_date is today or past
    const today = new Date().toISOString().split('T')[0]

    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        billing_key:billing_keys!inner (
          billing_key,
          customer_key
        ),
        plan:subscription_plans!inner (
          price,
          plan_name,
          billing_cycle
        )
      `)
      .in('status', ['active', 'trial'])
      .lte('next_billing_date', today)
      .eq('cancel_at_period_end', false) // Do not renew if cancelled

    if (fetchError) throw fetchError

    console.log(`Found ${subscriptions?.length || 0} subscriptions due for payment`)

    const results = []

    // 2. Process each subscription
    for (const sub of (subscriptions as unknown as Subscription[]) || []) {
      try {
        // Skip if price is 0 (Free plan?)
        if (sub.plan.price === 0) {
          // Just extend the period
          await extendSubscription(supabase, sub)
          results.push({ id: sub.id, status: 'extended_free' })
          continue
        }

        // Attempt Payment via Toss Payments
        const orderId = `sub_${sub.id}_${Date.now()}`
        const paymentResult = await processPayment(sub, orderId)

        if (paymentResult.success) {
          // Payment Success
          await handlePaymentSuccess(supabase, sub, paymentResult.data, orderId)
          results.push({ id: sub.id, status: 'success', orderId })
        } else {
          // Payment Failed
          await handlePaymentFailure(supabase, sub, paymentResult.error, orderId)
          results.push({ id: sub.id, status: 'failed', error: paymentResult.error })
        }

      } catch (err: any) {
        console.error(`Error processing subscription ${sub.id}:`, err)
        results.push({ id: sub.id, status: 'error', error: err.message || 'Unknown error' })
      }
    }

    // 3. Handle cancelled subscriptions (expire them if period ended)
    await handleExpiredSubscriptions(supabase, today)

    return new Response(
      JSON.stringify({
        message: 'Subscription processing completed',
        processed: results.length,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

// Helper: Process Payment with Toss Payments
async function processPayment(sub: Subscription, orderId: string) {
  if (!TOSS_PAYMENTS_SECRET_KEY) {
    throw new Error('TOSS_PAYMENTS_SECRET_KEY is not set')
  }

  const basicAuth = btoa(TOSS_PAYMENTS_SECRET_KEY + ':')

  try {
    const response = await fetch(`${TOSS_PAYMENTS_API_URL}/${sub.billing_key.billing_key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: sub.plan.price,
        customerKey: sub.billing_key.customer_key,
        orderId: orderId,
        orderName: `${sub.plan.plan_name} 정기결제`,
        customerEmail: '', // Optional: Fetch user email if needed
        taxFreeAmount: 0
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data }
    }

    return { success: true, data }

  } catch (error: any) {
    return { success: false, error: { message: error.message || 'Unknown error' } }
  }
}

// Helper: Handle Payment Success
async function handlePaymentSuccess(supabase: SupabaseClient, sub: Subscription, paymentData: any, orderId: string) {
  // 1. Record Payment
  await supabase.from('subscription_payments').insert({
    subscription_id: sub.id,
    amount: sub.plan.price,
    status: 'success',
    payment_key: paymentData.paymentKey,
    order_id: orderId,
    metadata: paymentData
  })

  // 2. Calculate next dates
  const nextDates = calculateNextDates(sub.plan.billing_cycle)

  // 3. Update Subscription
  await supabase.from('subscriptions').update({
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: nextDates.current_period_end,
    next_billing_date: nextDates.next_billing_date,
    updated_at: new Date().toISOString()
  }).eq('id', sub.id)
}

// Helper: Handle Payment Failure
async function handlePaymentFailure(supabase: SupabaseClient, sub: Subscription, errorData: any, orderId: string) {
  // 1. Record Failed Payment
  await supabase.from('subscription_payments').insert({
    subscription_id: sub.id,
    amount: sub.plan.price,
    status: 'failed',
    order_id: orderId,
    error_code: errorData.code || 'UNKNOWN',
    error_message: errorData.message || 'Unknown error',
    metadata: errorData
  })

  // 2. Update Subscription Status (Suspend or Retry logic could be added here)
  // For now, we keep it active but maybe add a 'past_due' status in future
  // Or just log it.
  console.log(`Payment failed for ${sub.id}: ${errorData.message}`)
}

// Helper: Extend Free Subscription
async function extendSubscription(supabase: SupabaseClient, sub: Subscription) {
  const nextDates = calculateNextDates(sub.plan.billing_cycle)

  await supabase.from('subscriptions').update({
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: nextDates.current_period_end,
    next_billing_date: nextDates.next_billing_date,
    updated_at: new Date().toISOString()
  }).eq('id', sub.id)
}

// Helper: Handle Expired/Cancelled Subscriptions
async function handleExpiredSubscriptions(supabase: SupabaseClient, today: string) {
  // Find subscriptions that are cancelled_at_period_end AND period has passed
  const { data: expiredSubs, error } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('cancel_at_period_end', true)
    .lt('current_period_end', today)
    .neq('status', 'expired') // Avoid re-processing

  if (expiredSubs && expiredSubs.length > 0) {
    const ids = expiredSubs.map((s: any) => s.id)
    await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .in('id', ids)

    console.log(`Expired ${ids.length} subscriptions`)
  }
}

// Utility: Calculate Next Dates
function calculateNextDates(cycle: string) {
  const now = new Date()
  let nextDate = new Date(now)

  switch (cycle) {
    case 'monthly':
      nextDate.setMonth(now.getMonth() + 1)
      break
    case 'quarterly':
      nextDate.setMonth(now.getMonth() + 3)
      break
    case 'yearly':
      nextDate.setFullYear(now.getFullYear() + 1)
      break
    default:
      nextDate.setMonth(now.getMonth() + 1) // Default to monthly
  }

  return {
    current_period_end: nextDate.toISOString(),
    next_billing_date: nextDate.toISOString().split('T')[0] // YYYY-MM-DD
  }
}
