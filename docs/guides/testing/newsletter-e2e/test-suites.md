# Newsletter E2E 테스트 - 테스트 스위트 목록

> 11개 테스트 스위트 (33개 테스트) 상세 설명

**마지막 업데이트**: 2025-12-22
**관련 문서**: [메인 가이드](../run-newsletter-e2e-tests.md)

---

## 테스트 통계

```
총 테스트:     33개
테스트 스위트:  11개
커버리지:      100% (핵심 기능)
평균 실행 시간: ~2분 15초
```

---

## 1. Page Loading & Basic Structure (3개)

**목적**: 페이지가 정상적으로 로드되고 기본 UI 요소가 표시되는지 검증

```typescript
test('should load page successfully', async ({ page }) => {
  await page.goto('/admin/newsletter');
  await expect(page.locator('h1')).toContainText('Newsletter');
});

test('should show 4 stats cards', async ({ page }) => {
  const cards = page.locator('[data-testid="stats-card"]');
  await expect(cards).toHaveCount(4);
});
```

**검증 항목**:
- ✅ 페이지 타이틀 "Newsletter" 표시
- ✅ 통계 카드 4개 (Total, Confirmed, Pending, Unsubscribed)
- ✅ 테이블 헤더 5개

---

## 2. Search Functionality (3개)

**목적**: 이메일 검색 기능이 정상 동작하는지 검증

```typescript
test('should filter by email', async ({ page }) => {
  await page.fill('input[placeholder*="Search"]', 'confirmed@test.com');
  await page.waitForTimeout(500); // debounce

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(1);
});
```

**검증 항목**:
- ✅ 검색 input placeholder 표시
- ✅ 검색어 입력 시 실시간 필터링 (debounce 500ms)
- ✅ 검색어 클리어 시 전체 목록 복원

---

## 3. Status Filtering (4개)

**목적**: 상태별 필터가 정상 동작하는지 검증

**검증 항목**:
- ✅ 상태 필터 Select 표시
- ✅ All 옵션: 전체 구독자 표시
- ✅ Pending 옵션: 확인 대기 구독자만 표시
- ✅ Confirmed 옵션: 확인 완료 구독자만 표시
- ✅ Unsubscribed 옵션: 구독 취소 구독자만 표시

---

## 4. Status Change Operations (3개)

**목적**: 구독자 상태 변경 기능이 정상 동작하는지 검증

**검증 항목**:
- ✅ Pending → Confirmed 변경 성공
- ✅ Confirmed → Unsubscribed 변경 성공
- ✅ Unsubscribed → Confirmed 재구독 성공
- ✅ 성공 Toast 알림 표시

---

## 5. Subscriber Deletion (2개)

**목적**: GDPR 준수 삭제 기능이 정상 동작하는지 검증

**검증 항목**:
- ✅ 삭제 버튼 클릭 시 확인 Dialog 표시
- ✅ 2단계 확인 (Cancel/Delete 버튼)
- ✅ Delete 클릭 시 구독자 삭제 성공
- ✅ GDPR 준수 메시지 표시

---

## 6. Pagination (3개)

**목적**: 페이지네이션 기능이 정상 동작하는지 검증

**검증 항목**:
- ✅ 페이지네이션 컨트롤 표시
- ✅ Previous/Next 버튼 표시
- ✅ 50개 초과 시 페이지 전환 가능

---

## 7. Empty States (2개)

**목적**: 빈 상태 UI가 정상 표시되는지 검증

**검증 항목**:
- ✅ 구독자 0명 시 빈 상태 메시지
- ✅ 검색 결과 0건 시 "No results" 메시지
- ✅ 로딩 중 Spinner 표시

---

## 8. Permissions (2개)

**목적**: 권한 관리가 정상 동작하는지 검증

**검증 항목**:
- ✅ Admin 사용자만 접근 가능
- ✅ 상태 변경 버튼 표시
- ✅ 삭제 버튼 표시

---

## 9. Statistics (2개)

**목적**: 통계 카드가 정확한 데이터를 표시하는지 검증

**검증 항목**:
- ✅ 전체 구독자 수 표시
- ✅ 확인 완료/대기/취소 구독자 수 표시
- ✅ 일일 성장률 % 표시

---

## 10. CSV Export (4개)

**목적**: CSV 내보내기 기능이 정상 동작하는지 검증

```typescript
test('should download CSV file', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.locator('button:has-text("Export CSV")').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('newsletter-subscribers');
});
```

**검증 항목**:
- ✅ CSV Export 버튼 표시
- ✅ 파일명: `newsletter-subscribers-YYYY-MM-DD.csv`
- ✅ 성공 Toast 알림 표시
- ✅ 구독자 0명 시 버튼 비활성화

---

## 11. Responsive Design (1개)

**목적**: 모바일 뷰포트에서 정상 동작하는지 검증

**검증 항목**:
- ✅ 모바일 뷰포트 (375x667) 정상 표시
- ✅ 통계 카드 세로 스택
- ✅ 테이블 가로 스크롤
- ✅ 버튼 터치 영역 충분 (최소 44x44px)

---

## 다음 단계

- [문제 해결](./troubleshooting.md)
- [CI/CD 통합](./ci-cd.md)
