/**
 * Changelog Page
 * 릴리즈 노트 및 변경사항 페이지
 *
 * TASK-017: Changelog 페이지 생성
 */

import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { FileText, Filter, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChangelogEntry, type ChangelogEntryData } from "@/components/stories/ChangelogEntry";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBlogPosts } from "@/hooks/useBlogPosts";

export default function Changelog() {
  const [selectedProject, setSelectedProject] = useState<string>("");

  // Supabase에서 changelog 타입 포스트 가져오기
  const { data: posts, isLoading, error } = useBlogPosts({
    filters: {
      status: 'published',
      post_type: 'changelog',
    },
    sortBy: 'published_at',
    sortOrder: 'desc',
  });

  // 블로그 포스트를 ChangelogEntryData 형식으로 변환
  const changelogEntries: ChangelogEntryData[] = posts?.map(post => {
    // content에서 변경사항 파싱 (Markdown에서 리스트 항목 추출)
    const changes: ChangelogEntryData['changes'] = [];
    if (post.content) {
      const lines = post.content.split('\n');
      for (const line of lines) {
        const match = line.match(/^-\s+\*\*(\w+)\*\*:\s+(.+)$/);
        if (match) {
          const type = match[1].toLowerCase();
          const description = match[2];
          if (['feature', 'fix', 'improvement', 'breaking', 'docs'].includes(type)) {
            changes.push({
              type: type as 'feature' | 'fix' | 'improvement' | 'breaking' | 'docs',
              description,
            });
          }
        }
      }
    }

    return {
      id: post.id,
      version: post.meta_title || post.title, // meta_title을 버전으로 사용
      title: post.excerpt || post.title,
      released_at: post.published_at || post.created_at,
      changes,
      project: post.category ? {
        title: post.category.name,
        slug: post.category.slug,
      } : undefined,
    };
  }) || [];

  // 프로젝트 목록 추출 (필터용)
  const projects = Array.from(
    new Set(changelogEntries.map((entry) => entry.project?.title).filter(Boolean))
  ) as string[];

  // 필터링된 엔트리
  const filteredEntries = selectedProject
    ? changelogEntries.filter((entry) => entry.project?.title === selectedProject)
    : changelogEntries;

  const clearFilters = () => {
    setSelectedProject("");
  };

  const hasActiveFilters = Boolean(selectedProject);

  return (
    <>
      <Helmet>
        <title>변경사항 | IDEA on Action</title>
        <meta
          name="description"
          content="IDEA on Action 서비스의 업데이트 내역과 릴리즈 노트를 확인하세요."
        />
      </Helmet>

      <Header />
      <main id="main-content" className="min-h-screen gradient-bg">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                변경사항
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                서비스 업데이트 내역과 릴리즈 노트
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-4 border-y bg-card/50">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              {/* Project Filter */}
              <div className="flex items-center gap-4">
                <Select
                  value={selectedProject || "all"}
                  onValueChange={(value) =>
                    setSelectedProject(value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="프로젝트 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 프로젝트</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    필터 초기화
                  </Button>
                )}
              </div>

              {/* 결과 수 */}
              <p className="text-sm text-muted-foreground">
                {filteredEntries.length}개의 릴리즈
              </p>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {/* 로딩 상태 */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">변경사항을 불러오는 중...</p>
              </div>
            )}

            {/* 에러 상태 */}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive">변경사항을 불러오는데 실패했습니다.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {error.message}
                </p>
              </div>
            )}

            {/* 빈 상태 */}
            {!isLoading && !error && filteredEntries.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  해당 프로젝트의 변경사항이 없습니다.
                </p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    필터 초기화
                  </Button>
                )}
              </div>
            )}

            {/* 타임라인 리스트 */}
            {!isLoading && !error && filteredEntries.length > 0 && (
              <div className="relative max-w-3xl mx-auto">
                {/* 타임라인 세로선 */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-border ml-[0.5px]" />

                {/* 엔트리 목록 */}
                <div className="space-y-8 pl-8">
                  {filteredEntries.map((entry) => (
                    <ChangelogEntry key={entry.id} {...entry} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 하단 안내 */}
        <section className="py-8 border-t bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              이전 버전의 변경사항은{" "}
              <a
                href="https://github.com/IDEA-on-Action/idea-on-action/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub Releases
              </a>
              에서 확인할 수 있습니다.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
