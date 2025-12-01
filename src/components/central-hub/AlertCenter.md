# AlertCenter 컴포넌트

Central Hub의 고도화된 알림 센터 UI 컴포넌트입니다.

## 주요 기능

### 1. 알림 그룹화
- **서비스별**: Minu Find, Frame, Build, Keep로 그룹화
- **날짜별**: 오늘, 어제, 이번 주, 이전으로 그룹화
- **심각도별**: Critical, High, Medium, Low로 그룹화

### 2. 일괄 처리
- **모두 읽음**: 전체 알림을 읽음 처리
- **선택 삭제**: 체크박스로 선택한 알림 삭제
- **그룹 선택**: 그룹 전체를 한 번에 선택/해제

### 3. 우선순위 표시
- **Critical**: 빨간 배지 + 좌측 빨간 테두리 + 상단 고정
- **High**: 주황 배지 + 우선 정렬
- **Medium**: 노랑 배지
- **Low**: 초록 배지

### 4. 실시간 업데이트
- Supabase Realtime을 통한 실시간 알림 수신
- 읽음/안읽음 상태 관리
- 연결 상태 표시

### 5. 알림 설정
- 서비스별 알림 On/Off
- 심각도별 알림 필터링
- 이메일, Slack, 브라우저 알림 설정

## Props

```typescript
interface AlertCenterProps {
  /** 최대 높이 (기본: 'h-[600px]') */
  maxHeight?: string;
  /** 그룹화 기준 (기본: 'service') */
  groupBy?: 'service' | 'date' | 'severity';
  /** 추가 CSS 클래스 */
  className?: string;
}
```

## 사용 예제

### 기본 사용
```tsx
import { AlertCenter } from '@/components/central-hub';

export function MyPage() {
  return <AlertCenter />;
}
```

### 서비스별 그룹화
```tsx
<AlertCenter groupBy="service" maxHeight="h-[700px]" />
```

### 날짜별 그룹화
```tsx
<AlertCenter groupBy="date" />
```

### 심각도별 그룹화
```tsx
<AlertCenter groupBy="severity" />
```

## UI 구조

```
┌─────────────────────────────────────────────┐
│ 알림 센터                    [연결 상태]     │
├─────────────────────────────────────────────┤
│ [그룹: 서비스별 ▼] [필터] [모두 읽음]        │
│ [전체 삭제] [재연결] [설정]                  │
├─────────────────────────────────────────────┤
│ ▼ [□] Minu Find (3) [NEW 2]                │
│   [□] 🔴 Critical: 서버 응답 지연      2분 전 │
│   [□] 🟠 High: API 에러율 증가        5분 전 │
│   [□] 🟡 Medium: 사용량 임계치 도달  10분 전 │
│                                             │
│ ▼ [□] Minu Frame (1)                       │
│   [□] 🟢 Low: 배포 완료              30분 전 │
├─────────────────────────────────────────────┤
│ [선택 삭제] 2개 선택됨                       │
└─────────────────────────────────────────────┘
```

## 알림 우선순위

우선순위는 다음 순서로 정렬됩니다:

1. **읽지 않은 알림 우선**
2. **심각도 우선** (Critical > High > Medium > Low)
3. **이슈가 이벤트보다 우선**
4. **최신순**

## 그룹 접기/펼치기

- Critical/High 심각도 그룹은 기본적으로 펼쳐진 상태
- 다른 그룹들은 기본적으로 펼쳐진 상태
- 클릭하여 접기/펼치기 가능

## 알림 아이템

### 이슈 알림
- 서비스 배지 + 심각도 배지
- 제목 및 설명
- 상대 시간 표시 (방금 전, N분 전, N시간 전)
- 읽음 표시 버튼

### 이벤트 알림
- 서비스 배지
- 이벤트 메시지
- 상대 시간 표시
- 읽음 표시 버튼

## 선택 기능

- **개별 선택**: 각 항목의 체크박스 클릭
- **그룹 선택**: 그룹 헤더의 체크박스 클릭
- **선택 삭제**: 선택한 항목들을 일괄 삭제

## 연결 상태

- **연결됨**: 초록색 점 + "연결됨" 텍스트
- **연결 중**: 노란색 점 + "연결 중..." 텍스트
- **연결 끊김**: 빨간색 점 + "연결 끊김" 텍스트
- **에러**: 빨간색 점 + "에러" 텍스트

## 알림 상세

알림 아이템을 클릭하면 상세 모달이 열립니다:
- 전체 내용 표시
- 읽음 표시 버튼
- 관련 링크 (있는 경우)

## 필터링

AlertFilterPanel과 통합되어 다음 필터를 지원합니다:
- 서비스 필터 (Minu Find, Frame, Build, Keep)
- 심각도 필터 (Critical, High, Medium, Low)
- 이벤트 타입 필터

## 알림 설정

AlertSettings 컴포넌트와 통합되어 다음 설정을 지원합니다:
- 이메일 알림 활성화 및 주소 설정
- Slack 웹훅 활성화 및 URL 설정
- 브라우저 알림 활성화
- 알림 소리 활성화
- 서비스별 알림 On/Off
- 심각도별 알림 On/Off

## 성능 최적화

- React Query를 통한 데이터 캐싱
- useMemo를 통한 그룹화 및 정렬 최적화
- 최대 200개 항목 보관 (메모리 제한)
- 읽지 않은 항목 우선 표시

## 접근성

- 키보드 내비게이션 지원
- 스크린 리더 호환
- 명확한 레이블 및 ARIA 속성

## 관련 컴포넌트

- **RealtimeAlertPanel**: 기본 알림 패널 (AlertCenter의 기반)
- **AlertFilterPanel**: 필터 UI
- **AlertSettings**: 설정 UI
- **AlertDetailModal**: 상세 모달
- **ServiceHealthCard**: 서비스 헬스 카드

## 의존성

- `@/hooks/useRealtimeEventStream`: 실시간 스트림 훅
- `@/hooks/useAlertSettings`: 알림 설정 훅
- `@/hooks/useRealtimeServiceStatus`: 연결 상태 훅
- `@/types/central-hub.types`: 타입 정의
- `@/utils/notifications`: 브라우저 알림 유틸

## 제한사항

- 최대 200개 항목만 메모리에 보관
- 개별 삭제는 현재 읽음 처리로 대체 (TODO: DB 삭제 로직 구현 필요)
- 브라우저 알림은 HTTPS 환경에서만 작동
