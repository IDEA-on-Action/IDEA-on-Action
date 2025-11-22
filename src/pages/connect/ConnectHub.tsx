import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, MessageSquare, Users, Globe } from "lucide-react";

export default function ConnectHub() {
  const sections = [
    {
      title: "프로젝트 문의",
      description: "협업 프로젝트를 제안해주세요",
      icon: MessageSquare,
      href: "/connect/inquiry",
    },
    {
      title: "채용",
      description: "함께 성장할 동료를 찾습니다",
      icon: Users,
      href: "/connect/careers",
    },
    {
      title: "커뮤니티",
      description: "아이디어를 나누는 공간",
      icon: Globe,
      href: "/connect/community",
    },
  ];

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">함께하기</h1>
        <p className="text-muted-foreground mt-2">
          연결의 시작점
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {sections.map((section) => (
          <Link key={section.href} to={section.href}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <section.icon className="h-8 w-8 text-primary" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  바로 연결됩니다
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
