import { Helmet } from "react-helmet-async";
import { useEffect } from "react";
import { MessageCircle, Heart, TrendingUp, Users, Globe } from "lucide-react";
import { PageLayout, HeroSection, Section } from "@/components/layouts";
import { GiscusComments } from "@/components/community/GiscusComments";
import { analytics } from "@/lib/analytics";

const Community = () => {
  // GA4: 커뮤니티 페이지 조회 이벤트
  useEffect(() => {
    analytics.joinCommunity("view");
  }, []);

  return (
    <>
      <Helmet>
        <title>커뮤니티 - Community - IDEA on Action</title>
        <meta
          name="description"
          content="IDEA on Action 커뮤니티에 참여하세요. 함께 배우고, 나누고, 성장합니다."
        />
        <meta property="og:title" content="커뮤니티 - IDEA on Action" />
        <meta property="og:description" content="함께 배우고, 나누고, 성장하는 커뮤니티" />
        <meta property="og:type" content="website" />
      </Helmet>

      <PageLayout>
        <HeroSection
          badge={{ icon: Users, text: "Together We Build" }}
          title="커뮤니티"
          description="함께 배우고, 나누고, 성장합니다"
        />

        {/* Features */}
        <Section maxWidth="4xl">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold">실시간 토론</h3>
              <p className="text-sm text-muted-foreground">
                프로젝트에 대한 의견을 자유롭게 나눠보세요
              </p>
            </div>
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
                <Heart className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-bold">피드백</h3>
              <p className="text-sm text-muted-foreground">
                건설적인 피드백으로 함께 개선해나갑니다
              </p>
            </div>
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-bold">성장</h3>
              <p className="text-sm text-muted-foreground">
                서로의 경험을 공유하며 성장합니다
              </p>
            </div>
          </div>
        </Section>

        {/* Giscus Comments */}
        <Section variant="muted" maxWidth="4xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">커뮤니티 토론</h2>
            <p className="text-muted-foreground">
              GitHub 계정으로 로그인하여 자유롭게 의견을 나눠보세요
            </p>
          </div>
          <GiscusComments
            repo="IDEA-on-Action/idea-on-action"
            repoId="R_kgDOQBAuJw"
            category="General"
            categoryId="DIC_kwDOQBAuJ84CxmNK"
            mapping="pathname"
          />
        </Section>

        {/* Contact Section */}
        <Section maxWidth="4xl">
          <div className="text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold">다른 방법으로 연결하기</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              GitHub Discussions나 이메일로도 연락하실 수 있습니다
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <a
                href="https://github.com/IDEA-on-Action/idea-on-action/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors font-medium"
              >
                <Globe className="w-4 h-4" />
                GitHub Discussions
              </a>
              <a
                href="mailto:sinclair.seo@ideaonaction.ai"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                이메일 보내기
              </a>
            </div>
          </div>
        </Section>
      </PageLayout>
    </>
  );
};

export default Community;
