/**
 * StoriesHub Page
 * 이야기 허브 페이지 - 4개 섹션 미리보기
 *
 * Sprint 1 - Site Restructure
 * WordPress 연동 버전
 */

import { BookOpen, Mail, FileText, Bell } from "lucide-react";
import { StoriesSection, type StoriesSectionItem } from "@/components/stories/StoriesSection";
import { PageLayout } from "@/components/layouts";
import { useWordPressPosts } from "@/hooks/integrations/useWordPressPosts";
import { useBlogPosts } from "@/hooks/cms/useBlogPosts";
import { useNotices } from "@/hooks/cms/useNotices";
import { useNewsletterArchive } from '@/hooks/newsletter/useNewsletterArchive';

export default function StoriesHub() {
  // WordPress 블로그 포스트 가져오기 (최신 3개)
  const { data: blogPosts, isLoading: blogLoading } = useWordPressPosts({
    number: 3,
    orderBy: "date",
    order: "DESC",
  });

  // 뉴스레터 아카이브 가져오기 (최신 3개)
  const { data: newsletters, isLoading: newsletterLoading } = useNewsletterArchive({
    limit: 3,
  });

  // 변경사항 가져오기 (최신 3개, post_type: 'changelog')
  const { data: changelogPosts, isLoading: changelogLoading } = useBlogPosts({
    filters: { status: "published", post_type: "changelog" },
    sortBy: "published_at",
    sortOrder: "desc",
    limit: 3,
  });

  // 공지사항 가져오기 (최신 3개, published 상태만)
  const { data: notices, isLoading: noticesLoading } = useNotices({
    filters: { status: "published" },
    limit: 3,
    sortBy: "published_at",
    sortOrder: "desc",
  });

  // WordPress 블로그 데이터를 StoriesSectionItem 형태로 변환
  // HTML excerpt에서 텍스트만 추출
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const blogItems: StoriesSectionItem[] =
    blogPosts?.map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt ? stripHtml(post.excerpt).slice(0, 100) : undefined,
      published_at: post.publishedAt.toISOString(),
    })) || [];

  // 뉴스레터 데이터를 StoriesSectionItem 형태로 변환
  const newsletterItems: StoriesSectionItem[] =
    newsletters?.map((item) => ({
      id: item.id,
      title: item.subject,
      excerpt: item.preview || undefined,
      published_at: item.sent_at,
    })) || [];

  // 변경사항 데이터를 StoriesSectionItem 형태로 변환
  const changelogItems: StoriesSectionItem[] =
    changelogPosts?.map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt || undefined,
      published_at: post.published_at || post.created_at,
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
            items={newsletterItems}
            linkTo="/stories/newsletter"
            isLoading={newsletterLoading}
            emptyMessage="아직 발행된 뉴스레터가 없습니다"
          />

          {/* Changelog 섹션 */}
          <StoriesSection
            title="변경사항"
            description="서비스 업데이트 내역"
            icon={FileText}
            items={changelogItems}
            linkTo="/stories/changelog"
            isLoading={changelogLoading}
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
