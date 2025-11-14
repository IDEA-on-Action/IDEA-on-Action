/**
 * Terms of Service Page
 *
 * 이용약관 페이지
 */

import { Helmet } from 'react-helmet-async'
import { PageLayout } from '@/components/layouts/PageLayout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export default function Terms() {
  return (
    <>
      <Helmet>
        <title>이용약관 - IDEA on Action</title>
        <meta name="description" content="IDEA on Action 서비스 이용약관입니다." />
      </Helmet>

      <PageLayout
        title="이용약관"
        description="IDEA on Action 서비스 이용약관입니다."
      >
        {/* 법률 검토 경고 */}
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>법률 전문가 검토 필수</AlertTitle>
          <AlertDescription>
            이 문서는 템플릿이며, 반드시 법률 전문가(변호사)의 검토를 받아야 합니다.
            각 기업의 비즈니스 모델과 데이터 처리 방식에 맞춰 수정되어야 합니다.
          </AlertDescription>
        </Alert>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground">
            <strong>시행일</strong>: 2025년 1월 14일
          </p>

          <h2>제1조 (목적)</h2>
          <p>
            이 약관은 IDEA on Action(이하 "회사")이 제공하는 웹사이트 및 관련 서비스(이하 "서비스")의 이용과 관련하여
            회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>

          <h2>제2조 (정의)</h2>
          <ol>
            <li>
              <strong>"서비스"</strong>란 회사가 제공하는 AI 컨설팅, 웹 개발, 데이터 분석 등의 온라인 서비스를 의미합니다.
            </li>
            <li>
              <strong>"이용자"</strong>란 이 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 의미합니다.
            </li>
            <li>
              <strong>"회원"</strong>이란 회사와 서비스 이용계약을 체결하고 이용자 아이디(ID)를 부여받은 자를 의미합니다.
            </li>
          </ol>

          <h2>제3조 (약관의 명시, 효력 및 변경)</h2>
          <ol>
            <li>
              회사는 이 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
            </li>
            <li>
              회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
            </li>
            <li>
              약관을 개정할 경우, 적용일자 및 개정사유를 명시하여 현행 약관과 함께 그 적용일자 7일 전부터 적용일자 전일까지 공지합니다.
            </li>
          </ol>

          <h2>제4조 (서비스의 제공 및 변경)</h2>
          <ol>
            <li>
              회사는 다음과 같은 서비스를 제공합니다:
              <ul>
                <li>AI 컨설팅 서비스</li>
                <li>웹사이트 및 애플리케이션 개발</li>
                <li>데이터 분석 및 자동화 솔루션</li>
                <li>기타 회사가 정하는 서비스</li>
              </ul>
            </li>
            <li>
              회사는 기술적 사양의 변경 등의 이유로 서비스의 내용을 변경할 수 있으며, 변경 시 그 내용을 공지합니다.
            </li>
          </ol>

          <h2>제5조 (서비스의 중단)</h2>
          <ol>
            <li>
              회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우 서비스 제공을 일시적으로 중단할 수 있습니다.
            </li>
            <li>
              제1항의 사유로 서비스 제공이 중단된 경우, 회사는 그 사유 및 기간을 사전에 공지합니다.
            </li>
          </ol>

          <h2>제6조 (결제 및 환불)</h2>
          <ol>
            <li>
              서비스 이용료는 회사가 정한 금액에 따르며, 결제 방법은 신용카드, 계좌이체, 전자결제 등을 포함합니다.
            </li>
            <li>
              회사는 전자금융거래법 및 전자상거래법에 따라 토스페이먼츠 등의 결제대행사를 통해 결제 서비스를 제공합니다.
            </li>
            <li>
              환불 정책은 별도의 "환불정책" 페이지에서 확인할 수 있습니다.
            </li>
          </ol>

          <h2>제7조 (개인정보보호)</h2>
          <ol>
            <li>
              회사는 이용자의 개인정보를 보호하기 위해 개인정보보호법 및 관련 법령을 준수합니다.
            </li>
            <li>
              개인정보의 수집, 이용, 제공 및 관리에 대한 자세한 사항은 별도의 "개인정보처리방침"에서 확인할 수 있습니다.
            </li>
          </ol>

          <h2>제8조 (회사의 의무)</h2>
          <ol>
            <li>
              회사는 관련 법령과 이 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 계속적이고 안정적으로 서비스를 제공하기 위해 노력합니다.
            </li>
            <li>
              회사는 이용자의 개인정보 보호를 위해 보안시스템을 구축하고 개인정보보호정책을 공시하고 준수합니다.
            </li>
          </ol>

          <h2>제9조 (이용자의 의무)</h2>
          <ol>
            <li>
              이용자는 다음 행위를 하여서는 안 됩니다:
              <ul>
                <li>신청 또는 변경 시 허위 내용의 등록</li>
                <li>타인의 정보 도용</li>
                <li>회사가 게시한 정보의 변경</li>
                <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
              </ul>
            </li>
          </ol>

          <h2>제10조 (저작권의 귀속 및 이용 제한)</h2>
          <ol>
            <li>
              회사가 작성한 저작물에 대한 저작권 기타 지적재산권은 회사에 귀속합니다.
            </li>
            <li>
              이용자는 서비스를 이용함으로써 얻은 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리 목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.
            </li>
          </ol>

          <h2>제11조 (면책조항)</h2>
          <ol>
            <li>
              회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우 서비스 제공에 관한 책임이 면제됩니다.
            </li>
            <li>
              회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.
            </li>
          </ol>

          <h2>제12조 (분쟁 해결)</h2>
          <ol>
            <li>
              회사와 이용자 간 발생한 분쟁에 관한 소송은 민사소송법상의 관할법원에 제기합니다.
            </li>
            <li>
              이 약관에 명시되지 않은 사항은 관련 법령 및 상관례에 따릅니다.
            </li>
          </ol>

          <hr className="my-8" />

          <div className="bg-muted/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">부칙</h3>
            <p>
              <strong>시행일</strong>: 이 약관은 2025년 1월 14일부터 시행합니다.
            </p>
          </div>

          <div className="mt-8 text-sm text-muted-foreground">
            <p>
              <strong>사업자 정보</strong>
            </p>
            <p>상호: IDEA on Action (생각과행동)</p>
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
