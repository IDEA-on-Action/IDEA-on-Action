/**
 * Terms of Service Page
 *
 * 이용약관 페이지
 */

import { Helmet } from 'react-helmet-async'
import { PageLayout } from '@/components/layouts/PageLayout'

export default function Terms() {
  return (
    <>
      <Helmet>
        <title>이용약관 - 생각과 행동</title>
        <meta name="description" content="생각과 행동 (IDEA on Action) 서비스 이용약관입니다." />
      </Helmet>

      <PageLayout
        title="이용약관"
        description="생각과 행동 (IDEA on Action) 서비스 이용약관입니다."
      >

        <div className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
          <div className="bg-primary/10 border-l-4 border-primary px-6 py-3 mb-8 rounded-r-lg">
            <p className="text-sm font-semibold mb-0">
              <span className="text-primary">시행일</span>: 2025년 11월 14일
            </p>
          </div>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제1조 (목적)</h2>
          <p className="leading-relaxed">
            이 약관은 생각과 행동(이하 "회사")이 제공하는 웹사이트 및 관련 서비스(이하 "서비스")의 이용과 관련하여
            회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제2조 (정의)</h2>
          <ol className="space-y-4">
            <li>
              <strong className="text-primary">"서비스"</strong>란 회사가 제공하는 소프트웨어 개발 서비스 및 COMPASS 플랫폼 서비스를 의미합니다.
            </li>
            <li>
              <strong className="text-primary">"개발 서비스"</strong>란 맞춤형 소프트웨어 개발, 디자인 시스템 구축, 시스템 운영 관리 등의 서비스를 의미합니다.
            </li>
            <li>
              <strong className="text-primary">"플랫폼 서비스"</strong>란 COMPASS Navigator 등 SaaS 형태로 제공되는 서비스를 의미합니다.
            </li>
            <li>
              <strong className="text-primary">"이용자"</strong>란 이 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 의미합니다.
            </li>
            <li>
              <strong className="text-primary">"회원"</strong>이란 회사와 서비스 이용계약을 체결하고 이용자 아이디(ID)를 부여받은 자를 의미합니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제3조 (약관의 명시, 효력 및 변경)</h2>
          <ol className="space-y-4">
            <li>
              회사는 이 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
            </li>
            <li>
              회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
            </li>
            <li>
              약관을 개정할 경우, <strong className="text-primary">적용일자 7일 전</strong>부터 적용일자 전일까지 공지합니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제4조 (서비스의 제공 및 변경)</h2>
          <ol className="space-y-4">
            <li>
              회사는 다음과 같은 서비스를 제공합니다:
              <ul className="mt-3 space-y-3">
                <li>
                  <strong className="text-primary">개발 서비스</strong>
                  <ul className="mt-2 space-y-1">
                    <li>MVP 개발 서비스</li>
                    <li>풀스택 개발 서비스</li>
                    <li>디자인 시스템 구축 서비스</li>
                    <li>시스템 운영 관리 서비스</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-primary">COMPASS 플랫폼</strong>
                  <ul className="mt-2 space-y-1">
                    <li>COMPASS Navigator - 프로젝트 수주 기회 탐색</li>
                    <li>COMPASS Cartographer - 시장 기회 분석 (2026 Q1 출시 예정)</li>
                    <li>COMPASS Captain - 프로젝트 관리 (2026 Q1 출시 예정)</li>
                    <li>COMPASS Harbor - 포트폴리오 관리 (2026 Q1 출시 예정)</li>
                  </ul>
                </li>
                <li>기타 회사가 정하는 서비스</li>
              </ul>
            </li>
            <li>
              회사는 기술적 사양의 변경 등의 이유로 서비스의 내용을 변경할 수 있으며, 변경 시 그 내용을 공지합니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제5조 (서비스의 중단)</h2>
          <ol className="space-y-4">
            <li>
              회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우 서비스 제공을 일시적으로 중단할 수 있습니다.
            </li>
            <li>
              제1항의 사유로 서비스 제공이 중단된 경우, 회사는 그 사유 및 기간을 사전에 공지합니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제6조 (결제 및 환불)</h2>
          <ol className="space-y-4">
            <li>
              서비스 이용료는 회사가 정한 금액에 따르며, 결제 방법은 <strong className="text-primary">신용카드, 계좌이체, 전자결제</strong> 등을 포함합니다.
            </li>
            <li>
              회사는 전자금융거래법 및 전자상거래법에 따라 <strong className="text-primary">토스페이먼츠</strong> 등의 결제대행사를 통해 결제 서비스를 제공합니다.
            </li>
            <li>
              환불 정책은 별도의 "환불정책" 페이지에서 확인할 수 있습니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제7조 (개인정보보호)</h2>
          <ol className="space-y-4">
            <li>
              회사는 이용자의 개인정보를 보호하기 위해 <strong className="text-primary">개인정보보호법</strong> 및 관련 법령을 준수합니다.
            </li>
            <li>
              개인정보의 수집, 이용, 제공 및 관리에 대한 자세한 사항은 별도의 "개인정보처리방침"에서 확인할 수 있습니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제8조 (회사의 의무)</h2>
          <ol className="space-y-4">
            <li>
              회사는 관련 법령과 이 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 계속적이고 안정적으로 서비스를 제공하기 위해 노력합니다.
            </li>
            <li>
              회사는 이용자의 개인정보 보호를 위해 보안시스템을 구축하고 개인정보보호정책을 공시하고 준수합니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제9조 (이용자의 의무)</h2>
          <ol className="space-y-4">
            <li>
              이용자는 다음 행위를 하여서는 안 됩니다:
              <ul className="mt-3 space-y-2">
                <li>신청 또는 변경 시 허위 내용의 등록</li>
                <li>타인의 정보 도용</li>
                <li>회사가 게시한 정보의 변경</li>
                <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
              </ul>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제10조 (저작권의 귀속 및 이용 제한)</h2>
          <ol className="space-y-4">
            <li>
              회사가 작성한 저작물에 대한 <strong className="text-primary">저작권 기타 지적재산권</strong>은 회사에 귀속합니다.
            </li>
            <li>
              이용자는 서비스를 이용함으로써 얻은 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리 목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제11조 (면책조항)</h2>
          <ol className="space-y-4">
            <li>
              회사는 <strong className="text-primary">천재지변 또는 이에 준하는 불가항력</strong>으로 인하여 서비스를 제공할 수 없는 경우 서비스 제공에 관한 책임이 면제됩니다.
            </li>
            <li>
              회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제12조 (분쟁 해결)</h2>
          <ol className="space-y-4">
            <li>
              회사와 이용자 간 발생한 분쟁에 관한 소송은 <strong className="text-primary">민사소송법상의 관할법원</strong>에 제기합니다.
            </li>
            <li>
              이 약관에 명시되지 않은 사항은 관련 법령 및 상관례에 따릅니다.
            </li>
          </ol>

          <hr className="my-8" />

          <div className="bg-muted/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">부칙</h3>
            <p>
              <strong>시행일</strong>: 이 약관은 2025년 11월 14일부터 시행합니다.
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
