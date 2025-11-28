import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"
import { createResponse, createErrorResponse } from "../_shared/response.ts"

serve(async (req) => {
    try {
        // 웹훅은 보통 POST 요청
        if (req.method !== 'POST') {
            return createErrorResponse('Method not allowed', 405)
        }

        const body = await req.json()
        const { eventType, data } = body

        console.log('Webhook received:', eventType, data)

        if (eventType === 'PAYMENT_STATUS_CHANGED') {
            const { orderId, status, paymentKey, approvedAt, totalAmount, method } = data

            // Supabase 클라이언트 생성
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            const supabase = createClient(supabaseUrl, supabaseKey)

            let paymentStatus = 'pending'
            let orderStatus = 'pending'

            switch (status) {
                case 'DONE':
                    paymentStatus = 'completed'
                    orderStatus = 'processing' // 결제 완료 시 주문 처리 중으로 변경
                    break
                case 'CANCELED':
                    paymentStatus = 'refunded' // 또는 cancelled
                    orderStatus = 'cancelled'
                    break
                case 'ABORTED':
                    paymentStatus = 'failed'
                    orderStatus = 'cancelled'
                    break
                case 'WAITING_FOR_DEPOSIT':
                    paymentStatus = 'pending'
                    orderStatus = 'pending'
                    break
                default:
                    console.log('Unhandled status:', status)
                    return createResponse({ message: 'Unhandled status, but received' })
            }

            // 1. Payments 테이블 업데이트
            // orderId를 사용하여 해당 결제 건 찾기
            // 만약 없다면 생성 (웹훅이 먼저 올 수도 있음 - 드물지만)
            const { data: existingPayment } = await supabase
                .from('payments')
                .select('id')
                .eq('order_id', orderId)
                .maybeSingle()

            if (existingPayment) {
                await supabase.from('payments').update({
                    status: paymentStatus,
                    provider_transaction_id: paymentKey,
                    paid_at: approvedAt,
                    metadata: data, // 전체 데이터 저장
                    updated_at: new Date().toISOString(),
                }).eq('id', existingPayment.id)
            } else {
                await supabase.from('payments').insert({
                    order_id: orderId,
                    provider: 'toss',
                    provider_transaction_id: paymentKey,
                    amount: totalAmount,
                    status: paymentStatus,
                    payment_method: method,
                    metadata: data,
                    paid_at: approvedAt,
                })
            }

            // 2. Orders 테이블 업데이트
            await supabase
                .from('orders')
                .update({
                    status: orderStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId)

            console.log(`Processed ${eventType} for order ${orderId}: ${status}`)
        }

        return createResponse({ success: true })

    } catch (error) {
        console.error('Webhook Error:', error)
        return createErrorResponse('Internal Server Error', 500, null, error.message)
    }
})
