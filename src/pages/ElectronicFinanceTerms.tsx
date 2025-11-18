/**
 * Electronic Finance Terms Page
 *
 * 전자금융거래 기본약관 페이지
 */

import { Helmet } from 'react-helmet-async'
import { PageLayout } from '@/components/layouts/PageLayout'

export default function ElectronicFinanceTerms() {
  return (
    <>
      <Helmet>
        <title>전자금융거래 기본약관 - 생각과 행동</title>
        <meta
          name="description"
          content="생각과 행동 (IDEA on Action) 전자금융거래 기본약관입니다."
        />
      </Helmet>

      <PageLayout
        title="전자금융거래 기본약관"
        description="전자금융거래법에 따른 전자결제 서비스 이용약관입니다."
      >

        <div className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
          <div className="bg-primary/10 border-l-4 border-primary px-6 py-3 mb-8 rounded-r-lg">
            <p className="text-sm font-semibold mb-0">
              <span className="text-primary">시행일</span>: 2025년 11월 14일
            </p>
          </div>

          <p className="leading-relaxed">
            생각과 행동(이하 "회사")은 <strong className="text-primary">「전자금융거래법」</strong>, <strong className="text-primary">「전자상거래 등에서의 소비자보호에 관한 법률」</strong>,
            <strong className="text-primary">「여신전문금융업법」</strong> 등 관련 법령을 준수하며, 전자금융거래 서비스 제공을 위하여 다음과 같이 약관을 제정합니다.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제1조 (목적)</h2>
          <p>
            이 약관은 회사가 제공하는 전자금융거래 서비스를 이용함에 있어 회사와 이용자 간의 권리·의무 및 책임사항,
            기타 필요한 사항을 정함을 목적으로 합니다.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제2조 (용어의 정의)</h2>
          <ol>
            <li>
              <strong>"전자금융거래"</strong>란 회사가 전자적 장치를 통하여 제공하는 금융상품 및 서비스를 이용자가 전자적 장치를 통하여 이용하는 거래를 말합니다.
            </li>
            <li>
              <strong>"이용자"</strong>란 전자금융거래를 위하여 회사와 체결한 계약에 따라 전자금융거래를 이용하는 자를 말합니다.
            </li>
            <li>
              <strong>"접근매체"</strong>란 전자금융거래에 있어서 거래지시를 하거나 이용자 및 거래내용의 진실성과 정확성을 확보하기 위하여 사용되는 수단 또는 정보로서 다음을 말합니다:
              <ul>
                <li>전자식 카드 및 이에 준하는 전자적 정보</li>
                <li>전자서명법에 따른 전자서명 생성정보 및 인증서</li>
                <li>회사에 등록된 이용자번호</li>
                <li>이용자의 생체정보</li>
                <li>상기 각 호에 준하는 수단 또는 정보</li>
              </ul>
            </li>
            <li>
              <strong>"거래지시"</strong>란 이용자가 약관에 의하여 체결되는 전자금융거래계약에 따라 회사에게 전자금융거래의 처리를 지시하는 것을 말합니다.
            </li>
            <li>
              <strong>"오류"</strong>란 이용자의 고의 또는 과실 없이 전자금융거래가 약관 또는 이용자의 거래지시에 따라 이행되지 아니한 경우를 말합니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제3조 (약관의 명시 및 변경)</h2>
          <ol>
            <li>
              회사는 이용자가 전자금융거래 서비스를 이용하기 전에 이 약관을 게시하고 이용자가 이 약관의 중요한 내용을 확인할 수 있도록 합니다.
            </li>
            <li>
              회사는 이용자의 요청이 있는 경우 전자문서의 전송방식에 의하여 본 약관의 사본을 이용자에게 교부합니다.
            </li>
            <li>
              회사가 약관을 변경하는 경우에는 그 시행일 1월 전에 변경되는 약관을 회사가 제공하는 전자금융거래 서비스 이용 초기화면 및 회사의 홈페이지에 게시함으로써 이용자에게 공지합니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제4조 (전자지급거래계약의 효력)</h2>
          <ol>
            <li>
              회사는 이용자의 거래지시가 전자금융거래에 관한 경우 그 거래지시에 따라 전자금융거래를 처리한 경우에는 그 거래지시가 이용자의 의사에 의한 것인지 여부를 확인할 필요가 없습니다.
            </li>
            <li>
              회사는 이용자로부터 접수한 거래지시가 다음 각 호의 어느 하나에 해당하는 경우에는 이를 거부하거나 취소할 수 있습니다:
              <ul>
                <li>이용자의 계좌잔액(이용한도 포함)이 거래지시한 금액보다 부족한 경우</li>
                <li>이용자가 회사와 미리 약정한 범위를 초과하는 경우</li>
                <li>기타 법령상 또는 회사가 정한 절차에 위배되는 경우</li>
              </ul>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제5조 (접근매체의 선정과 사용 및 관리)</h2>
          <ol>
            <li>
              회사는 전자금융거래 서비스 제공 시 접근매체를 선정하여 이용자의 신원, 권한 및 거래지시의 내용 등을 확인합니다.
            </li>
            <li>
              이용자는 접근매체를 제3자에게 대여하거나 사용을 위임하거나 양도 또는 담보 목적으로 제공할 수 없습니다.
            </li>
            <li>
              이용자는 자신의 접근매체를 제3자에게 누설 또는 노출하거나 방치하여서는 안 되며, 접근매체의 도용이나 위조 또는 변조를 방지하기 위하여 충분한 주의를 기울여야 합니다.
            </li>
            <li>
              회사는 이용자로부터 접근매체의 분실이나 도난 등의 통지를 받은 때에는 그 때부터 제3자가 그 접근매체를 사용함으로 인하여 이용자에게 발생한 손해를 배상할 책임이 있습니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제6조 (거래내용의 확인)</h2>
          <ol>
            <li>
              회사는 이용자가 전자금융거래의 내용을 추적, 검색하거나 그 내용에 오류가 있는 경우 이의를 제기할 수 있도록 다음의 기록을 생성하여 보존합니다:
              <ul>
                <li>거래계좌의 명칭 또는 번호</li>
                <li>거래의 종류 및 금액, 거래상대방을 나타내는 정보</li>
                <li>거래일시</li>
                <li>전자적 장치의 종류 및 전자적 장치를 식별할 수 있는 정보</li>
                <li>회사가 전자금융거래의 대가로 받은 수수료</li>
              </ul>
            </li>
            <li>
              이용자가 제1항의 규정에 의한 기록의 열람 및 제공을 요청하는 경우 회사는 이용자가 요청한 방법으로 제공합니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제7조 (오류의 정정 등)</h2>
          <ol>
            <li>
              이용자는 전자금융거래 서비스를 이용함에 있어 오류가 있음을 안 때에는 회사에 대하여 그 정정을 요구할 수 있습니다.
            </li>
            <li>
              회사는 전항의 규정에 따른 오류의 정정요구를 받은 때에는 이를 즉시 조사하여 처리한 후 정정요구를 받은 날부터 2주 이내에 그 결과를 이용자에게 알려 드립니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제8조 (전자금융거래 기록의 보존)</h2>
          <ol>
            <li>
              회사는 이용자가 전자금융거래의 내용을 추적·검색하거나 그 내용에 오류가 있는 경우에 이의를 제기할 수 있도록
              전자금융거래법 및 동법 시행령에서 정한 기간 동안 거래의 내용을 기록·보존합니다.
            </li>
            <li>
              제1항의 규정에 따라 회사가 보존하여야 하는 기록의 종류 및 보존방법은 제6조 제1항에서 정한 바에 따릅니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제9조 (전자금융거래정보의 제공금지)</h2>
          <p>
            회사는 전자금융거래 서비스를 제공함에 있어서 취득한 이용자의 인적사항, 이용자의 계좌, 접근매체 및 전자금융거래의 내용과 실적에 관한 정보 또는 자료를
            이용자의 동의를 얻지 아니하고 제3자에게 제공, 누설하거나 업무상 목적 외에 사용하지 아니합니다.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제10조 (분쟁처리 및 분쟁조정)</h2>
          <ol>
            <li>
              이용자는 다음의 분쟁처리 책임자 및 담당자에 대하여 전자금융거래 서비스 이용과 관련한 의견 및 불만의 제기, 손해배상의 청구 등의 분쟁처리를 요구할 수 있습니다:
              <div className="bg-muted/50 p-4 rounded-lg my-4">
                <p>
                  <strong>분쟁처리 책임자</strong>: 서민원
                </p>
                <p>
                  <strong>이메일</strong>: sinclair.seo@ideaonaction.ai
                </p>
                <p>
                  <strong>전화</strong>: 010-4904-2671
                </p>
              </div>
            </li>
            <li>
              이용자가 회사에 대하여 분쟁처리를 신청한 경우에는 회사는 15일 이내에 이에 대한 조사 또는 처리 결과를 이용자에게 안내합니다.
            </li>
            <li>
              이용자는 「금융위원회의 설치 등에 관한 법률」 제51조의 규정에 따른 금융감독원의 금융분쟁조정위원회나
              「소비자기본법」 제31조 제1항의 규정에 따른 한국소비자원에 전자금융거래 서비스의 이용과 관련한 분쟁조정을 신청할 수 있습니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제11조 (회사의 책임)</h2>
          <ol>
            <li>
              회사는 접근매체의 위조나 변조로 발생한 사고로 인하여 이용자에게 발생한 손해에 대하여 배상책임이 있습니다.
              다만 이용자가 제5조 제2항에 위반하거나 제3자가 권한 없이 이용자의 접근매체를 이용하여 전자금융거래를 할 수 있음을 알았거나 알 수 있었음에도 불구하고
              이용자가 자신의 접근매체를 누설 또는 노출하거나 방치한 경우 그 책임의 전부 또는 일부를 이용자가 부담하게 할 수 있습니다.
            </li>
            <li>
              회사는 계약체결 또는 거래지시의 전자적 전송이나 처리과정에서 발생한 사고로 인하여 이용자에게 그 손해가 발생한 경우에는 그 손해를 배상할 책임이 있습니다.
              다만, 천재지변, 전쟁 및 기타 이에 준하는 불가항력의 사유로 인하여 발생한 손해에 대해서는 그러하지 아니합니다.
            </li>
            <li>
              회사는 이용자로부터 접수한 거래지시의 내용을 확인할 수 있도록 다음의 정보를 이용자의 전자우편주소로 송부하거나 전자금융거래 서비스 이용 시 확인할 수 있도록 합니다:
              <ul>
                <li>거래종류</li>
                <li>거래금액</li>
                <li>거래일시</li>
              </ul>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제12조 (이용자의 책임)</h2>
          <ol>
            <li>
              이용자는 접근매체를 사용함에 있어서 다음 각 호의 행위를 하여서는 안 됩니다:
              <ul>
                <li>접근매체를 양도, 양수하거나 질권 설정의 목적으로 제공하는 행위</li>
                <li>접근매체를 대여하거나 사용을 위임하는 행위</li>
                <li>접근매체를 제3자에게 누설 또는 노출하거나 방치하는 행위</li>
              </ul>
            </li>
            <li>
              이용자는 자신의 접근매체를 제3자에게 누설 또는 노출하거나 방치하여서는 안 되며, 접근매체의 도용이나 위조 또는 변조를 방지하기 위하여 충분한 주의를 기울여야 합니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제13조 (결제대행 서비스)</h2>
          <ol>
            <li>
              회사는 전자금융거래의 처리를 위하여 다음의 결제대행사(PG사)를 이용합니다:
              <div className="bg-muted/50 p-4 rounded-lg my-4">
                <p>
                  <strong>결제대행사</strong>: 토스페이먼츠 (주식회사 비바리퍼블리카)
                </p>
                <p>
                  <strong>대표전화</strong>: 1544-7772
                </p>
                <p>
                  <strong>이메일</strong>: support@tosspayments.com
                </p>
                <p>
                  <strong>약관</strong>: https://www.tosspayments.com/terms
                </p>
              </div>
            </li>
            <li>
              결제대행사를 통한 전자금융거래의 경우, 결제대행사의 전자금융거래 이용약관이 함께 적용됩니다.
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-12 mb-6 pb-3 border-b-2 border-primary/30">제14조 (약관 외 준칙 및 관할)</h2>
          <ol>
            <li>
              이 약관에서 정하지 아니한 사항에 대하여는 전자금융거래법, 전자상거래 등에서의 소비자보호에 관한 법률,
              통신판매에 관한 법률, 여신전문금융업법 등 소비자보호 관련 법령에서 정한 바에 따릅니다.
            </li>
            <li>
              회사와 이용자간에 발생한 분쟁에 관한 관할은 민사소송법에서 정한 바에 따릅니다.
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
