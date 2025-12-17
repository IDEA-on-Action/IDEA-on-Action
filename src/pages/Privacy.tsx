/**
 * Privacy Policy Page
 *
 * 개인정보처리방침 페이지
 */

import { Helmet } from 'react-helmet-async'
import { PageLayout } from '@/components/layouts/PageLayout'

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>개인정보처리방침 - 생각과 행동</title>
        <meta
          name="description"
          content="생각과 행동 (IDEA on Action) 개인정보처리방침입니다."
        />
      </Helmet>

      <PageLayout
        title="개인정보처리방침"
        description="생각과 행동은 이용자의 개인정보를 소중히 다룹니다."
      >

        <div className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
          <div className="bg-primary/10 border-l-4 border-primary px-6 py-3 mb-8 rounded-r-lg">
            <p className="text-sm font-semibold mb-0">
              <span className="text-primary">시행일</span>: 2025년 11월 22일 (개정)
            </p>
          </div>

          <p className="leading-relaxed">
            생각과 행동(이하 "회사")은 <strong className="text-primary">「개인정보 보호법」</strong>, <strong className="text-primary">「정보통신망 이용촉진 및 정보보호 등에 관한 법률」</strong>,
            <strong className="text-primary">「전자금융거래법」</strong> 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록
            다음과 같이 개인정보 처리방침을 수립·공개합니다.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제1조 (개인정보의 수집 및 이용 목적)</h2>
          <p className="leading-relaxed">회사는 다음의 목적을 위하여 개인정보를 처리합니다:</p>
          <ol className="space-y-4">
            <li>
              <strong className="text-primary">회원 가입 및 관리</strong>
              <ul className="mt-2 space-y-1">
                <li>회원 가입 의사 확인, 회원제 서비스 제공, 본인 식별 및 인증</li>
                <li>회원자격 유지·관리, 서비스 부정이용 방지</li>
              </ul>
            </li>
            <li>
              <strong className="text-primary">서비스 제공</strong>
              <ul className="mt-2 space-y-1">
                <li>소프트웨어 개발 서비스 (MVP 개발, 풀스택 개발, 디자인 시스템, 시스템 운영 관리) 제공</li>
                <li>Minu 플랫폼 서비스 (Minu Find 등) 제공</li>
                <li>맞춤형 서비스 제공, 본인인증</li>
              </ul>
            </li>
            <li>
              <strong className="text-primary">결제 서비스 제공</strong>
              <ul className="mt-2 space-y-1">
                <li>서비스 이용료 결제, 결제 대금 정산</li>
                <li>전자금융거래 처리 및 기록 보관</li>
              </ul>
            </li>
            <li>
              <strong className="text-primary">마케팅 및 광고 활용</strong>
              <ul className="mt-2 space-y-1">
                <li>신규 서비스 개발 및 맞춤 서비스 제공</li>
                <li>이벤트 및 광고성 정보 제공 (뉴스레터 구독)</li>
              </ul>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제2조 (수집하는 개인정보의 항목)</h2>
          <p className="leading-relaxed">회사는 다음과 같은 개인정보를 수집합니다:</p>

          <h3 className="text-xl font-semibold mt-8 mb-4 text-primary">1. 필수 수집 항목</h3>
          <ul className="space-y-2">
            <li>
              <strong className="text-primary">회원 가입 시</strong>: 이메일, 이름, 비밀번호
            </li>
            <li>
              <strong className="text-primary">OAuth 로그인 시</strong>: 소셜 계정 정보 (Google, GitHub, Kakao 등)
            </li>
            <li>
              <strong className="text-primary">서비스 문의 시</strong>: 이름, 이메일, 회사명, 전화번호, 문의 내용
            </li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-4 text-primary">2. 결제 시 수집 항목</h3>
          <ul className="space-y-2">
            <li>신용카드 정보 (카드번호 뒤 4자리, 승인번호, 유효기간 - 마스킹 처리)</li>
            <li>계좌 정보 (은행명, 계좌번호 일부)</li>
            <li>결제 거래 내역 (결제일시, 금액, 상품명, 거래상태)</li>
            <li>빌링키 (구독 자동 결제용, 토스페이먼츠 측에서 안전하게 관리)</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-4 text-primary">3. 구독 서비스 관련 수집 항목</h3>
          <ul className="space-y-2">
            <li>구독 플랜 정보 (플랜명, 결제 주기, 구독 시작일)</li>
            <li>구독 상태 (활성, 일시중지, 해지)</li>
            <li>자동 결제 동의 여부 및 동의 일시</li>
            <li>다음 결제 예정일</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-4 text-primary">4. 자동 수집 항목</h3>
          <ul className="space-y-2">
            <li>IP 주소, 쿠키, 접속 기록, 서비스 이용 기록</li>
            <li>기기 정보 (OS, 브라우저 종류)</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제3조 (개인정보의 보유 및 이용 기간)</h2>
          <ol className="space-y-4">
            <li>
              <strong className="text-primary">회원 정보</strong>: 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우 해당 수사·조사 종료 시까지)
            </li>
            <li>
              <strong className="text-primary">전자상거래 기록</strong>:
              <ul className="mt-2 space-y-1">
                <li>계약 또는 청약철회 등에 관한 기록: <strong className="text-primary">5년</strong> (전자상거래법)</li>
                <li>대금결제 및 재화 등의 공급에 관한 기록: <strong className="text-primary">5년</strong> (전자상거래법)</li>
                <li>소비자의 불만 또는 분쟁처리에 관한 기록: <strong className="text-primary">3년</strong> (전자상거래법)</li>
              </ul>
            </li>
            <li>
              <strong className="text-primary">전자금융거래 기록</strong>: <strong className="text-primary">5년</strong> (전자금융거래법)
            </li>
            <li>
              <strong className="text-primary">통신비밀보호법</strong>: <strong className="text-primary">3개월</strong> (로그 기록)
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제4조 (결제 정보의 처리)</h2>
          <ol className="space-y-4">
            <li>
              <strong className="text-primary">결제 정보의 수집 목적</strong>: 서비스 이용료 결제, 환불 처리, 구독 자동 갱신, 결제 내역 조회
            </li>
            <li>
              <strong className="text-primary">결제 정보의 처리 방식</strong>:
              <ul className="mt-2 space-y-1">
                <li>신용카드 전체 번호는 회사에 저장되지 않습니다. 결제대행사(토스페이먼츠)에서 암호화하여 안전하게 처리합니다.</li>
                <li>빌링키(구독 자동 결제용 토큰)는 토스페이먼츠 측에서 보관하며, 회사는 결제 요청 시에만 사용합니다.</li>
                <li>결제 내역(거래일시, 금액, 승인번호)은 전자금융거래법에 따라 5년간 보관됩니다.</li>
              </ul>
            </li>
            <li>
              <strong className="text-primary">자동 결제 동의</strong>:
              <ul className="mt-2 space-y-1">
                <li>구독 서비스 이용 시 자동 결제에 대한 별도 동의를 받습니다.</li>
                <li>결제 예정일 최소 7일 전에 이메일로 결제 예정 안내를 발송합니다.</li>
                <li>이용자는 언제든지 자동 결제를 해지할 수 있습니다.</li>
              </ul>
            </li>
            <li>
              <strong className="text-primary">결제 정보의 보안</strong>:
              <ul className="mt-2 space-y-1">
                <li>PCI-DSS 인증을 받은 토스페이먼츠를 통해 결제가 처리됩니다.</li>
                <li>모든 결제 통신은 SSL/TLS 암호화를 통해 보호됩니다.</li>
                <li>회사 내부에서 결제 정보에 접근할 수 있는 인원은 최소한으로 제한됩니다.</li>
              </ul>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제5조 (개인정보의 제3자 제공)</h2>
          <p>
            회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:
          </p>
          <ol>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ol>

          <h3 className="text-xl font-semibold mt-8 mb-4 text-primary">결제 대행사 (토스페이먼츠)</h3>
          <table className="min-w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border px-4 py-2">제공받는 자</th>
                <th className="border border-border px-4 py-2">제공 목적</th>
                <th className="border border-border px-4 py-2">제공 항목</th>
                <th className="border border-border px-4 py-2">보유 기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border px-4 py-2">토스페이먼츠</td>
                <td className="border border-border px-4 py-2">전자결제 대행 서비스</td>
                <td className="border border-border px-4 py-2">
                  이름, 이메일, 결제 정보 (카드번호 일부, 승인번호)
                </td>
                <td className="border border-border px-4 py-2">5년 (전자금융거래법)</td>
              </tr>
            </tbody>
          </table>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제6조 (개인정보의 파기 절차 및 방법)</h2>
          <ol>
            <li>
              <strong>파기 절차</strong>: 이용자가 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져 내부 방침 및 관련 법령에 따라 일정 기간 저장된 후 파기됩니다.
            </li>
            <li>
              <strong>파기 방법</strong>:
              <ul>
                <li>전자적 파일 형태: 복구 및 재생되지 않도록 기술적 방법을 이용하여 완전하게 삭제</li>
                <li>종이에 출력된 개인정보: 분쇄기로 분쇄하거나 소각</li>
              </ul>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제7조 (개인정보 처리의 위탁)</h2>
          <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다:</p>
          <table className="min-w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border px-4 py-2">수탁자</th>
                <th className="border border-border px-4 py-2">위탁 업무</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border px-4 py-2">Supabase</td>
                <td className="border border-border px-4 py-2">데이터베이스 호스팅, 인증 관리</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2">토스페이먼츠</td>
                <td className="border border-border px-4 py-2">결제 대행 서비스</td>
              </tr>
              <tr>
                <td className="border border-border px-4 py-2">Vercel</td>
                <td className="border border-border px-4 py-2">웹사이트 호스팅</td>
              </tr>
            </tbody>
          </table>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제8조 (정보주체의 권리와 그 행사 방법)</h2>
          <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
          <ol>
            <li>개인정보 열람 요구</li>
            <li>개인정보 정정·삭제 요구</li>
            <li>개인정보 처리 정지 요구</li>
          </ol>
          <p>
            권리 행사는 이메일(sinclair.seo@ideaonaction.ai) 또는 전화(010-4904-2671)를 통해 가능하며,
            회사는 지체 없이 조치하겠습니다.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제9조 (개인정보 보호책임자)</h2>
          <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:</p>
          <div className="bg-muted/50 p-6 rounded-lg">
            <p>
              <strong>개인정보 보호책임자</strong>: 서민원
            </p>
            <p>
              <strong>이메일</strong>: sinclair.seo@ideaonaction.ai
            </p>
            <p>
              <strong>전화</strong>: 010-4904-2671
            </p>
          </div>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제10조 (개인정보의 안전성 확보 조치)</h2>
          <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
          <ol>
            <li>
              <strong>관리적 조치</strong>: 내부관리계획 수립·시행, 직원 교육
            </li>
            <li>
              <strong>기술적 조치</strong>: 개인정보 암호화, 접근 제어, 백업 및 복구
            </li>
            <li>
              <strong>물리적 조치</strong>: 전산실, 자료보관실 등의 접근 통제
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제11조 (개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항)</h2>
          <ol>
            <li>
              회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는 '쿠키(Cookie)'를 사용합니다.
            </li>
            <li>
              쿠키는 웹사이트를 운영하는데 이용되는 서버가 이용자의 컴퓨터 브라우저에 보내는 소량의 정보입니다.
            </li>
            <li>
              이용자는 웹 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만, 쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수 있습니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제12조 (개인정보처리방침의 변경)</h2>
          <p>
            이 개인정보처리방침은 2025년 11월 22일부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는
            변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
          </p>

          <hr className="my-8" />

          <div className="bg-muted/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">부칙</h3>
            <p>
              <strong>시행일</strong>: 이 개인정보처리방침은 2025년 11월 22일부터 시행합니다.
            </p>
          </div>

          <div className="mt-8 text-sm text-muted-foreground">
            <p>
              <strong>사업자 정보</strong>
            </p>
            <p>상호: 생각과 행동 (IDEA on Action)</p>
            <p>대표자: 서민원</p>
            <p>사업자등록번호: 537-05-01511</p>
            <p>주소: 경기도 시흥시 대은로104번길 11 (은행동, 우남아파트) 103동 601호</p>
            <p>이메일: sinclair.seo@ideaonaction.ai</p>
            <p>전화: 010-4904-2671</p>
          </div>
        </div>
      </PageLayout>
    </>
  )
}
