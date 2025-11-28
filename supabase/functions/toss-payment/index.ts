import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"
import { getCorsHeaders } from "../_shared/cors.ts"
import { createResponse, createErrorResponse } from "../_shared/response.ts"

const TOSS_API_URL = "https://api.tosspayments.com/v1/payments/confirm"

serve(async (req) => {
    const origin = req.headers.get('origin')

    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsHeaders(origin) })
    }

    try {
        const { paymentKey, orderId, amount } = await req.json()

        if (!paymentKey || !orderId || !amount) {
            return createErrorResponse('Missing required parameters', 400, origin)
        }

        // 1. 토스페이먼츠 결제 승인 요청
        const widgetSecretKey = Deno.env.get('TOSS_SECRET_KEY')
        if (!widgetSecretKey) {
            console.error('TOSS_SECRET_KEY is not set')
            return createErrorResponse('Server configuration error', 500, origin)
        }

        const encryptedSecretKey = btoa(widgetSecretKey + ':')

        const response = await fetch(TOSS_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encryptedSecretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paymentKey,
                orderId,
                amount,
            }),
        })

        const result = await response.json()

        if (!response.ok) {
            console.error('Toss Payments Error:', result)
            return createErrorResponse(result.message || 'Payment confirmation failed', response.status, origin, result)
        }

        // 2. Supabase DB 업데이트
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 결제 정보 저장/업데이트
        const { data: existingPayment } = await supabase
            .from('payments')
            .select('id')
            .eq('order_id', orderId)
            .eq('status', 'pending')
            .maybeSingle()

        if (existingPayment) {
            await supabase.from('payments').update({
                provider: 'toss',
                provider_transaction_id: paymentKey,
                amount: amount,
                status: 'completed',
                payment_method: result.method,
                metadata: result,
                paid_at: result.approvedAt,
            }).eq('id', existingPayment.id)
        } else {
            // 없으면 새로 생성 (예외적 상황)
            await supabase.from('payments').insert({
                order_id: orderId,
                provider: 'toss',
                provider_transaction_id: paymentKey,
                amount: amount,
                status: 'completed',
                payment_method: result.method,
                metadata: result,
                paid_at: result.approvedAt,
            })
        }

        // 주문 상태 업데이트
        const { error: orderError } = await supabase
            .from('orders')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', orderId)

        if (orderError) {
            console.error('Failed to update order status:', orderError)
            // 결제는 성공했으나 주문 상태 업데이트 실패. (심각한 오류는 아님, 웹훅이 보정 가능)
        }

        return createResponse({ success: true, data: result }, 200, origin)

    } catch (error) {
        console.error('Internal Server Error:', error)
        return createErrorResponse('Internal Server Error', 500, origin, error.message)
    }
})
