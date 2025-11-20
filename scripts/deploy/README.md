# Deployment Scripts

배포 관련 스크립트 모음

## 📁 스크립트 목록

### 빌드 & 생성
- `generate-sitemap.ts` - Sitemap XML 생성
- `generate-rss.ts` - RSS Feed 생성
- `generate-og-image.js` - Open Graph 이미지 생성

### CI/CD
- `cancel-non-deployment-workflows.js` - 배포 외 워크플로우 취소

### 프로젝트 관리
- `archive-completed-todos.js` - 완료된 TODO 아카이빙
- `create-issues-from-yaml.js` - YAML에서 GitHub Issues 생성

## 🚀 사용법

### Sitemap 생성
```bash
npm run generate:sitemap
# 또는
tsx scripts/deploy/generate-sitemap.ts
```

### RSS Feed 생성
```bash
npm run generate:rss
# 또는
tsx scripts/deploy/generate-rss.ts
```

### OG 이미지 생성
```bash
node scripts/deploy/generate-og-image.js
```

### GitHub Actions 워크플로우 정리
```bash
node scripts/deploy/cancel-non-deployment-workflows.js
```

### TODO 아카이빙
```bash
node scripts/deploy/archive-completed-todos.js
```

### GitHub Issues 생성
```bash
node scripts/deploy/create-issues-from-yaml.js
```

## 📦 빌드 프로세스

1. `npm run build` - Vite 빌드
2. `npm run generate:sitemap` - Sitemap 생성
3. `npm run generate:rss` - RSS Feed 생성
4. Vercel 자동 배포

## 📝 참고사항

- Sitemap: `public/sitemap.xml`
- RSS: `public/rss.xml`
- OG 이미지: `public/og/`
- GitHub Actions 필요: cancel-non-deployment-workflows
