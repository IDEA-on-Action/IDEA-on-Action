import { Helmet } from "react-helmet-async";
import { Target, Eye, Heart, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageLayout, HeroSection, Section } from "@/components/layouts";
import { generatePersonSchema, injectJsonLd } from "@/lib/json-ld";

const About = () => {
  const mission = {
    icon: Target,
    title: "Mission",
    subtitle: "우리의 사명",
    content: "생각을 멈추지 않고, 행동으로 옮기는 회사. 아이디어가 현실이 되는 과정을 함께 만들어갑니다."
  };

  const vision = {
    icon: Eye,
    title: "Vision",
    subtitle: "우리의 비전",
    content: "아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오. 혼자가 아닌 함께 만드는 혁신의 플랫폼이 되겠습니다."
  };

  const values = [
    {
      icon: Heart,
      title: "열정 (Passion)",
      description: "매일 깨어있는 마음으로 새로운 도전을 즐깁니다. KEEP AWAKE, LIVE PASSIONATE."
    },
    {
      icon: Users,
      title: "협업 (Collaboration)",
      description: "혼자보다 함께가 더 멀리 갑니다. 오픈 소스 정신으로 지식과 경험을 공유합니다."
    },
    {
      icon: Target,
      title: "실행력 (Execution)",
      description: "완벽한 계획보다 빠른 실행과 반복적인 개선을 중시합니다. MVP부터 시작합니다."
    },
    {
      icon: Eye,
      title: "투명성 (Transparency)",
      description: "진행 과정, 실패, 성공을 모두 공개합니다. 오픈 메트릭스로 활동을 공유합니다."
    }
  ];

  const team = {
    founder: {
      name: "서민원",
      role: "Founder & CEO",
      bio: "생각과 행동 사이의 간극을 줄이는 것이 목표입니다. 스타트업 창업자이자 풀스택 개발자로, 아이디어를 직접 구현하는 것을 즐깁니다.",
      email: "sinclair.seo@ideaonaction.ai",
      github: "https://github.com/IDEA-on-Action"
    }
  };

  return (
    <>
      <Helmet>
        <title>회사 소개 - IDEA on Action</title>
        <meta
          name="description"
          content="생각을 멈추지 않고, 행동으로 옮기는 회사. 아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오, IDEA on Action을 소개합니다."
        />
        <meta property="og:title" content="회사 소개 - IDEA on Action" />
        <meta property="og:description" content="아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오" />
        <meta property="og:type" content="website" />

        {/* JSON-LD Structured Data - Person */}
        <script type="application/ld+json">
          {injectJsonLd(generatePersonSchema())}
        </script>
      </Helmet>

      <PageLayout>
        <HeroSection
          title={
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-fade-in">
              IDEA on Action
            </span>
          }
          description={
            <>
              <p className="text-xl md:text-2xl text-muted-foreground mb-2">
                생각과행동
              </p>
              <p className="text-lg md:text-xl text-foreground/80">
                아이디어가 현실이 되는 과정을 함께 만들어갑니다
              </p>
            </>
          }
        />

        <Section maxWidth="4xl">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Mission */}
              <Card className="glass-card p-8 space-y-4 hover-lift">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <mission.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{mission.title}</h2>
                    <p className="text-sm text-muted-foreground">{mission.subtitle}</p>
                  </div>
                </div>
                <p className="text-lg text-foreground/80 leading-relaxed">
                  {mission.content}
                </p>
              </Card>

              {/* Vision */}
              <Card className="glass-card p-8 space-y-4 hover-lift">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                    <vision.icon className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{vision.title}</h2>
                    <p className="text-sm text-muted-foreground">{vision.subtitle}</p>
                  </div>
                </div>
                <p className="text-lg text-foreground/80 leading-relaxed">
                  {vision.content}
                </p>
              </Card>
            </div>
        </Section>

        <Section variant="muted">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Core Values</h2>
              <p className="text-lg text-muted-foreground">우리가 중요하게 생각하는 가치들</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <Card
                  key={index}
                  className="glass-card p-6 space-y-4 hover-lift"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{value.title}</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    {value.description}
                  </p>
                </Card>
              ))}
            </div>
        </Section>

        <Section maxWidth="4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Team</h2>
              <p className="text-lg text-muted-foreground">함께 만들어가는 사람들</p>
            </div>

            <Card className="glass-card p-8 max-w-2xl mx-auto">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto flex items-center justify-center text-3xl font-bold text-white">
                  서
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{team.founder.name}</h3>
                  <p className="text-muted-foreground">{team.founder.role}</p>
                </div>
                <p className="text-foreground/80 leading-relaxed">
                  {team.founder.bio}
                </p>
                <div className="flex items-center justify-center gap-4 pt-4">
                  <a
                    href={`mailto:${team.founder.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {team.founder.email}
                  </a>
                  <span className="text-muted-foreground">•</span>
                  <a
                    href={team.founder.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </Card>
        </Section>

        <Section variant="gradient" maxWidth="4xl">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">함께 만들어갈 준비가 되셨나요?</h2>
            <p className="text-lg text-foreground/80">
              아이디어가 있다면, 지금 바로 시작하세요.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="/work-with-us"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
              >
                협업 제안하기
              </a>
              <a
                href="/lab"
                className="px-6 py-3 glass-card rounded-md hover:bg-muted/50 transition-colors font-semibold"
              >
                바운티 둘러보기
              </a>
            </div>
          </div>
        </Section>
      </PageLayout>
    </>
  );
};

export default About;
