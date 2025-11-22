import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'in-progress';

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">프로젝트</h1>
        <p className="text-muted-foreground mt-2">
          우리가 만들고 있는 것들
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList className="mb-8">
          <TabsTrigger value="in-progress">진행중</TabsTrigger>
          <TabsTrigger value="released">출시됨</TabsTrigger>
          <TabsTrigger value="lab">실험중</TabsTrigger>
          <TabsTrigger value="roadmap">로드맵</TabsTrigger>
        </TabsList>

        <TabsContent value="in-progress">
          <Card>
            <CardHeader>
              <CardTitle>진행중인 프로젝트</CardTitle>
              <CardDescription>현재 개발 중인 프로젝트 목록</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sprint 2에서 구현 예정</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="released">
          <Card>
            <CardHeader>
              <CardTitle>출시된 프로젝트</CardTitle>
              <CardDescription>완료되어 운영 중인 프로젝트</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sprint 2에서 구현 예정</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lab">
          <Card>
            <CardHeader>
              <CardTitle>실험중</CardTitle>
              <CardDescription>바운티 및 실험 프로젝트</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sprint 2에서 구현 예정</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roadmap">
          <Card>
            <CardHeader>
              <CardTitle>로드맵</CardTitle>
              <CardDescription>분기별 계획</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sprint 2에서 구현 예정</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
