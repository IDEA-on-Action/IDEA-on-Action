/**
 * 토스페이먼츠 결제경로 PPT 자동 생성 스크립트
 *
 * 스크린샷을 기반으로 카드사 심사 제출용 PPT 생성
 * 실행: npx ts-node scripts/generate-payment-ppt.ts
 *
 * 사전 준비:
 * 1. capture-payment-flow.ts 실행하여 스크린샷 캡처
 * 2. scripts/payment-flow-screenshots/ 폴더에 이미지 확인
 */

// @ts-ignore - pptxgenjs ESM import issue
import pptxgenjs from 'pptxgenjs'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ESM에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ESM default export 처리
const PptxGenJS = pptxgenjs.default || pptxgenjs

// 가맹점 정보
const MERCHANT_INFO = {
  name: '생각과 행동 (IDEA on Action)',
  businessNumber: '537-05-01511',
  salesNumber: '2025-경기시흥-2094',
  url: 'https://www.ideaonaction.ai',
  ceo: '서민원',
  address: '경기도 시흥시 대은로104번길 11 (은행동, 우남아파트) 103동 601호',
  phone: '010-4904-2671',
  email: 'sinclair.seo@ideaonaction.ai',
  testId: 'toss-review@ideaonaction.ai',
  testPw: 'TossReview2025!',
}

// 슬라이드 설정
interface SlideConfig {
  filename: string
  title: string
  description?: string
}

const SLIDES: SlideConfig[] = [
  { filename: '01-homepage-full.png', title: '홈페이지 메인', description: '서비스 소개 및 주요 기능 안내' },
  { filename: '02-footer-business-info.png', title: '하단 정보 (사업자 정보)', description: '상호명, 대표자, 사업자등록번호, 통신판매업신고번호, 주소, 연락처' },
  { filename: '03-refund-policy.png', title: '환불규정', description: '무형상품(디지털 서비스) 환불 정책' },
  { filename: '04-login-page.png', title: '로그인 / 회원가입', description: '회원 로그인 화면' },
  { filename: '05-services-list.png', title: '상품 목록', description: '서비스 카탈로그 페이지' },
  { filename: '06-service-detail.png', title: '상품 상세', description: '서비스 상세 정보 및 가격' },
  { filename: '07-cart.png', title: '장바구니', description: '선택한 상품 목록 및 합계' },
  { filename: '08-checkout-order-form.png', title: '주문서 (구매자 정보)', description: '주문자 정보, 배송 정보 입력' },
  { filename: '09-checkout-terms.png', title: '주문서 (약관 동의)', description: '이용약관, 개인정보처리방침, 환불정책 동의' },
  { filename: '10-payment-select.png', title: '결제수단 선택', description: '토스페이먼츠 / 카카오페이 선택' },
  { filename: '11-toss-widget.png', title: '카드 결제 경로', description: '토스페이먼츠 결제창 - 카드사 선택' },
]

// 스크린샷 디렉토리
const SCREENSHOTS_DIR = path.join(__dirname, 'payment-flow-screenshots')
const OUTPUT_DIR = path.join(__dirname, 'payment-flow-ppt')

async function generatePaymentPPT(): Promise<void> {
  console.log('🚀 결제경로 PPT 생성 시작')

  // 출력 디렉토리 생성
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // 스크린샷 디렉토리 확인
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    console.error(`❌ 스크린샷 디렉토리가 없습니다: ${SCREENSHOTS_DIR}`)
    console.log('먼저 capture-payment-flow.ts를 실행하세요.')
    process.exit(1)
  }

  // PPT 생성
  const pptx = new PptxGenJS()
  pptx.author = MERCHANT_INFO.name
  pptx.title = '토스페이먼츠 결제경로 - ' + MERCHANT_INFO.name
  pptx.subject = '카드사 심사 제출용'
  pptx.company = MERCHANT_INFO.name

  // ========================================
  // 슬라이드 1: 표지 (가맹점 정보)
  // ========================================
  console.log('\n📄 슬라이드 1: 표지 (가맹점 정보)')
  const coverSlide = pptx.addSlide()

  // 제목
  coverSlide.addText('결제경로 파일', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 1,
    fontSize: 36,
    bold: true,
    color: '333333',
  })

  // 토스페이먼츠 로고 텍스트
  coverSlide.addText('toss payments', {
    x: 0.5,
    y: 1.5,
    w: 3,
    h: 0.5,
    fontSize: 18,
    color: '0064FF',
    bold: true,
  })

  // 가맹점 정보 테이블
  const merchantData = [
    ['(1) 상호명', MERCHANT_INFO.name],
    ['(2) 사업자번호', MERCHANT_INFO.businessNumber],
    ['(3) URL', MERCHANT_INFO.url],
    ['(4) Test ID', MERCHANT_INFO.testId],
    ['(5) Test PW', MERCHANT_INFO.testPw],
  ]

  coverSlide.addTable(merchantData, {
    x: 0.5,
    y: 2.5,
    w: 9,
    colW: [2, 7],
    border: { type: 'solid', color: 'CCCCCC', pt: 1 },
    fontFace: 'Arial',
    fontSize: 14,
    color: '333333',
    fill: { color: 'F8F9FA' },
  })

  // 작성일
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  coverSlide.addText(`작성일: ${today}`, {
    x: 0.5,
    y: 5,
    w: 9,
    h: 0.5,
    fontSize: 12,
    color: '666666',
  })

  // ========================================
  // 슬라이드 2: 하단 정보 (별도 강조)
  // ========================================
  console.log('📄 슬라이드 2: 하단 정보 (사업자 정보 상세)')
  const footerInfoSlide = pptx.addSlide()

  footerInfoSlide.addText('② 하단 정보 캡처', {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: '0064FF',
  })

  footerInfoSlide.addText('필수 구성 항목: (1) 상호명 / (2) 대표자명 / (3) 사업자등록번호 / (4) 통신판매업신고번호 / (5) 사업장주소 / (6) 유선전화번호', {
    x: 0.5,
    y: 0.9,
    w: 9,
    h: 0.5,
    fontSize: 11,
    color: '666666',
  })

  // 사업자 정보 상세 테이블
  const businessData = [
    ['상호명', MERCHANT_INFO.name],
    ['대표자명', MERCHANT_INFO.ceo],
    ['사업자등록번호', MERCHANT_INFO.businessNumber],
    ['통신판매업신고번호', MERCHANT_INFO.salesNumber],
    ['사업장주소', MERCHANT_INFO.address],
    ['유선전화번호', MERCHANT_INFO.phone],
    ['이메일', MERCHANT_INFO.email],
  ]

  footerInfoSlide.addTable(businessData, {
    x: 0.5,
    y: 1.6,
    w: 9,
    colW: [2.5, 6.5],
    border: { type: 'solid', color: '0064FF', pt: 1 },
    fontFace: 'Arial',
    fontSize: 13,
    color: '333333',
  })

  // ========================================
  // 스크린샷 슬라이드들
  // ========================================
  const existingFiles = fs.readdirSync(SCREENSHOTS_DIR)
  console.log(`\n📁 발견된 스크린샷: ${existingFiles.length}개`)

  for (const slideConfig of SLIDES) {
    const imagePath = path.join(SCREENSHOTS_DIR, slideConfig.filename)

    if (!fs.existsSync(imagePath)) {
      console.log(`⚠️ 이미지 없음 (건너뜀): ${slideConfig.filename}`)
      continue
    }

    console.log(`📄 슬라이드: ${slideConfig.title}`)

    const slide = pptx.addSlide()

    // 제목
    slide.addText(slideConfig.title, {
      x: 0.3,
      y: 0.2,
      w: 9.4,
      h: 0.5,
      fontSize: 20,
      bold: true,
      color: '333333',
    })

    // 설명
    if (slideConfig.description) {
      slide.addText(slideConfig.description, {
        x: 0.3,
        y: 0.65,
        w: 9.4,
        h: 0.3,
        fontSize: 11,
        color: '666666',
      })
    }

    // 이미지 추가
    const imageData = fs.readFileSync(imagePath).toString('base64')
    const ext = path.extname(slideConfig.filename).slice(1) as 'png' | 'jpg' | 'jpeg'

    slide.addImage({
      data: `image/${ext};base64,${imageData}`,
      x: 0.3,
      y: 1,
      w: 9.4,
      h: 5.5,
      sizing: { type: 'contain', w: 9.4, h: 5.5 },
    })
  }

  // ========================================
  // 마지막 슬라이드: 감사합니다
  // ========================================
  console.log('📄 슬라이드: 마무리')
  const endSlide = pptx.addSlide()

  endSlide.addText('감사합니다', {
    x: 0,
    y: 2.5,
    w: 10,
    h: 1,
    fontSize: 48,
    bold: true,
    align: 'center',
    color: '333333',
  })

  endSlide.addText('toss payments', {
    x: 0,
    y: 3.8,
    w: 10,
    h: 0.5,
    fontSize: 20,
    align: 'center',
    color: '0064FF',
    bold: true,
  })

  endSlide.addText(`${today} 최종 작성 / 심사 제출용`, {
    x: 0,
    y: 5,
    w: 10,
    h: 0.3,
    fontSize: 12,
    align: 'center',
    color: '999999',
  })

  // ========================================
  // PPT 저장
  // ========================================
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outputFile = path.join(OUTPUT_DIR, `결제경로_${MERCHANT_INFO.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${timestamp}.pptx`)

  await pptx.writeFile({ fileName: outputFile })

  console.log('\n✅ PPT 생성 완료!')
  console.log(`📁 저장 위치: ${outputFile}`)
  console.log('\n📝 제출 전 확인 사항:')
  console.log('   1. 모든 화면에 도메인 주소가 보이는지 확인')
  console.log('   2. PC 시간이 함께 캡처되었는지 확인')
  console.log('   3. 상품명, 이미지, 금액 흐름이 확인 가능한지 검토')
  console.log('   4. 토스페이먼츠 결제창 캡처가 포함되었는지 확인')
}

// 실행
generatePaymentPPT().catch(console.error)
