
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import type {
  SubscriptionInfo,
  TossPaymentResult,
  TossPaymentError,
  PaymentProcessResult,
  SubscriptionPayment,
  ActivityLog
} from '../_shared/toss-payments.types.ts'

// Toss Payments API Configuration
const TOSS_PAYMENTS_SECRET_KEY = Deno.env.get('TOSS_PAYMENTS_SECRET_KEY')
const TOSS_PAYMENTS_API_URL = 'https://api.tosspayments.com/v1/billing'

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
    for (const sub of (subscriptions as unknown as SubscriptionInfo[]) || []) {
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
          await handlePaymentSuccess(supabase, sub, paymentResult.data!, orderId)
          results.push({ id: sub.id, status: 'success', orderId })
        } else {
          // Payment Failed
          await handlePaymentFailure(supabase, sub, paymentResult.error!, orderId)
          results.push({ id: sub.id, status: 'failed', error: paymentResult.error })
        }

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error(`Error processing subscription ${sub.id}:`, err)
        results.push({ id: sub.id, status: 'error', error: errorMessage })
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

// Helper: Process Payment with Toss Payments (with retry logic)
async function processPayment(sub: SubscriptionInfo, orderId: string, retryCount = 0): Promise<PaymentProcessResult> {
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 1000 // Initial delay: 1 second

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

    const data = await response.json() as TossPaymentResult | TossPaymentError

    if (!response.ok) {
      // Check if error is retryable (network errors, 5xx server errors)
      const isRetryable = response.status >= 500 || response.status === 429

      if (isRetryable && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount) // Exponential backoff
        console.log(`Payment failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return processPayment(sub, orderId, retryCount + 1)
      }

      return { success: false, error: data as TossPaymentError }
    }

    return { success: true, data: data as TossPaymentResult }

  } catch (error: unknown) {
    // Network errors - retry
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount)
      console.log(`Network error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return processPayment(sub, orderId, retryCount + 1)
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: { message: errorMessage, code: 'NETWORK_ERROR' } }
  }
}

// Helper: Handle Payment Success
async function handlePaymentSuccess(supabase: SupabaseClient, sub: SubscriptionInfo, paymentData: TossPaymentResult, orderId: string) {
  // 1. Record Payment
  const payment: SubscriptionPayment = {
    subscription_id: sub.id,
    amount: sub.plan.price,
    status: 'success',
    payment_key: paymentData.paymentKey,
    order_id: orderId,
    paid_at: new Date().toISOString(),
    metadata: paymentData
  }
  await supabase.from('subscription_payments').insert(payment)

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

  // 4. Log activity
  const log: ActivityLog = {
    user_id: sub.user_id,
    action: 'subscription_payment_success',
    entity_type: 'subscription',
    entity_id: sub.id,
    metadata: {
      amount: sub.plan.price,
      plan_name: sub.plan.plan_name,
      order_id: orderId,
      payment_key: paymentData.paymentKey
    }
  }
  await supabase.from('activity_logs').insert(log)

  console.log(`✅ Payment successful for ${sub.id}: ₩${sub.plan.price.toLocaleString()}`)
}

// Helper: Handle Payment Failure
async function handlePaymentFailure(supabase: SupabaseClient, sub: SubscriptionInfo, errorData: TossPaymentError, orderId: string) {
  // 1. Record Failed Payment
  const payment: SubscriptionPayment = {
    subscription_id: sub.id,
    amount: sub.plan.price,
    status: 'failed',
    order_id: orderId,
    error_code: errorData.code || 'UNKNOWN',
    error_message: errorData.message || 'Unknown error',
    metadata: errorData
  }
  await supabase.from('subscription_payments').insert(payment)

  // 2. Check consecutive failures
  const { data: recentPayments } = await supabase
    .from('subscription_payments')
    .select('status')
    .eq('subscription_id', sub.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const consecutiveFailures = recentPayments?.filter(p => p.status === 'failed').length || 0

  // 3. Suspend subscription after 3 consecutive failures
  if (consecutiveFailures >= 3) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('id', sub.id)

    // Log suspension activity
    const suspensionLog: ActivityLog = {
      user_id: sub.user_id,
      action: 'subscription_suspended',
      entity_type: 'subscription',
      entity_id: sub.id,
      metadata: {
        reason: 'consecutive_payment_failures',
        failure_count: consecutiveFailures,
        last_error: errorData.message
      }
    }
    await supabase.from('activity_logs').insert(suspensionLog)

    console.log(`⚠️ Subscription ${sub.id} suspended after 3 consecutive payment failures`)

    // TODO: Send email notification to user about suspension
    // await sendPaymentFailureEmail(sub.user_id, sub)
  } else {
    // Log payment failure activity
    const failureLog: ActivityLog = {
      user_id: sub.user_id,
      action: 'subscription_payment_failed',
      entity_type: 'subscription',
      entity_id: sub.id,
      metadata: {
        amount: sub.plan.price,
        plan_name: sub.plan.plan_name,
        order_id: orderId,
        error_code: errorData.code || 'UNKNOWN',
        error_message: errorData.message,
        consecutive_failures: consecutiveFailures
      }
    }
    await supabase.from('activity_logs').insert(failureLog)

    console.log(`❌ Payment failed for ${sub.id}: ${errorData.message} (${consecutiveFailures}/3 failures)`)
  }
}

// Helper: Extend Free Subscription
async function extendSubscription(supabase: SupabaseClient, sub: SubscriptionInfo) {
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
    const ids = expiredSubs.map((s: { id: string }) => s.id)
    await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .in('id', ids)

    console.log(`Expired ${ids.length} subscriptions`)
  }
}

// Utility: Calculate Next Dates
function calculateNextDates(cycle: 'monthly' | 'quarterly' | 'yearly') {
  const now = new Date()
  const nextDate = new Date(now)

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
  }

  return {
    current_period_end: nextDate.toISOString(),
    next_billing_date: nextDate.toISOString().split('T')[0] // YYYY-MM-DD
  }
}
