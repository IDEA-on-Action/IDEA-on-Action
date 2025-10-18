#!/usr/bin/env node

/**
 * 문서 현행화 에이전트
 * 
 * 작업 완료 후 문서를 자동으로 현행화하는 스크립트
 * - changelog.md 업데이트
 * - CLAUDE.md 슬림화
 * - project-todo.md 정리
 * - 문서 일관성 검증
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// ES 모듈에서 __dirname 사용을 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 설정
const CONFIG = {
  maxCLAUDESize: 30000,  // 30KB
  maxTodoSize: 15000,     // 15KB
  archiveThreshold: 90,   // 90일 이전 내용 아카이브
  dryRun: process.argv.includes('--check'),
};

// 날짜 포맷
function getToday() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// 파일 크기 확인
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (err) {
    return 0;
  }
}

// Git 커밋 로그 가져오기
function getRecentCommits(count = 5) {
  try {
    const output = execSync(`git log -${count} --pretty=format:"%h|%s|%ad" --date=short`, {
      encoding: 'utf-8'
    });
    return output.split('\n').map(line => {
      const [hash, subject, date] = line.split('|');
      return { hash, subject, date };
    });
  } catch (err) {
    console.error('Git 로그를 가져올 수 없습니다:', err.message);
    return [];
  }
}

// changelog.md 업데이트
function updateChangelog() {
  console.log('\n📝 Changelog 업데이트 확인 중...');
  
  const changelogPath = path.join(__dirname, '..', 'docs', 'project', 'changelog.md');
  const content = fs.readFileSync(changelogPath, 'utf-8');
  
  // [Unreleased] 섹션이 있는지 확인
  if (content.includes('## [Unreleased]')) {
    console.log('✅ [Unreleased] 섹션이 이미 존재합니다.');
    return false;
  }
  
  console.log('⚠️  [Unreleased] 섹션이 없습니다. 추가가 필요합니다.');
  return true;
}

// CLAUDE.md 슬림화
function slimdownCLAUDE() {
  console.log('\n📄 CLAUDE.md 크기 확인 중...');
  
  const claudePath = path.join(__dirname, '..', 'CLAUDE.md');
  const size = getFileSize(claudePath);
  
  console.log(`   현재 크기: ${(size / 1024).toFixed(1)}KB`);
  
  if (size > CONFIG.maxCLAUDESize) {
    console.log(`⚠️  ${(CONFIG.maxCLAUDESize / 1024).toFixed(0)}KB 초과! 슬림화가 필요합니다.`);
    return true;
  }
  
  console.log('✅ 크기가 적절합니다.');
  return false;
}

// project-todo.md 정리
function cleanupTodo() {
  console.log('\n📋 project-todo.md 크기 확인 중...');
  
  const todoPath = path.join(__dirname, '..', 'project-todo.md');
  const size = getFileSize(todoPath);
  
  console.log(`   현재 크기: ${(size / 1024).toFixed(1)}KB`);
  
  if (size > CONFIG.maxTodoSize) {
    console.log(`⚠️  ${(CONFIG.maxTodoSize / 1024).toFixed(0)}KB 초과! 정리가 필요합니다.`);
    return true;
  }
  
  console.log('✅ 크기가 적절합니다.');
  return false;
}

// 문서 일관성 검증
function verifyConsistency() {
  console.log('\n🔍 문서 일관성 검증 중...');
  
  const issues = [];
  
  // package.json 버전
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  const packageVersion = packageJson.version;
  
  // CLAUDE.md 버전
  const claudePath = path.join(__dirname, '..', 'CLAUDE.md');
  const claudeContent = fs.readFileSync(claudePath, 'utf-8');
  const claudeVersionMatch = claudeContent.match(/\*\*프로젝트 버전\*\*:\s*([0-9.]+)/);
  const claudeVersion = claudeVersionMatch ? claudeVersionMatch[1] : null;
  
  // project-todo.md 버전
  const todoPath = path.join(__dirname, '..', 'project-todo.md');
  const todoContent = fs.readFileSync(todoPath, 'utf-8');
  const todoVersionMatch = todoContent.match(/\*\*프로젝트 버전\*\*:\s*([0-9.]+)/);
  const todoVersion = todoVersionMatch ? todoVersionMatch[1] : null;
  
  console.log(`   package.json: v${packageVersion}`);
  console.log(`   CLAUDE.md:    v${claudeVersion}`);
  console.log(`   project-todo: v${todoVersion}`);
  
  if (claudeVersion !== packageVersion) {
    issues.push(`CLAUDE.md 버전 불일치 (expected: ${packageVersion}, actual: ${claudeVersion})`);
  }
  
  if (todoVersion !== packageVersion) {
    issues.push(`project-todo.md 버전 불일치 (expected: ${packageVersion}, actual: ${todoVersion})`);
  }
  
  if (issues.length > 0) {
    console.log('⚠️  일관성 문제 발견:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    return false;
  }
  
  console.log('✅ 모든 문서의 버전이 일치합니다.');
  return true;
}

// 메인 실행
function main() {
  console.log('🤖 문서 현행화 에이전트 실행');
  console.log(`모드: ${CONFIG.dryRun ? 'CHECK (검사만)' : 'UPDATE (업데이트)'}\n`);
  
  const tasks = [
    { name: 'Changelog 업데이트', fn: updateChangelog },
    { name: 'CLAUDE.md 슬림화', fn: slimdownCLAUDE },
    { name: 'project-todo.md 정리', fn: cleanupTodo },
    { name: '문서 일관성 검증', fn: verifyConsistency },
  ];
  
  const results = tasks.map(task => ({
    name: task.name,
    needsAction: task.fn()
  }));
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 실행 결과');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    const status = result.needsAction ? '⚠️  작업 필요' : '✅ 정상';
    console.log(`${status} - ${result.name}`);
  });
  
  const needsWork = results.filter(r => r.needsAction).length;
  
  if (needsWork > 0) {
    console.log(`\n⚠️  ${needsWork}개 항목에 작업이 필요합니다.`);
    
    if (CONFIG.dryRun) {
      console.log('\n💡 실제 업데이트를 수행하려면:');
      console.log('   npm run doc:update');
    } else {
      console.log('\n💡 Claude Code에서 다음 작업을 요청하세요:');
      console.log('   "문서 현행화 필요 항목을 처리해줘"');
    }
    
    process.exit(1);
  }
  
  console.log('\n✅ 모든 문서가 최신 상태입니다!');
  process.exit(0);
}

// 실행
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('doc-maintenance-agent.js')) {
  main();
}

export { updateChangelog, slimdownCLAUDE, cleanupTodo, verifyConsistency };
