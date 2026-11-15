import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLayout, Section } from "@/components/layouts";
import {
  getCaseStudyBySlug,
  CASE_CATEGORY_LABELS,
  CASE_SECTION_DESCRIPTIONS,
  CASE_SECTION_LABELS,
  CASE_STAGE_LABELS,
} from "@/data/case-studies";

const CaseStudyDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const item = slug ? getCaseStudyBySlug(slug) : undefined;

  if (!item) {
    return (
      <PageLayout>
        <Section maxWidth="4xl">
          <Card className="glass-card p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold">사례를 찾을 수 없습니다</h1>
            <p className="text-muted-foreground">주소가 바뀌었거나 없는 사례입니다.</p>
            <Link to="/cases">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                수행 사례 목록으로
              </Button>
            </Link>
          </Card>
        </Section>
      </PageLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${item.title} - 수행 사례 - IDEA on Action`}</title>
        <meta name="description" content={item.summary} />
        <meta property="og:title" content={`${item.title} - IDEA on Action`} />
        <meta property="og:description" content={item.summary} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://www.ideaonaction.ai/cases/${item.slug}`} />
      </Helmet>

      <PageLayout>
        <Section maxWidth="4xl">
          <Link
            to="/cases"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            수행 사례 목록으로
          </Link>

          <div className="space-y-4 mb-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{CASE_SECTION_LABELS[item.section]}</Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {CASE_STAGE_LABELS[item.stage]}
          </Badge>
              <Badge variant="outline">{CASE_CATEGORY_LABELS[item.category]}</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">{item.title}</h1>
            <p className="text-lg text-muted-foreground">{item.summary}</p>
            {item.section === "career" && (
              <p className="text-sm text-muted-foreground">{CASE_SECTION_DESCRIPTIONS.career}</p>
            )}
          </div>

          <Card className="glass-card p-6 mb-8">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-muted-foreground">수행 단계</dt>
                <dd className="font-semibold">{item.stageNote}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">역할</dt>
                <dd className="font-semibold">{item.role}</dd>
              </div>
              {item.period && (
                <div>
                  <dt className="text-sm text-muted-foreground">수행 시기</dt>
                  <dd className="font-semibold">{item.period}</dd>
                </div>
              )}
            </dl>
          </Card>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-3">과제</h2>
              <p className="text-muted-foreground leading-relaxed">{item.challenge}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">한 일과 결과</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                {item.highlights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>

            {item.tech && item.tech.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-3">사용 기술</h2>
                <div className="flex flex-wrap gap-2">
                  {item.tech.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
          </div>

          <Card className="glass-card p-8 mt-12 text-center space-y-4">
            <h2 className="text-xl font-bold">비슷한 과업을 준비하고 계신가요?</h2>
            <p className="text-muted-foreground">이 사례를 참고해서 문의를 남겨 주시면 빠르게 답변드리겠습니다.</p>
            <Link to={`/connect/inquiry?case=${item.slug}`}>
              <Button size="lg" className="gap-2 bg-gradient-primary hover:opacity-90">
                이 사례로 문의하기
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </Card>
        </Section>
      </PageLayout>
    </>
  );
};

export default CaseStudyDetail;
