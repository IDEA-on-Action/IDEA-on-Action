/**
 * Refund Policy Page
 *
 * 환불정책 페이지
 */

import { Helmet } from 'react-helmet-async'
import { PageLayout } from '@/components/layouts/PageLayout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2 } from 'lucide-react'

export default function RefundPolicy() {
  return (
    <>
      <Helmet>
        <title>환불정책 - 생각과 행동</title>
        <meta name="description" content="생각과 행동 (IDEA on Action) 환불정책입니다." />
      </Helmet>

      <PageLayout
        title="환불정책"
        description="서비스 이용 취소 및 환불에 관한 정책입니다."
      >

        <div className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
          <div className="bg-primary/10 border-l-4 border-primary px-6 py-3 mb-8 rounded-r-lg">
            <p className="text-sm font-semibold mb-0">
              <span className="text-primary">시행일</span>: 2025년 11월 14일
            </p>
          </div>

          <p className="leading-relaxed">
            생각과 행동(이하 "회사")은 <strong className="text-primary">「전자상거래 등에서의 소비자보호에 관한 법률」</strong> 및 <strong className="text-primary">「소비자기본법」</strong>을 준수하며,
            고객의 청약철회 및 환불에 관한 사항을 다음과 같이 규정합니다.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제1조 (청약철회)</h2>
          <ol>
            <li>
              고객은 서비스 이용 계약을 체결한 날로부터 <strong>7일 이내</strong>에 청약을 철회할 수 있습니다.
            </li>
            <li>
              다만, 다음 각 호의 경우에는 청약철회가 제한될 수 있습니다:
              <ul>
                <li>서비스 제공이 개시된 경우 (단, 무료 체험 기간 제외)</li>
                <li>고객의 주문에 따라 개별적으로 제작된 서비스의 경우</li>
                <li>시간이 지나 다시 판매하기 곤란할 정도로 서비스의 가치가 현저히 감소한 경우</li>
              </ul>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제2조 (청약철회 방법)</h2>
          <ol>
            <li>
              청약철회는 다음의 방법으로 신청할 수 있습니다:
              <ul>
                <li>
                  <strong>이메일</strong>: sinclair.seo@ideaonaction.ai
                </li>
                <li>
                  <strong>전화</strong>: 010-4904-2671
                </li>
                <li>
                  <strong>웹사이트</strong>: Work with Us 페이지를 통한 문의
                </li>
              </ul>
            </li>
            <li>
              청약철회 신청 시 다음 정보를 포함해야 합니다:
              <ul>
                <li>주문번호 또는 결제 거래번호</li>
                <li>주문자 이름 및 연락처</li>
                <li>청약철회 사유</li>
              </ul>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제3조 (비회원 구매 시 청약철회 및 본인확인)</h2>
          <ol>
            <li>
              비회원으로 서비스를 구매한 경우에도 제1조 및 제2조에 따라 청약철회를 신청할 수 있습니다.
            </li>
            <li>
              비회원의 청약철회 신청 시 다음의 정보를 통해 본인 확인을 진행합니다:
              <ul>
                <li>주문번호 또는 결제 거래번호</li>
                <li>결제 시 입력한 이메일 주소</li>
                <li>결제 시 입력한 전화번호 (마지막 4자리)</li>
              </ul>
            </li>
            <li>
              비회원 구매 시 입력한 이메일로 주문 확인서가 발송되며, 해당 이메일을 통해 청약철회를 신청할 수 있습니다.
            </li>
            <li>
              정기결제(구독) 서비스의 경우, 비회원도 회원과 동일한 환불 정책이 적용됩니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제4조 (환불 절차 및 기간)</h2>
          <ol>
            <li>
              회사는 청약철회 신청을 접수한 날로부터 <strong>영업일 기준 3일 이내</strong>에 환불을 처리합니다.
            </li>
            <li>
              환불 방법은 결제 수단에 따라 다음과 같이 처리됩니다:
              <ul>
                <li>
                  <strong>신용카드</strong>: 카드사 승인 취소 (카드사 정산 일정에 따라 2~7일 소요)
                </li>
                <li>
                  <strong>계좌이체</strong>: 고객이 지정한 계좌로 환불 (영업일 기준 3일 이내)
                </li>
                <li>
                  <strong>토스페이먼츠</strong>: 결제 수단에 따라 자동 환불 처리
                </li>
              </ul>
            </li>
            <li>
              환불 시 발생하는 수수료는 다음과 같이 부담합니다:
              <ul>
                <li>회사의 귀책사유로 인한 청약철회: 회사 부담</li>
                <li>고객의 단순 변심으로 인한 청약철회: 고객 부담</li>
              </ul>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제5조 (서비스별 환불 규정)</h2>

          <h3 className="text-xl font-semibold mt-8 mb-4 text-primary">1. 개발 서비스 (MVP / 풀스택 / 디자인 시스템)</h3>
          <Alert className="my-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>환불 가능</AlertTitle>
            <AlertDescription>
              계약 체결 전: 100% 환불
              <br />
              착수 전: 착수금 100% 환불
              <br />
              기획 단계 (0-25%): 착수금 제외 금액의 90% 환불
              <br />
              개발 단계 (25-75%): 진행률에 따라 차등 환불 (양 당사자 협의)
              <br />
              완료 단계 (75-100%): 환불 불가 (단, 계약 내용 미이행 시 제외)
            </AlertDescription>
          </Alert>

          <h3 className="text-xl font-semibold mt-8 mb-4 text-primary">2. 시스템 운영 관리 서비스</h3>
          <Alert className="my-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>환불 가능</AlertTitle>
            <AlertDescription>
              <strong>월 구독형</strong>
              <br />
              서비스 시작 전: 전액 환불
              <br />
              서비스 시작 후 7일 이내: 전액 환불
              <br />
              7일 경과 후: 당월 환불 불가, 익월부터 해지
              <br />
              <br />
              <strong>연간 계약</strong>
              <br />
              3개월 이내: 80% 환불 | 6개월 이내: 50% 환불 | 6개월 경과: 환불 불가
              <br />
              <br />
              <strong>SLA 위반 시</strong>: 월 이용료 일부 크레딧 보상
            </AlertDescription>
          </Alert>

          <h3 className="text-xl font-semibold mt-8 mb-4 text-primary">3. COMPASS Navigator (월 구독)</h3>
          <Alert className="my-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>환불 가능</AlertTitle>
            <AlertDescription>
              무료 체험 기간 중: 과금 없음
              <br />
              결제 후 7일 이내: 100% 환불
              <br />
              결제 후 7일 경과: 당월 환불 불가, 익월부터 자동 해지
            </AlertDescription>
          </Alert>

          <h3 className="text-xl font-semibold mt-8 mb-4 text-primary">4. COMPASS 플랫폼 (연간 구독)</h3>
          <Alert className="my-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>환불 가능</AlertTitle>
            <AlertDescription>
              구독 시작 후 30일 이내: 전액 환불
              <br />
              30일 경과 후: 사용하지 않은 개월 수만큼 비례 환불
              <br />
              <br />
              <strong>환불 계산 예시</strong>: 연간 구독료 ₩1,200,000 (월 ₩100,000 × 12개월), 4개월 사용 후 해지 시 환불 금액 = ₩100,000 × 8개월 = ₩800,000
              <br />
              <br />
              <strong>SLA 미달 시 보상</strong>
              <br />
              1시간 미만: 보상 없음 | 1-4시간: 당월 이용료 10% 크레딧
              <br />
              4-24시간: 25% 크레딧 | 24시간 이상: 50% 크레딧
            </AlertDescription>
          </Alert>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제6조 (환불 불가 사유)</h2>
          <p>다음의 경우에는 환불이 불가능합니다:</p>
          <ol>
            <li>고객의 책임 있는 사유로 서비스가 훼손된 경우</li>
            <li>서비스 이용으로 고객에게 경제적 이익이 발생한 경우</li>
            <li>복제가 가능한 서비스의 경우 그 원본을 훼손한 경우</li>
            <li>시간이 지나 다시 판매하기 곤란할 정도로 서비스의 가치가 현저히 감소한 경우</li>
            <li>계약서에 명시된 환불 불가 조항에 해당하는 경우</li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제7조 (부분 환불)</h2>
          <ol>
            <li>
              서비스가 부분적으로 제공된 경우, 제공된 서비스에 대한 대가를 공제한 금액을 환불합니다.
            </li>
            <li>
              부분 환불 금액은 다음과 같이 계산됩니다:
              <div className="bg-muted/50 p-4 rounded-lg my-4">
                <p className="font-mono text-sm">
                  환불 금액 = 총 결제 금액 - (총 결제 금액 × 서비스 제공률) - 환불 수수료
                </p>
              </div>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제8조 (환불 지연 시 지연이자)</h2>
          <ol>
            <li>
              회사가 환불 기한 내에 환불하지 못한 경우, 지연된 기간에 대하여 연 15%의 지연이자를 지급합니다.
            </li>
            <li>
              지연이자는 다음과 같이 계산됩니다:
              <div className="bg-muted/50 p-4 rounded-lg my-4">
                <p className="font-mono text-sm">
                  지연이자 = 환불 금액 × (지연 일수 / 365) × 15%
                </p>
              </div>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제9조 (분쟁 해결)</h2>
          <ol>
            <li>
              환불과 관련하여 분쟁이 발생한 경우, 고객은 한국소비자원, 전자거래분쟁조정위원회 등에 분쟁조정을 신청할 수 있습니다.
            </li>
            <li>
              <strong>한국소비자원</strong>: 국번 없이 1372
            </li>
            <li>
              <strong>전자거래분쟁조정위원회</strong>: www.ecmc.or.kr
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제10조 (환불정책의 변경)</h2>
          <p>
            이 환불정책은 2025년 11월 14일부터 적용되며, 법령 및 정책에 따른 변경사항이 있는 경우에는
            변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
          </p>

          <hr className="my-8" />

          <div className="bg-muted/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">부칙</h3>
            <p>
              <strong>시행일</strong>: 이 환불정책은 2025년 11월 14일부터 시행합니다.
            </p>
          </div>

          <div className="mt-8 text-sm text-muted-foreground">
            <p>
              <strong>환불 문의</strong>
            </p>
            <p>이메일: sinclair.seo@ideaonaction.ai</p>
            <p>전화: 010-4904-2671</p>
            <p>
              <strong>사업자 정보</strong>
            </p>
            <p>상호: 생각과 행동 (IDEA on Action)</p>
            <p>대표자: 서민원</p>
            <p>사업자등록번호: 537-05-01511</p>
            <p>주소: 경기도 시흥시 대은로104번길 11 (은행동, 우남아파트) 103동 601호</p>
          </div>
        </div>
      </PageLayout>
    </>
  )
}
