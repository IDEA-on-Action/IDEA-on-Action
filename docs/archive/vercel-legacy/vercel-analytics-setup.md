# Vercel Analytics 활성화 가이드

## 문제
`/_vercel/insights` 엔드포인트가 404를 반환함 → Analytics가 비활성화됨

## 해결 방법

### 1. Vercel 대시보드에서 활성화

1. **Vercel 프로젝트 설정 열기**:
   https://vercel.com/idea-on-action/idea-on-action/settings/analytics

2. **Analytics 탭에서 "Enable Web Analytics" 클릭**

3. **설정 확인**:
   - ✅ Web Analytics 활성화
   - ✅ Speed Insights 활성화 (선택 사항)

### 2. 자동 활성화 확인

Vercel Analytics는 다음 조건에서 **자동으로 활성화**됩니다:
- `@vercel/analytics` 패키지 설치됨 ✅
- `<Analytics />` 컴포넌트 추가됨 ✅
- 프로덕션 배포 완료 ✅

**하지만** Vercel 대시보드에서 수동으로 활성화해야 할 수도 있습니다.

### 3. 확인 방법

**프로덕션 사이트에서**:
1. F12 → Network 탭
2. `/_vercel/insights` 또는 `/_vercel/speed-insights` 요청 확인
3. **Status 200** 이어야 정상

**현재 상태**: Status 404 → **비활성화됨**

### 4. 대안: Vercel CLI로 확인

```bash
npm i -g vercel
vercel login
vercel analytics --project=idea-on-action
```

## 참고

Vercel Analytics는 **무료 플랜 포함**:
- 무료: 월 2,500 이벤트
- Hobby: 무제한 페이지뷰
- Pro: 실시간 데이터

현재 코드는 정상이며, Vercel 대시보드에서 활성화만 하면 됩니다.
