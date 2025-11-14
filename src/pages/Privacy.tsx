/**
 * Privacy Policy Page
 *
 * 개인정보처리방침 페이지
 */

import { Helmet } from 'react-helmet-async'
import { PageLayout } from '@/components/layouts/PageLayout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>개인정보처리방침 - IDEA on Action</title>
        <meta
          name="description"
          content="IDEA on Action 개인정보처리방침입니다."
        />
      </Helmet>

      <PageLayout
        title="개인정보처리방침"
        description="IDEA on Action은 이용자의 개인정보를 소중히 다룹니다."
      >
        {/* 법률 검토 경고 */}
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>법률 전문가 검토 필수</AlertTitle>
          <AlertDescription>
            이 문서는 템플릿이며, 반드시 법률 전문가(변호사)의 검토를 받아야 합니다.
            개인정보보호법 위반 시 최대 5천만원의 과태료가 부과될 수 있습니다.
          </AlertDescription>
        </Alert>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground">
            <strong>시행일</strong>: 2025년 11월 14일
          </p>

          <p>
            IDEA on Action(이하 "회사")은 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」,
            「전자금융거래법」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록
            다음과 같이 개인정보 처리방침을 수립·공개합니다.
          </p>

          <h2>제1조 (개인정보의 수집 및 이용 목적)</h2>
          <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다:</p>
          <ol>
            <li>
              <strong>회원 가입 및 관리</strong>
              <ul>
                <li>회원 가입 의사 확인, 회원제 서비스 제공, 본인 식별 및 인증</li>
                <li>회원자격 유지·관리, 서비스 부정이용 방지</li>
              </ul>
            </li>
            <li>
              <strong>서비스 제공</strong>
              <ul>
                <li>AI 컨설팅, 웹 개발, 데이터 분석 등의 서비스 제공</li>
                <li>맞춤형 서비스 제공, 본인인증</li>
              </ul>
            </li>
            <li>
              <strong>결제 서비스 제공</strong>
              <ul>
                <li>서비스 이용료 결제, 결제 대금 정산</li>
                <li>전자금융거래 처리 및 기록 보관</li>
              </ul>
            </li>
            <li>
              <strong>마케팅 및 광고 활용</strong>
              <ul>
                <li>신규 서비스 개발 및 맞춤 서비스 제공</li>
                <li>이벤트 및 광고성 정보 제공 (뉴스레터 구독)</li>
              </ul>
            </li>
          </ol>

          <h2>제2조 (수집하는 개인정보의 항목)</h2>
          <p>회사는 다음과 같은 개인정보를 수집합니다:</p>

          <h3>1. 필수 수집 항목</h3>
          <ul>
            <li>
              <strong>회원 가입 시</strong>: 이메일, 이름, 비밀번호
            </li>
            <li>
              <strong>OAuth 로그인 시</strong>: 소셜 계정 정보 (Google, GitHub, Kakao 등)
            </li>
            <li>
              <strong>서비스 문의 시</strong>: 이름, 이메일, 회사명, 전화번호, 문의 내용
            </li>
          </ul>

          <h3>2. 결제 시 수집 항목</h3>
          <ul>
            <li>신용카드 정보 (카드번호 뒤 4자리, 승인번호)</li>
            <li>계좌 정보 (은행명, 계좌번호 일부)</li>
            <li>결제 거래 내역</li>
          </ul>

          <h3>3. 자동 수집 항목</h3>
          <ul>
            <li>IP 주소, 쿠키, 접속 기록, 서비스 이용 기록</li>
            <li>기기 정보 (OS, 브라우저 종류)</li>
          </ul>

          <h2>제3조 (개인정보의 보유 및 이용 기간)</h2>
          <ol>
            <li>
              <strong>회원 정보</strong>: 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우 해당 수사·조사 종료 시까지)
            </li>
            <li>
              <strong>전자상거래 기록</strong>:
              <ul>
                <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
                <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
                <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
              </ul>
            </li>
            <li>
              <strong>전자금융거래 기록</strong>: 5년 (전자금융거래법)
            </li>
            <li>
              <strong>통신비밀보호법</strong>: 3개월 (로그 기록)
            </li>
          </ol>

          <h2>제4조 (개인정보의 제3자 제공)</h2>
          <p>
            회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:
          </p>
          <ol>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ol>

          <h3>결제 대행사 (토스페이먼츠)</h3>
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

          <h2>제5조 (개인정보의 파기 절차 및 방법)</h2>
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

          <h2>제6조 (개인정보 처리의 위탁)</h2>
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

          <h2>제7조 (정보주체의 권리와 그 행사 방법)</h2>
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

          <h2>제8조 (개인정보 보호책임자)</h2>
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

          <h2>제9조 (개인정보의 안전성 확보 조치)</h2>
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

          <h2>제10조 (개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항)</h2>
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

          <h2>제11조 (개인정보처리방침의 변경)</h2>
          <p>
            이 개인정보처리방침은 2025년 11월 14일부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는
            변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
          </p>

          <hr className="my-8" />

          <div className="bg-muted/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">부칙</h3>
            <p>
              <strong>시행일</strong>: 이 개인정보처리방침은 2025년 11월 14일부터 시행합니다.
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
