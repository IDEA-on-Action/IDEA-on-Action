/**
 * AlertCenter 사용 예제
 *
 * @module components/central-hub/AlertCenter.example
 */

import { AlertCenter } from './AlertCenter';

/**
 * 기본 사용 예제
 */
export function BasicExample() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">알림 센터</h1>
      <AlertCenter />
    </div>
  );
}

/**
 * 서비스별 그룹화 예제
 */
export function ServiceGroupExample() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">알림 센터 - 서비스별</h1>
      <AlertCenter groupBy="service" maxHeight="h-[700px]" />
    </div>
  );
}

/**
 * 날짜별 그룹화 예제
 */
export function DateGroupExample() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">알림 센터 - 날짜별</h1>
      <AlertCenter groupBy="date" maxHeight="h-[700px]" />
    </div>
  );
}

/**
 * 심각도별 그룹화 예제
 */
export function SeverityGroupExample() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">알림 센터 - 심각도별</h1>
      <AlertCenter groupBy="severity" maxHeight="h-[700px]" />
    </div>
  );
}

/**
 * 그리드 레이아웃 예제 (2열)
 */
export function GridLayoutExample() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">알림 센터 - 비교 뷰</h1>
      <div className="grid grid-cols-2 gap-4">
        <AlertCenter groupBy="service" maxHeight="h-[600px]" />
        <AlertCenter groupBy="severity" maxHeight="h-[600px]" />
      </div>
    </div>
  );
}

/**
 * Central Hub 페이지에서 사용 예제
 */
export function CentralHubPageExample() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">Central Hub</h1>
        <p className="text-muted-foreground">
          Minu 서비스들의 실시간 모니터링 및 알림 관리
        </p>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 서비스 헬스 카드들 */}
        <div className="lg:col-span-1 space-y-4">
          {/* ServiceHealthCard 컴포넌트들 */}
        </div>

        {/* 오른쪽: 알림 센터 */}
        <div className="lg:col-span-2">
          <AlertCenter groupBy="severity" maxHeight="h-[800px]" />
        </div>
      </div>
    </div>
  );
}
