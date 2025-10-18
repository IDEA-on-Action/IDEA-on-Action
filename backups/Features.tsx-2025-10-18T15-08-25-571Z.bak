import { Zap, Shield, Rocket, Users, LucideIcon } from "lucide-react";

// Types
interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  id: string;
}

interface FeaturesProps {
  className?: string;
  features?: Feature[];
}

// Constants
const DEFAULT_FEATURES: Feature[] = [
  {
    id: "fast-implementation",
    icon: Zap,
    title: "빠른 구현",
    description: "검증된 프레임워크로 신속한 프로토타입 개발"
  },
  {
    id: "stability",
    icon: Shield,
    title: "안정성",
    description: "엔터프라이즈급 보안과 안정적인 운영"
  },
  {
    id: "scalability",
    icon: Rocket,
    title: "확장성",
    description: "비즈니스 성장에 맞춰 유연하게 확장"
  },
  {
    id: "collaboration",
    icon: Users,
    title: "협업",
    description: "팀 전체의 생산성을 높이는 협업 도구"
  }
];

const SECTION_CONTENT = {
  TITLE: "VIBE WORKING의 강점",
  DESCRIPTION: "최고 수준의 기술력과 경험으로 완벽한 솔루션을 제공합니다"
} as const;

const Features = ({ className = "", features = DEFAULT_FEATURES }: FeaturesProps) => {
  return (
    <section id="features" className={`py-24 relative bg-card/30 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">VIBE WORKING</span>의 강점
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {SECTION_CONTENT.DESCRIPTION}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="p-6 rounded-2xl bg-background/50 backdrop-blur-sm border border-border hover:border-primary/40 transition-all group cursor-pointer animate-fade-in focus-within:ring-2 focus-within:ring-primary/20"
                style={{ animationDelay: `${index * 0.1}s` }}
                tabIndex={0}
                role="article"
                aria-labelledby={`feature-title-${feature.id}`}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 
                  id={`feature-title-${feature.id}`}
                  className="text-xl font-semibold mb-2"
                >
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
