#!/usr/bin/env node
/**
 * 완료된 TODO 아카이브 스크립트
 *
 * 기능:
 * - project-todo.md에서 완료된 작업(✅) 추출
 * - 아카이브 파일로 이동 (docs/archive/completed-todos-YYYY-MM.md)
 * - project-todo.md에서 완료 항목 제거
 *
 * 실행 주기: 월 1회 (GitHub Actions)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TODO_FILE = path.join(PROJECT_ROOT, 'project-todo.md');
const ARCHIVE_DIR = path.join(PROJECT_ROOT, 'docs/archive');

// 현재 날짜 (YYYY-MM 형식)
const now = new Date();
const archiveMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

// TODO 파일 읽기
function readTodoFile() {
  if (!fs.existsSync(TODO_FILE)) {
    console.error('❌ project-todo.md 파일을 찾을 수 없습니다.');
    process.exit(1);
  }
  return fs.readFileSync(TODO_FILE, 'utf-8');
}

// 완료된 작업 추출
function extractCompletedTasks(content) {
  const lines = content.split('\n');
  const completed = [];
  const remaining = [];

  let inCompletedSection = false;
  let currentSection = [];

  for (const line of lines) {
    // 섹션 헤더 감지 (##, ###)
    if (line.match(/^#{2,3}\s/)) {
      if (inCompletedSection && currentSection.length > 0) {
        completed.push(...currentSection);
        currentSection = [];
      }
      inCompletedSection = false;
    }

    // 완료 표시 감지 (✅, [x], 100%)
    if (line.match(/✅|(\[x\])|(100%)/i)) {
      inCompletedSection = true;
      currentSection.push(line);
    } else if (inCompletedSection) {
      currentSection.push(line);
    } else {
      remaining.push(line);
    }
  }

  // 마지막 섹션 처리
  if (inCompletedSection && currentSection.length > 0) {
    completed.push(...currentSection);
  }

  return {
    completed: completed.join('\n').trim(),
    remaining: remaining.join('\n').trim()
  };
}

// 아카이브 파일 생성
function createArchiveFile(completedTasks) {
  if (!completedTasks) {
    console.log('ℹ️  완료된 작업이 없습니다.');
    return null;
  }

  const archiveFile = path.join(ARCHIVE_DIR, `completed-todos-${archiveMonth}.md`);

  const archiveContent = `# 완료된 작업 - ${archiveMonth}

> 이 파일은 자동으로 생성되었습니다. (${new Date().toISOString()})

## 완료된 작업

${completedTasks}

---

**아카이브 날짜**: ${new Date().toLocaleDateString('ko-KR')}
**원본 파일**: project-todo.md
**자동화**: scripts/archive-completed-todos.js
`;

  fs.writeFileSync(archiveFile, archiveContent, 'utf-8');
  console.log(`✅ 아카이브 파일 생성: ${archiveFile}`);

  return archiveFile;
}

// TODO 파일 업데이트
function updateTodoFile(remainingContent) {
  fs.writeFileSync(TODO_FILE, remainingContent, 'utf-8');
  console.log('✅ project-todo.md 업데이트 완료');
}

// 통계 출력
function printStats(completed, remaining) {
  const completedLines = completed.split('\n').filter(l => l.trim()).length;
  const remainingLines = remaining.split('\n').filter(l => l.trim()).length;

  console.log('\n📊 작업 통계:');
  console.log(`  - 완료: ${completedLines} 라인`);
  console.log(`  - 남은 작업: ${remainingLines} 라인`);
  console.log(`  - 아카이브: docs/archive/completed-todos-${archiveMonth}.md`);
}

// 메인 실행
function main() {
  console.log('🚀 완료된 TODO 아카이브 시작...\n');

  // 1. TODO 파일 읽기
  const todoContent = readTodoFile();

  // 2. 완료된 작업 추출
  const { completed, remaining } = extractCompletedTasks(todoContent);

  // 3. 아카이브 파일 생성
  const archiveFile = createArchiveFile(completed);

  if (!archiveFile) {
    console.log('✅ 아카이브할 작업이 없습니다.');
    return;
  }

  // 4. TODO 파일 업데이트
  updateTodoFile(remaining);

  // 5. 통계 출력
  printStats(completed, remaining);

  console.log('\n✅ 작업 완료!');
}

// 실행
main();
