import { Helmet } from "react-helmet-async";
import { Target, Eye, Heart, Users, Calendar, Briefcase, Mail, Github } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageLayout, HeroSection, Section } from "@/components/layouts";
import { NextStepsCTA } from "@/components/common/NextStepsCTA";
import { TeamMemberHoverCard } from "@/components/team/TeamMemberHoverCard";
import { useActiveTeamMembers } from "@/hooks/useTeamMembers";
import { generatePersonSchema, injectJsonLd } from "@/lib/json-ld";

const About = () => {
  // Fetch active team members from database
  const { data: teamMembers = [], isLoading: isLoadingTeam } = useActiveTeamMembers();

  const mission = {
    icon: Target,
    title: "Mission",
    subtitle: "함께하는 사명",
    content: "우리는 생각을 멈추지 않고, 행동으로 옮기는 회사입니다. 아이디어가 현실이 되는 과정을 여러분과 함께 만들어갑니다."
  };

  const vision = {
    icon: Eye,
    title: "Vision",
    subtitle: "함께 그리는 미래",
    content: "아이디어 실험실이자 커뮤니티형 프로덕트 스튜디오. 혼자가 아닌 함께 만드는 혁신의 플랫폼으로, 모든 참여자가 성장하는 생태계를 만듭니다."
  };

  const values = [
    {
      icon: Heart,
      title: "열정 (Passion)",
      description: "매일 깨어있는 마음으로 새로운 도전을 즐깁니다. KEEP AWAKE, LIVE PASSIONATE. 우리의 열정은 커뮤니티와 함께 더 뜨겁게 타오릅니다."
    },
    {
      icon: Users,
      title: "협업 (Collaboration)",
      description: "혼자보다 함께가 더 멀리 갑니다. 오픈 소스 정신으로 지식과 경험을 공유하며, 누구나 참여하고 기여할 수 있는 환경을 만듭니다."
    },
    {
      icon: Target,
      title: "실행력 (Execution)",
      description: "완벽한 계획보다 빠른 실행과 반복적인 개선을 중시합니다. MVP부터 시작하며, 커뮤니티 피드백을 통해 함께 성장합니다."
    },
    {
      icon: Eye,
      title: "투명성 (Transparency)",
      description: "진행 과정, 실패, 성공을 모두 공개합니다. 오픈 메트릭스로 활동을 공유하며, 모든 참여자가 함께 배우고 성장할 수 있도록 합니다."
    }
  ];

  // Helper to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Helmet>
        <title>회사 소개 - IDEA on Action</title>
        <meta
          name="description"
          content="생각을 멈추지 않고, 행동으로 옮기는 회사. 아이디어가 현실이 되는 과정을 여러분과 함께 만들어가는 커뮤니티형 프로덕트 스튜디오입니다."
        />
        <meta property="og:title" content="회사 소개 - IDEA on Action" />
        <meta property="og:description" content="함께 만드는 혁신의 플랫폼, 모든 참여자가 성장하는 커뮤니티" />
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
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Community Leaders</h2>
              <p className="text-lg text-muted-foreground">커뮤니티를 이끌어가는 사람들</p>
            </div>

            {isLoadingTeam ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading team members...</p>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No team members found.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamMembers.map((member, index) => (
                  <Card
                    key={member.id}
                    className="glass-card p-6 space-y-4 hover-lift"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      {/* Avatar */}
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={member.avatar || undefined} alt={member.name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl font-bold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name with HoverCard */}
                      <div>
                        <TeamMemberHoverCard member={member}>
                          <h3 className="text-xl font-bold hover:underline cursor-help">
                            {member.name}
                          </h3>
                        </TeamMemberHoverCard>
                        <p className="text-sm text-muted-foreground mt-1">{member.role}</p>
                      </div>

                      {/* Bio (truncated) */}
                      {member.bio && (
                        <p className="text-sm text-foreground/70 line-clamp-3 leading-relaxed">
                          {member.bio}
                        </p>
                      )}

                      {/* Skills (first 3) */}
                      {member.skills && member.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center">
                          {member.skills.slice(0, 3).map((skill, skillIndex) => (
                            <span
                              key={skillIndex}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                            >
                              {skill}
                            </span>
                          ))}
                          {member.skills.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                              +{member.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Contact Links */}
                      <div className="flex items-center gap-3 pt-2">
                        {member.email && (
                          <a
                            href={`mailto:${member.email}`}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            aria-label={`Email ${member.name}`}
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        )}
                        {member.socialLinks?.github && (
                          <a
                            href={member.socialLinks.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            aria-label={`${member.name}'s GitHub`}
                          >
                            <Github className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
        </Section>

        <NextStepsCTA
          title="다음 단계가 궁금하신가요?"
          description="우리의 계획과 실제 결과물을 확인하세요"
          primaryCTA={{
            label: "로드맵 보기",
            href: "/roadmap",
            icon: Calendar,
            description: "우리의 계획과 진행 상황을 투명하게 공유합니다"
          }}
          secondaryCTA={{
            label: "결과물 보기",
            href: "/portfolio",
            icon: Briefcase,
            variant: "outline",
            description: "실제로 만든 프로젝트와 성과를 확인하세요"
          }}
          variant="muted"
        />
      </PageLayout>
    </>
  );
};

export default About;
