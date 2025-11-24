# Vision API 통합 요구사항 명세서

> Claude Vision 기능을 IDEA on Action에 통합하여 이미지 분석 기능 제공

**작성일**: 2025-11-24
**버전**: 1.0.0
**상태**: Draft
**관련 백로그**: BL-AI-001

---

## 1. 개요

### 1.1 목적
Claude의 Vision 기능을 활용하여 사용자가 업로드한 이미지를 분석하고, Minu 서비스 워크플로우에 활용할 수 있는 인사이트를 제공합니다.

### 1.2 범위
- 이미지 업로드 및 Base64 인코딩
- Claude API Vision 엔드포인트 호출
- 분석 결과 텍스트 반환
- Minu 서비스 통합 (디자인 분석, 다이어그램 해석)

---

## 2. 사용자 스토리

### US-VI-01: UI 디자인 분석
> **As a** Minu Frame 사용자
> **I want to** UI 디자인 시안 이미지를 업로드하고 피드백을 받고 싶다
> **So that** 디자인 개선 방향을 파악할 수 있다

**인수 조건**:
- [ ] PNG/JPG/WEBP 이미지 업로드 가능
- [ ] 최대 5MB 파일 크기 지원
- [ ] 디자인 원칙 기반 피드백 생성
- [ ] 개선 제안 목록 제공

### US-VI-02: 다이어그램 해석
> **As a** Minu Build 사용자
> **I want to** 아키텍처 다이어그램 이미지를 분석하고 싶다
> **So that** 시스템 구조를 텍스트로 정리할 수 있다

**인수 조건**:
- [ ] 플로우차트, ER 다이어그램 등 인식
- [ ] 구성 요소 및 관계 텍스트 추출
- [ ] 구조화된 JSON 출력 옵션

### US-VI-03: 버그 리포트 분석
> **As a** Minu Keep 사용자
> **I want to** 스크린샷 기반 버그 리포트를 자동 분석하고 싶다
> **So that** 이슈 설명을 자동 생성할 수 있다

**인수 조건**:
- [ ] 스크린샷에서 에러 메시지 추출
- [ ] UI 상태 설명 자동 생성
- [ ] 재현 단계 추론

### US-VI-04: 와이어프레임 → 요구사항
> **As a** Minu Frame 사용자
> **I want to** 와이어프레임 이미지에서 요구사항을 추출하고 싶다
> **So that** RFP 작성에 활용할 수 있다

**인수 조건**:
- [ ] 화면 구성 요소 식별
- [ ] 기능 요구사항 목록 생성
- [ ] docx RFP 템플릿에 통합

---

## 3. 기능 요구사항

### FR-VI-01: 이미지 업로드 처리

#### FR-VI-01.1: 파일 검증
- 지원 형식: PNG, JPG, JPEG, GIF, WEBP
- 최대 파일 크기: 5MB
- 이미지 해상도: 최대 4096x4096
- 복수 이미지: 최대 5개 동시 분석

#### FR-VI-01.2: 인코딩
- Base64 인코딩 처리
- Data URI 형식 지원
- URL 참조 지원 (public URL)

### FR-VI-02: Vision API 호출

#### FR-VI-02.1: 요청 형식
```typescript
interface VisionRequest {
  images: Array<{
    source: 'base64' | 'url';
    data: string; // base64 또는 URL
    mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  }>;
  prompt: string;
  analysisType?: 'general' | 'ui-design' | 'diagram' | 'screenshot' | 'wireframe';
  maxTokens?: number;
  outputFormat?: 'text' | 'json';
}
```

#### FR-VI-02.2: 응답 형식
```typescript
interface VisionResponse {
  analysis: string;
  structured?: {
    components?: string[];
    relationships?: Array<{ from: string; to: string; type: string }>;
    suggestions?: string[];
    extractedText?: string;
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    imageTokens: number;
  };
}
```

### FR-VI-03: 분석 유형별 시스템 프롬프트

#### FR-VI-03.1: UI 디자인 분석
```
당신은 UI/UX 디자인 전문가입니다. 제공된 디자인 이미지를 분석하고:
1. 전체적인 디자인 평가
2. 레이아웃 및 구성 분석
3. 색상/타이포그래피 평가
4. 사용성 개선 제안
5. 접근성 고려사항
을 제공해주세요.
```

#### FR-VI-03.2: 다이어그램 분석
```
당신은 시스템 아키텍트입니다. 제공된 다이어그램을 분석하고:
1. 다이어그램 유형 식별 (플로우차트, ER, 시퀀스 등)
2. 구성 요소 목록
3. 요소 간 관계 정의
4. 텍스트 형식의 구조 설명
을 제공해주세요.
```

---

## 4. 비기능 요구사항

### NFR-VI-01: 성능
- 이미지 처리 시간: < 2초 (5MB 이미지)
- API 응답 시간: < 30초 (복잡한 분석)
- 동시 요청: 5 req/user/min

### NFR-VI-02: 보안
- 이미지 임시 저장 금지 (메모리 처리만)
- HTTPS 전송 필수
- 민감 정보 마스킹 옵션

### NFR-VI-03: 비용
- 이미지 토큰: ~1,000 tokens/image (예상)
- 일일 사용량 제한: 50 images/user
- 비용 추적 (claude_usage_logs 활용)

---

## 5. 제약사항

### 기술적 제약
- Claude API Vision 기능 의존
- Edge Function 메모리 제한 (256MB)
- Base64 인코딩으로 인한 데이터 크기 증가 (~33%)

### 비즈니스 제약
- 기존 claude-ai Edge Function 확장
- Rate Limiting 정책 적용
- 구독 플랜별 사용량 제한

---

## 6. 우선순위

| 우선순위 | 기능 | 이유 |
|---------|------|------|
| P0 | 이미지 업로드 및 Base64 인코딩 | 기본 기능 |
| P0 | Vision API 호출 | 핵심 기능 |
| P1 | 분석 유형별 시스템 프롬프트 | 품질 향상 |
| P1 | UI 컴포넌트 (업로드, 결과 표시) | 사용자 경험 |
| P2 | 구조화된 JSON 출력 | 고급 기능 |
| P2 | 복수 이미지 분석 | 확장 기능 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-11-24 | 초기 작성 | Claude |
