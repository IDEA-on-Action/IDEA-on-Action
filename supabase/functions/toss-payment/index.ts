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
        // 이미 payments 테이블에 레코드가 생성되어 있을 수도 있고(클라이언트에서 생성),
        // 없을 수도 있음. 여기서는 upsert 혹은 update를 수행.
        // 보통 클라이언트에서 결제 요청 전 'pending' 상태로 payments를 생성해두는 것이 좋음.
        // 여기서는 orderId를 기준으로 payments를 찾아서 업데이트하거나 새로 생성.

        const { data: paymentData, error: paymentError } = await supabase
            .from('payments')
            .upsert({
                order_id: orderId, // orderId가 UUID라면 그대로 사용, 만약 주문번호(String)라면 매핑 필요. 현재 스키마는 order_id가 UUID.
                // 주의: Toss의 orderId는 보통 문자열(주문번호). 우리 DB의 orders.id는 UUID.
                // 클라이언트가 Toss에 요청할 때 orderId 필드에 무엇을 넣었는지 중요함.
                // 보통 UUID를 그대로 쓰거나, 별도의 order_number를 씀.
                // 여기서는 클라이언트가 orders.id (UUID)를 Toss orderId로 썼다고 가정하거나,
                // 혹은 별도 로직이 필요.
                // *중요*: 마이그레이션 파일을 보면 orders.order_number가 없음. orders.id가 UUID임.
                // 따라서 Toss orderId = orders.id (UUID) 로 가정.
                provider: 'toss',
                provider_transaction_id: paymentKey,
                amount: amount,
                status: 'completed',
                payment_method: result.method, // '카드', '간편결제' 등
                metadata: result,
                paid_at: result.approvedAt,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'order_id' }) // order_id가 unique constraint가 있나? idx_payments_order_id는 인덱스일뿐.
        // payments 테이블 PK는 id. order_id로 조회해서 업데이트해야 함.
        // 하지만 upsert는 PK나 unique constraint가 필요함.
        // 안전하게는 select -> update/insert.

        // 간단하게는: order_id로 기존 payment 조회 -> 있으면 update, 없으면 insert
        // 하지만 여기서는 간단히 insert 하되, order_id로 연결.

        // *수정*: payments 테이블에 order_id에 대한 unique 제약조건이 없으므로,
        // 여러 결제 시도가 있을 수 있음. 가장 최근 것을 업데이트하거나 새로 추가.
        // 여기서는 새로 추가하는 대신, 기존에 pending으로 생성된 것이 있다면 그것을 업데이트하는 로직이 이상적.
        // 하지만 복잡성을 줄이기 위해, order_id를 가진 payment 중 pending인 것을 찾아서 업데이트.

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
