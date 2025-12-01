/**
 * MCPProtected 컴포넌트 사용 예시
 *
 * @description Central Hub Phase 2 - Agent 1 구현 예시
 */

import React from 'react';
import { MCPProtected } from '@/components/mcp';
import type { ServiceId } from '@/types/central-hub.types';

// ============================================================================
// 예시 1: 기본 사용 - 서비스 접근 보호
// ============================================================================

function MinuFindContent() {
  return (
    <div className="p-4">
      <h2>Minu Find 서비스</h2>
      <p>사업기회 탐색 기능입니다.</p>
    </div>
  );
}

export function MinuFindPage() {
  return (
    <MCPProtected serviceId="minu-find">
      <MinuFindContent />
    </MCPProtected>
  );
}

// ============================================================================
// 예시 2: 추가 권한 요구
// ============================================================================

function ExportFeature() {
  return (
    <div className="p-4">
      <h2>데이터 내보내기</h2>
      <button>CSV 다운로드</button>
    </div>
  );
}

export function MinuBuildExportPage() {
  return (
    <MCPProtected
      serviceId="minu-build"
      requiredPermission="export_data"
    >
      <ExportFeature />
    </MCPProtected>
  );
}

// ============================================================================
// 예시 3: 커스텀 Fallback UI
// ============================================================================

function CustomUpgradePrompt() {
  return (
    <div className="p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">업그레이드가 필요합니다</h2>
      <p className="text-muted-foreground mb-4">
        이 기능을 사용하려면 Pro 플랜으로 업그레이드하세요.
      </p>
      <button className="bg-primary text-white px-6 py-2 rounded-md">
        지금 업그레이드
      </button>
    </div>
  );
}

function CustomLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse">
        <p>권한 확인 중...</p>
      </div>
    </div>
  );
}

export function MinuKeepWithCustomUI() {
  return (
    <MCPProtected
      serviceId="minu-keep"
      fallback={<CustomUpgradePrompt />}
      loadingFallback={<CustomLoader />}
    >
      <div className="p-4">
        <h2>Minu Keep 서비스</h2>
        <p>운영/유지보수 기능입니다.</p>
      </div>
    </MCPProtected>
  );
}

// ============================================================================
// 예시 4: 동적 서비스 ID
// ============================================================================

interface DynamicServicePageProps {
  serviceId: ServiceId;
}

export function DynamicServicePage({ serviceId }: DynamicServicePageProps) {
  return (
    <MCPProtected serviceId={serviceId}>
      <div className="p-4">
        <h2>서비스: {serviceId}</h2>
        <p>동적으로 로드된 서비스 페이지입니다.</p>
      </div>
    </MCPProtected>
  );
}

// ============================================================================
// 예시 5: 중첩 권한 (서비스 + 추가 기능)
// ============================================================================

function AdvancedAnalytics() {
  return (
    <div className="mt-4 p-4 border rounded-md">
      <h3>고급 분석</h3>
      <p>AI 기반 인사이트</p>
    </div>
  );
}

export function MinuFrameWithAnalytics() {
  return (
    <MCPProtected serviceId="minu-frame">
      <div className="p-4">
        <h2>Minu Frame 서비스</h2>
        <p>문제정의 & RFP 작성</p>

        {/* 중첩된 추가 권한 보호 */}
        <MCPProtected
          serviceId="minu-frame"
          requiredPermission="advanced_analytics"
        >
          <AdvancedAnalytics />
        </MCPProtected>
      </div>
    </MCPProtected>
  );
}

// ============================================================================
// 예시 6: 에러 바운더리와 함께 사용
// ============================================================================

import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-8 text-center text-red-500">
      <h2>오류가 발생했습니다</h2>
      <pre className="mt-4 text-sm">{error.message}</pre>
    </div>
  );
}

export function MinuBuildWithErrorBoundary() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <MCPProtected serviceId="minu-build">
        <div className="p-4">
          <h2>Minu Build 서비스</h2>
          <p>프로젝트 진행 관리</p>
        </div>
      </MCPProtected>
    </ErrorBoundary>
  );
}
