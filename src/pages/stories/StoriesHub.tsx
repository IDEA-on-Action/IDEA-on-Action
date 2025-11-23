/**
 * StoriesHub Page
 * 이야기 허브 페이지 - 4개 섹션 미리보기
 *
 * Sprint 1 - Site Restructure
 */

import { BookOpen, Mail, FileText, Bell } from "lucide-react";
import { StoriesSection, type StoriesSectionItem } from "@/components/stories/StoriesSection";
import { PageLayout } from "@/components/layouts";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { useNotices } from "@/hooks/useNotices";

// 더미 데이터: 뉴스레터 (Sprint 2에서 실제 데이터 연동 예정)
const dummyNewsletters: StoriesSectionItem[] = [
  {
    id: "1",
    title: "2025년 1월 뉴스레터: 새해 첫 소식",
    excerpt: "새해를 맞아 준비한 특별한 소식들을 전합니다.",
    published_at: "2025-01-15T09:00:00Z",
  },
  {
    id: "2",
    title: "2024년 12월 뉴스레터: 연말 결산",
    excerpt: "한 해를 마무리하며 돌아보는 우리의 여정",
    published_at: "2024-12-20T09:00:00Z",
  },
  {
    id: "3",
    title: "2024년 11월 뉴스레터: 가을의 변화들",
    excerpt: "새로운 기능과 서비스 업데이트 소식",
    published_at: "2024-11-15T09:00:00Z",
  },
];

// 더미 데이터: 변경사항 (Sprint 2에서 실제 데이터 연동 예정)
const dummyChangelog: StoriesSectionItem[] = [
  {
    id: "1",
    title: "v2.6.0 - 사이트 재구조화 완료",
    excerpt: "메뉴 재구성 및 허브 페이지 추가",
    published_at: "2025-01-23T00:00:00Z",
  },
  {
    id: "2",
    title: "v2.5.0 - CMS Phase 5 완료",
    excerpt: "리치 텍스트 에디터 및 미디어 라이브러리 고도화",
    published_at: "2025-01-22T00:00:00Z",
  },
  {
    id: "3",
    title: "v2.4.0 - Minu 브랜드 전환",
    excerpt: "COMPASS에서 Minu 시리즈로 리브랜딩",
    published_at: "2025-01-21T00:00:00Z",
  },
];

export default function StoriesHub() {
  // 블로그 포스트 가져오기 (최신 3개, published 상태만)
  const { data: blogPosts, isLoading: blogLoading } = useBlogPosts({
    filters: { status: "published" },
    limit: 3,
    sortBy: "published_at",
    sortOrder: "desc",
  });

  // 공지사항 가져오기 (최신 3개, published 상태만)
  const { data: notices, isLoading: noticesLoading } = useNotices({
    filters: { status: "published" },
    limit: 3,
    sortBy: "published_at",
    sortOrder: "desc",
  });

  // 블로그 데이터를 StoriesSectionItem 형태로 변환
  const blogItems: StoriesSectionItem[] =
    blogPosts?.map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt || undefined,
      published_at: post.published_at,
    })) || [];

  // 공지사항 데이터를 StoriesSectionItem 형태로 변환
  const noticeItems: StoriesSectionItem[] =
    notices?.map((notice) => ({
      id: notice.id,
      title: notice.title,
      excerpt: notice.content?.slice(0, 100) || undefined,
      published_at: notice.published_at,
    })) || [];

  return (
    <PageLayout>
      <div className="container py-12">
        {/* 헤더 */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold">이야기</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            우리가 나누는 것들
          </p>
        </div>

        {/* 4개 섹션 그리드 */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* 블로그 섹션 */}
          <StoriesSection
            title="블로그"
            description="생각과 경험을 나눕니다"
            icon={BookOpen}
            items={blogItems}
            linkTo="/stories/blog"
            isLoading={blogLoading}
            emptyMessage="아직 작성된 블로그 글이 없습니다"
          />

          {/* 뉴스레터 섹션 */}
          <StoriesSection
            title="뉴스레터"
            description="정기 소식을 전합니다"
            icon={Mail}
            items={dummyNewsletters}
            linkTo="/stories/newsletter"
            emptyMessage="아직 발행된 뉴스레터가 없습니다"
          />

          {/* Changelog 섹션 */}
          <StoriesSection
            title="변경사항"
            description="서비스 업데이트 내역"
            icon={FileText}
            items={dummyChangelog}
            linkTo="/stories/changelog"
            emptyMessage="아직 등록된 변경사항이 없습니다"
          />

          {/* 공지사항 섹션 */}
          <StoriesSection
            title="공지사항"
            description="중요한 안내사항"
            icon={Bell}
            items={noticeItems}
            linkTo="/stories/notices"
            isLoading={noticesLoading}
            emptyMessage="아직 등록된 공지사항이 없습니다"
          />
        </div>

        {/* 하단 안내 */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            각 섹션을 클릭하여 더 많은 콘텐츠를 확인하세요
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
