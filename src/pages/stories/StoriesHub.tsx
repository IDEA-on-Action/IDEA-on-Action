import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, Mail, FileText, Bell } from "lucide-react";

export default function StoriesHub() {
  const sections = [
    {
      title: "블로그",
      description: "생각과 경험을 나눕니다",
      icon: BookOpen,
      href: "/stories/blog",
    },
    {
      title: "뉴스레터",
      description: "정기 소식을 전합니다",
      icon: Mail,
      href: "/stories/newsletter",
    },
    {
      title: "변경사항",
      description: "서비스 업데이트 내역",
      icon: FileText,
      href: "/stories/changelog",
    },
    {
      title: "공지사항",
      description: "중요한 안내사항",
      icon: Bell,
      href: "/stories/notices",
    },
  ];

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">이야기</h1>
        <p className="text-muted-foreground mt-2">
          우리가 나누는 것들
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
                  Sprint 3에서 콘텐츠 연동 예정
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
