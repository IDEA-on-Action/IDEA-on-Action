/**
 * 토스페이먼츠 결제경로 스크린샷 캡처 스크립트
 *
 * 카드사 심사 제출용 결제 플로우 화면 캡처
 * 실행: npx ts-node scripts/capture-payment-flow.ts
 *
 * 사전 준비:
 * 1. .env.local에 TEST_EMAIL, TEST_PASSWORD 설정
 * 2. npm run dev로 개발 서버 실행
 */

import { chromium, Browser, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv'

// ESM에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 환경변수 로드
dotenv.config({ path: '.env.local' })

// 설정
const CONFIG = {
  // 프로덕션 URL 사용 (카드사 심사 제출용)
  baseUrl: process.env.PLAYWRIGHT_BASE_URL || 'https://www.ideaonaction.ai',
  testEmail: process.env.TEST_EMAIL || '',
  testPassword: process.env.TEST_PASSWORD || '',
  outputDir: path.join(__dirname, 'payment-flow-screenshots'),
  // 시스템 시간 보이도록 전체 화면 캡처 (작업표시줄 포함)
  viewport: { width: 1920, height: 1080 },
  // 서비스 slug (실제 서비스에 맞게 수정)
  testServiceSlug: 'compass-navigator',
}

// 시간 오버레이 추가 함수 (카드사 심사용 - PC 시간 표시)
async function addTimeOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    // 기존 오버레이 제거
    const existing = document.getElementById('capture-time-overlay')
    if (existing) existing.remove()

    // 새 오버레이 생성
    const overlay = document.createElement('div')
    overlay.id = 'capture-time-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-family: 'Malgun Gothic', sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `

    const now = new Date()
    const dateStr = now.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const timeStr = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    overlay.innerHTML = `📅 ${dateStr} ${timeStr}`
    document.body.appendChild(overlay)
  })
}

// 스크린샷 저장 함수
async function screenshot(page: Page, name: string, fullPage = true): Promise<void> {
  // PC 시간 오버레이 추가
  await addTimeOverlay(page)
  await page.waitForTimeout(100) // 오버레이 렌더링 대기

  const filename = path.join(CONFIG.outputDir, `${name}.png`)
  await page.screenshot({ path: filename, fullPage })
  console.log(`✅ 캡처 완료: ${name}.png`)
}

// 페이지 로드 대기
async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500) // 애니메이션 완료 대기
}

// 메인 캡처 함수
async function capturePaymentFlow(): Promise<void> {
  // 환경변수 확인
  if (!CONFIG.testEmail || !CONFIG.testPassword) {
    console.error('❌ 오류: .env.local에 TEST_EMAIL, TEST_PASSWORD를 설정해주세요.')
    process.exit(1)
  }

  // 출력 디렉토리 생성
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true })
  }

  console.log('🚀 결제경로 스크린샷 캡처 시작')
  console.log(`📁 저장 경로: ${CONFIG.outputDir}`)
  console.log(`🌐 Base URL: ${CONFIG.baseUrl}`)

  const browser: Browser = await chromium.launch({
    headless: false, // 디버깅용 - 실제 캡처 시 true로 변경 가능
  })

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })

  const page: Page = await context.newPage()

  try {
    // ========================================
    // 1. 홈페이지 + 푸터 (사업자 정보)
    // ========================================
    console.log('\n📸 1. 홈페이지 + 푸터 캡처')
    await page.goto(CONFIG.baseUrl)
    await waitForPageLoad(page)
    await screenshot(page, '01-homepage-full')

    // 푸터로 스크롤
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await screenshot(page, '02-footer-business-info', false)

    // ========================================
    // 2. 환불정책 페이지
    // ========================================
    console.log('\n📸 2. 환불정책 페이지 캡처')
    await page.goto(`${CONFIG.baseUrl}/refund-policy`)
    await waitForPageLoad(page)
    await screenshot(page, '03-refund-policy')

    // ========================================
    // 3. 로그인 페이지
    // ========================================
    console.log('\n📸 3. 로그인 페이지 캡처')
    await page.goto(`${CONFIG.baseUrl}/login`)
    await waitForPageLoad(page)
    await screenshot(page, '04-login-page')

    // ========================================
    // 4. 로그인 수행
    // ========================================
    console.log('\n🔐 로그인 수행')
    // 이메일 입력 (type="text"이고 placeholder가 "이메일 또는 아이디")
    await page.fill('input[placeholder="이메일 또는 아이디"]', CONFIG.testEmail)
    await page.fill('input[type="password"]', CONFIG.testPassword)

    // 로그인 버튼 클릭
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000) // 로그인 처리 대기
    await waitForPageLoad(page)
    console.log('✅ 로그인 성공')

    // ========================================
    // 5. 서비스 목록 페이지
    // ========================================
    console.log('\n📸 4. 서비스 목록 페이지 캡처')
    await page.goto(`${CONFIG.baseUrl}/services`)
    await waitForPageLoad(page)
    await screenshot(page, '05-services-list')

    // ========================================
    // 6. 서비스 상세 페이지
    // ========================================
    console.log('\n📸 5. 서비스 상세 페이지 캡처')
    // 서비스 카드 링크 클릭 (Link 컴포넌트는 a 태그로 렌더링됨)
    // /services/로 시작하지만 /services 자체는 제외
    const serviceCardLink = page.locator('a[href^="/services/"]:not([href="/services"])').first()
    if (await serviceCardLink.isVisible({ timeout: 3000 })) {
      console.log('   서비스 카드 발견, 클릭 중...')
      await serviceCardLink.click()
      await waitForPageLoad(page)
      await page.waitForTimeout(1000) // 데이터 로딩 대기
    } else {
      // 직접 서비스 상세 페이지로 이동
      console.log('   서비스 카드 없음, 직접 이동...')
      await page.goto(`${CONFIG.baseUrl}/services/${CONFIG.testServiceSlug}`)
      await waitForPageLoad(page)
      await page.waitForTimeout(1000)
    }
    await screenshot(page, '06-service-detail')

    // ========================================
    // 7. 장바구니에 상품 추가
    // ========================================
    console.log('\n🛒 장바구니에 상품 추가')
    // 장바구니 담기 버튼 찾기 (여러 가능한 텍스트/아이콘)
    const addToCartBtn = page.locator('button:has-text("장바구니에 담기"), button:has-text("장바구니"), button:has-text("담기"), button:has-text("Add to Cart")').first()
    if (await addToCartBtn.isVisible({ timeout: 3000 })) {
      await addToCartBtn.click()
      await page.waitForTimeout(1500)
      console.log('✅ 장바구니에 상품 추가 완료')
    } else {
      console.log('⚠️ 장바구니 담기 버튼을 찾을 수 없습니다.')
    }

    // ========================================
    // 8. 장바구니 Drawer 캡처
    // ========================================
    console.log('\n📸 6. 장바구니 캡처')
    // 헤더의 장바구니 버튼 클릭 (aria-label="장바구니 열기")
    const cartIconBtn = page.locator('button[aria-label="장바구니 열기"]')
    if (await cartIconBtn.isVisible({ timeout: 3000 })) {
      await cartIconBtn.click()
      await page.waitForTimeout(1000) // Drawer 애니메이션 대기
      console.log('   장바구니 Drawer 열림')
      await screenshot(page, '07-cart', false)
      // Drawer 닫기 (ESC 키)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    } else {
      console.log('⚠️ 장바구니 버튼을 찾을 수 없습니다.')
      await screenshot(page, '07-cart', false)
    }

    // ========================================
    // 9. 주문서 (Checkout) 페이지
    // ========================================
    console.log('\n📸 7. 주문서 페이지 캡처')
    // CartDrawer에서 주문하기 버튼 클릭 또는 직접 checkout 페이지로 이동
    const checkoutBtn = page.locator('button:has-text("주문하기"), button:has-text("결제하기"), a:has-text("주문하기")').first()
    if (await checkoutBtn.isVisible({ timeout: 2000 })) {
      await checkoutBtn.click()
      await waitForPageLoad(page)
      await page.waitForTimeout(1000)
    } else {
      // 직접 checkout 페이지로 이동
      await page.goto(`${CONFIG.baseUrl}/checkout`)
      await waitForPageLoad(page)
      await page.waitForTimeout(1000)
    }
    await screenshot(page, '08-checkout-order-form')

    // 주문서 약관 동의 영역 캡처
    await page.evaluate(() => {
      const termsSection = document.querySelector('[data-testid="terms-agreement"], .terms-agreement')
      if (termsSection) {
        termsSection.scrollIntoView({ behavior: 'instant', block: 'center' })
      }
    })
    await page.waitForTimeout(300)
    await screenshot(page, '09-checkout-terms', false)

    // ========================================
    // 10. 결제 수단 선택 페이지
    // ========================================
    console.log('\n📸 8. 결제 수단 선택 페이지 캡처')
    // 실제로는 주문 생성 후 결제 페이지로 이동
    // 여기서는 결제 페이지 UI만 캡처 (실제 주문 없이)
    console.log('⚠️ 결제 수단 선택 페이지는 실제 주문 후 캡처 필요')
    console.log('   /checkout/payment?order_id=xxx 형식으로 접근')

    // ========================================
    // 완료
    // ========================================
    console.log('\n✅ 스크린샷 캡처 완료!')
    console.log(`📁 저장 위치: ${CONFIG.outputDir}`)
    console.log('\n📝 추가 필요 작업:')
    console.log('   1. 실제 주문 생성 후 결제 수단 선택 페이지 캡처')
    console.log('   2. 토스페이먼츠 결제창 캡처 (테스트 모드)')
    console.log('   3. generate-payment-ppt.ts 실행하여 PPT 생성')

  } catch (error) {
    console.error('❌ 오류 발생:', error)
    // 오류 발생 시 현재 화면 캡처
    await screenshot(page, 'error-screenshot')
  } finally {
    await browser.close()
  }
}

// 실행
capturePaymentFlow().catch(console.error)
