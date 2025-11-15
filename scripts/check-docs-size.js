#!/usr/bin/env node
/**
 * 문서 크기 체크 스크립트
 *
 * 기능:
 * - CLAUDE.md, project-todo.md 크기 체크
 * - 목표 크기 초과 시 경고
 *
 * 목표:
 * - CLAUDE.md: 800 라인 이하
 * - project-todo.md: 300 라인 이하
 *
 * 실행 주기: 주 1회 (GitHub Actions)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');

const DOCS_CONFIG = {
  'CLAUDE.md': {
    maxLines: 800,
    warningThreshold: 0.9 // 90%
  },
  'project-todo.md': {
    maxLines: 300,
    warningThreshold: 0.9
  }
};

// 파일 라인 수 계산
function countLines(filePath) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n').length;
}

// 크기 체크
function checkDocSize(filename, config) {
  const filePath = path.join(PROJECT_ROOT, filename);
  const lines = countLines(filePath);
  const maxLines = config.maxLines;
  const warningLines = Math.floor(maxLines * config.warningThreshold);

  const percentage = (lines / maxLines * 100).toFixed(1);

  let status = '✅';
  let message = 'OK';

  if (lines > maxLines) {
    status = '❌';
    message = `초과 (${lines - maxLines} 라인)`;
  } else if (lines > warningLines) {
    status = '⚠️';
    message = `경고 (목표의 ${percentage}%)`;
  }

  return {
    filename,
    lines,
    maxLines,
    percentage,
    status,
    message,
    needsAction: lines > warningLines
  };
}

// 메인 실행
function main() {
  console.log('📏 문서 크기 체크 시작...\n');

  const results = Object.entries(DOCS_CONFIG).map(([filename, config]) =>
    checkDocSize(filename, config)
  );

  // 결과 출력
  console.log('┌─────────────────────┬────────┬─────────┬──────────┬──────────┐');
  console.log('│ 파일                │ 상태   │ 라인 수 │ 목표     │ 비율     │');
  console.log('├─────────────────────┼────────┼─────────┼──────────┼──────────┤');

  results.forEach(result => {
    const { filename, status, lines, maxLines, percentage } = result;
    console.log(
      `│ ${filename.padEnd(19)} │ ${status}    │ ${String(lines).padStart(7)} │ ${String(maxLines).padStart(8)} │ ${String(percentage).padStart(6)}%  │`
    );
  });

  console.log('└─────────────────────┴────────┴─────────┴──────────┴──────────┘\n');

  // 권장사항
  const needsAction = results.filter(r => r.needsAction);

  if (needsAction.length > 0) {
    console.log('⚠️  권장사항:\n');
    needsAction.forEach(result => {
      console.log(`  ${result.status} ${result.filename}: ${result.message}`);

      if (result.filename === 'CLAUDE.md') {
        console.log('     → 과거 업데이트를 docs/archive/CLAUDE-history-*.md로 이동하세요.');
      } else if (result.filename === 'project-todo.md') {
        console.log('     → 완료된 작업을 docs/archive/completed-todos-*.md로 이동하세요.');
        console.log('     → scripts/archive-completed-todos.js 실행');
      }
      console.log('');
    });
  } else {
    console.log('✅ 모든 문서가 목표 크기 내에 있습니다!\n');
  }

  // Exit code (CI/CD용)
  const hasErrors = results.some(r => r.lines > r.maxLines);
  process.exit(hasErrors ? 1 : 0);
}

// 실행
main();
