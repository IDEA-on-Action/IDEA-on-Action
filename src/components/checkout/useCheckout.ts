import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCart } from '@/hooks/useCart'
import { useCreateOrder } from '@/hooks/payments/useOrders'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/stores/cartStore'

// 주문 폼 스키마
export const checkoutSchema = z.object({
    // 배송 정보
    shippingName: z.string().min(2, '이름을 입력해주세요'),
    shippingPhone: z
        .string()
        .min(10, '올바른 전화번호를 입력해주세요')
        .regex(/^[0-9-]+$/, '숫자와 하이픈만 입력 가능합니다'),
    postcode: z.string().min(5, '우편번호를 입력해주세요'),
    address: z.string().min(5, '주소를 입력해주세요'),
    addressDetail: z.string().min(2, '상세주소를 입력해주세요'),
    shippingNote: z.string().optional(),

    // 연락처 정보
    contactEmail: z.string().email('올바른 이메일을 입력해주세요'),
    contactPhone: z
        .string()
        .min(10, '올바른 전화번호를 입력해주세요')
        .regex(/^[0-9-]+$/, '숫자와 하이픈만 입력 가능합니다'),

    // 약관 동의 (필수)
    termsAgreed: z.boolean().refine((val) => val === true, {
        message: '이용약관에 동의해주세요',
    }),
    privacyAgreed: z.boolean().refine((val) => val === true, {
        message: '개인정보처리방침에 동의해주세요',
    }),
    refundAgreed: z.boolean().refine((val) => val === true, {
        message: '환불정책에 동의해주세요',
    }),
    electronicFinanceAgreed: z.boolean().refine((val) => val === true, {
        message: '전자금융거래약관에 동의해주세요',
    }),
    digitalServiceWithdrawalAgreed: z.boolean().refine((val) => val === true, {
        message: '디지털 서비스 청약철회 제한에 동의해주세요',
    }),
})

export type CheckoutFormValues = z.infer<typeof checkoutSchema>

export function useCheckout() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { data: cart, isLoading: isCartLoading } = useCart()
    const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrder()
    const { serviceItems, clearServiceItems } = useCartStore()
    const [isPostcodeOpen, setIsPostcodeOpen] = useState(false)

    const form = useForm<CheckoutFormValues>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            shippingName: '',
            shippingPhone: '',
            postcode: '',
            address: '',
            addressDetail: '',
            shippingNote: '',
            contactEmail: user?.email || '',
            contactPhone: '',
            termsAgreed: false,
            privacyAgreed: false,
            refundAgreed: false,
            electronicFinanceAgreed: false,
            digitalServiceWithdrawalAgreed: false,
        },
    })

    // Daum Postcode 완료 핸들러
    interface DaumPostcodeData {
        address: string
        addressType: string
        bname: string
        buildingName: string
        zonecode: string
    }

    const handlePostcodeComplete = (data: DaumPostcodeData) => {
        let fullAddress = data.address
        let extraAddress = ''

        if (data.addressType === 'R') {
            if (data.bname !== '') {
                extraAddress += data.bname
            }
            if (data.buildingName !== '') {
                extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName
            }
            fullAddress += extraAddress !== '' ? ` (${extraAddress})` : ''
        }

        form.setValue('postcode', data.zonecode)
        form.setValue('address', fullAddress)
        setIsPostcodeOpen(false)

        // 상세주소 입력 필드에 포커스
        setTimeout(() => {
            const addressDetailInput = document.querySelector<HTMLInputElement>('input[name="addressDetail"]')
            addressDetailInput?.focus()
        }, 100)
    }

    // 전체 동의 핸들러
    const handleAllAgree = (checked: boolean | 'indeterminate') => {
        // Ignore indeterminate state
        if (checked === 'indeterminate') return

        form.setValue('termsAgreed', checked)
        form.setValue('privacyAgreed', checked)
        form.setValue('refundAgreed', checked)
        form.setValue('electronicFinanceAgreed', checked)
        form.setValue('digitalServiceWithdrawalAgreed', checked)
    }

    // 전체 동의 상태 확인
    const isAllAgreed =
        form.watch('termsAgreed') &&
        form.watch('privacyAgreed') &&
        form.watch('refundAgreed') &&
        form.watch('electronicFinanceAgreed') &&
        form.watch('digitalServiceWithdrawalAgreed')

    // 장바구니 금액 계산
    // Regular items subtotal
    const regularSubtotal = cart?.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0

    // Service items subtotal
    const serviceSubtotal = serviceItems.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0

    // Total subtotal
    const subtotal = regularSubtotal + serviceSubtotal
    const tax = subtotal * 0.1
    const total = subtotal + tax

    const isEmpty = (!cart?.items || cart.items.length === 0) && serviceItems.length === 0

    // 주문 생성 핸들러
    const onSubmit = (data: CheckoutFormValues) => {
        // 일반 cart items가 없어도 serviceItems가 있으면 진행
        if (!cart && serviceItems.length === 0) return

        createOrder(
            {
                cartId: cart?.id || '', // cart가 없으면 빈 문자열
                shippingAddress: {
                    postcode: data.postcode,
                    address: data.address,
                    addressDetail: data.addressDetail,
                },
                shippingName: data.shippingName,
                shippingPhone: data.shippingPhone,
                shippingNote: data.shippingNote,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                // serviceItems 포함 (서버에서 처리)
                serviceItems: serviceItems.length > 0 ? serviceItems : undefined,
            },
            {
                onSuccess: (order) => {
                    // 서비스 항목 장바구니 비우기
                    clearServiceItems()
                    // 주문 생성 후 결제 페이지로 이동
                    navigate(`/checkout/payment?order_id=${order.id}`)
                },
            }
        )
    }

    return {
        form,
        user,
        cart,
        isCartLoading,
        isCreatingOrder,
        serviceItems,
        isPostcodeOpen,
        setIsPostcodeOpen,
        handlePostcodeComplete,
        handleAllAgree,
        isAllAgreed,
        subtotal,
        tax,
        total,
        isEmpty,
        onSubmit,
        navigate
    }
}
