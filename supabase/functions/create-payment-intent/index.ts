
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import type { SubscriptionPlan } from '../_shared/toss-payments.types.ts'

const TOSS_PAYMENTS_SECRET_KEY = Deno.env.get('TOSS_PAYMENTS_SECRET_KEY')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { planId, userId } = await req.json()

    if (!planId || !userId) {
      throw new Error('Missing planId or userId')
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch Plan Details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      throw new Error('Plan not found')
    }

    const subscriptionPlan = plan as unknown as SubscriptionPlan

    // 2. Create Order ID
    const orderId = `upgrade_${userId}_${Date.now()}`

    // 3. Return Order Details for Frontend Widget
    // Note: For simple upgrades, we might just charge the full amount of the new plan
    // and let the next billing cycle handle the rest.
    // For strict proration, we would calculate the difference here.
    // For now, we'll assume immediate charge of the new plan price.

    return new Response(
      JSON.stringify({
        orderId,
        amount: subscriptionPlan.price,
        orderName: `${subscriptionPlan.plan_name} 업그레이드`,
        customerEmail: '', // Can be fetched from auth.users if needed
        customerName: '' // Can be fetched from profiles if needed
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
