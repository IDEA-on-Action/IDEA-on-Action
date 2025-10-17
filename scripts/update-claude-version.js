const fs = require('fs');
const path = require('path');

// package.json에서 버전 읽기
const packageJson = require('../package.json');
const version = packageJson.version;

// CLAUDE.md 경로
const claudePath = path.join(__dirname, '../CLAUDE.md');
let claudeContent = fs.readFileSync(claudePath, 'utf-8');

// 버전 정규식 매칭 및 교체
claudeContent = claudeContent.replace(
  /(\*\*프로젝트 버전\*\*: )[\d.]+/,
  `$1${version}`
);

// 날짜 업데이트 (YYYY-MM-DD 형식)
const today = new Date().toISOString().split('T')[0];
claudeContent = claudeContent.replace(
  /(\*\*마지막 업데이트\*\*: )[\d-]+/,
  `$1${today}`
);

// 파일 저장
fs.writeFileSync(claudePath, claudeContent, 'utf-8');

console.log(`✅ CLAUDE.md 버전 업데이트: v${version} (${today})`);
