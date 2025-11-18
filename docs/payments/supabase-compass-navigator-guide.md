# COMPASS Navigator 서비스 추가 가이드

## Supabase 대시보드 접속

1. **URL**: https://supabase.com/dashboard/project/zykjdneewbzyazfukzyg
2. **Table Editor** → **services** 테이블 선택
3. **Insert row** 버튼 클릭

## 입력 값

### 기본 정보
| 필드 | 값 | 타입 |
|------|-----|------|
| `title` | `COMPASS Navigator - 월 구독` | TEXT |
| `status` | `active` | TEXT (드롭다운) |
| `price` | `99000` | INTEGER |

### 카테고리
| 필드 | 값 |
|------|-----|
| `category_id` | `cca66651-9061-477d-9de8-62d4432acd06` |

### 이미지
| 필드 | 값 | 타입 |
|------|-----|------|
| `image_url` | `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800` | TEXT |
| `images` | 아래 JSON 배열 참조 | TEXT[] |

**images 배열**:
```json
[
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
  "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800"
]
```

### Description (Markdown)
```markdown
**AI 기반 워크플로우 자동화 플랫폼**

COMPASS Navigator는 업무 프로세스를 자동화하고 효율을 극대화하는 AI 에이전트 기반 플랫폼입니다.

### 주요 특징
- **지능형 작업 자동화**: 반복 작업을 AI가 자동으로 처리
- **실시간 협업**: 팀원들과 실시간으로 워크플로우 공유
- **통합 대시보드**: 모든 프로젝트를 한눈에 관리
- **보안 강화**: 엔터프라이즈급 보안 및 권한 관리

### 월 구독 혜택
- ✅ 14일 무료 체험
- ✅ 모든 기능 무제한 사용
- ✅ 월 단위 언제든 해지 가능
- ✅ 프리미엄 지원 포함
```

### Features (JSONB)
Supabase는 JSONB를 자동으로 파싱합니다. 아래 JSON을 그대로 붙여넣으세요:

```json
[
  {
    "title": "AI 에이전트 자동화",
    "description": "반복적인 업무를 AI가 학습하여 자동으로 처리합니다."
  },
  {
    "title": "실시간 협업",
    "description": "팀원들과 실시간으로 워크플로우를 공유하고 협업합니다."
  },
  {
    "title": "통합 대시보드",
    "description": "모든 프로젝트와 작업을 한눈에 파악할 수 있는 직관적 UI를 제공합니다."
  },
  {
    "title": "엔터프라이즈 보안",
    "description": "금융권 수준의 보안과 세밀한 권한 관리를 지원합니다."
  }
]
```

### Metrics (JSONB)
```json
{
  "users": 1200,
  "satisfaction": 4.8,
  "avg_roi_increase": 35
}
```

## 저장 후 확인

1. **Save** 버튼 클릭
2. 새로운 row가 생성되었는지 확인
3. **id** (UUID) 값 복사해두기
4. 브라우저에서 확인:
   - 목록: http://localhost:8080/services
   - 상세: http://localhost:8080/services/{생성된 id}

## 다음 단계

- [ ] 토스페이먼츠 빌링 위젯 통합
- [ ] 정기결제 플로우 테스트
- [ ] PPT 스크린샷 제작
