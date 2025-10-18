#!/usr/bin/env node

/**
 * Auto Fix Errors
 * 
 * 자동으로 에러를 수정하는 스크립트
 * - import 경로 수정 (경로 오류)
 * - 타입 에러 자동 수정 (any 타입 추가 등)
 * - 미사용 변수/import 제거
 * - ESLint 자동 수정 적용
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 설정
const CONFIG = {
  backupDir: 'backups',
  maxRetries: 3,
  supportedExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  fixablePatterns: {
    unusedImport: /import\s+{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"]/g,
    unusedVariable: /(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
    missingSemicolon: /([^;}])\s*$/gm,
    typeError: /Type\s+'([^']+)'\s+is\s+not\s+assignable\s+to\s+type\s+'([^']+)'/g
  }
};

class AutoFixErrors {
  constructor() {
    this.fixedFiles = [];
    this.failedFixes = [];
    this.backupFiles = [];
    this.ensureDirectories();
  }

  /**
   * 필요한 디렉토리들을 생성합니다.
   */
  ensureDirectories() {
    if (!fs.existsSync(CONFIG.backupDir)) {
      fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }
  }

  /**
   * 파일을 백업합니다.
   */
  backupFile(filePath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(CONFIG.backupDir, `${path.basename(filePath)}-${timestamp}.bak`);
    
    try {
      fs.copyFileSync(filePath, backupPath);
      this.backupFiles.push(backupPath);
      console.log(`📁 백업 생성: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error(`❌ 백업 실패: ${filePath}`, error.message);
      return null;
    }
  }

  /**
   * ESLint 자동 수정을 실행합니다.
   */
  async runESLintFix() {
    console.log('🔧 ESLint 자동 수정 실행 중...');
    
    try {
      execSync('npm run lint -- --fix', { stdio: 'inherit' });
      console.log('✅ ESLint 자동 수정 완료');
      return true;
    } catch (error) {
      console.warn('⚠️ ESLint 자동 수정 실패:', error.message);
      return false;
    }
  }

  /**
   * 미사용 import를 제거합니다.
   */
  fixUnusedImports(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      let modified = false;

      // 미사용 import 감지 및 제거
      const importMatches = content.match(/import\s+{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"]/g);
      
      if (importMatches) {
        importMatches.forEach(match => {
          // import된 변수들이 실제로 사용되는지 확인
          const importVars = match.match(/{\s*([^}]+)\s*}/)[1].split(',').map(v => v.trim());
          const unusedVars = importVars.filter(varName => {
            const varRegex = new RegExp(`\\b${varName}\\b`, 'g');
            const matches = content.match(varRegex);
            return matches && matches.length <= 1; // import 선언에서만 사용됨
          });

          if (unusedVars.length === importVars.length) {
            // 모든 변수가 미사용이면 import 전체 제거
            content = content.replace(match + '\n', '');
            modified = true;
          } else if (unusedVars.length > 0) {
            // 일부 변수만 미사용이면 해당 변수만 제거
            const usedVars = importVars.filter(v => !unusedVars.includes(v));
            const newImport = match.replace(/{\s*[^}]+\s*}/, `{ ${usedVars.join(', ')} }`);
            content = content.replace(match, newImport);
            modified = true;
          }
        });
      }

      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ 미사용 import 수정: ${filePath}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ 미사용 import 수정 실패: ${filePath}`, error.message);
      return false;
    }
  }

  /**
   * 미사용 변수를 제거합니다.
   */
  fixUnusedVariables(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      let modified = false;

      // 미사용 변수 감지 및 제거
      const variableMatches = content.match(/(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g);
      
      if (variableMatches) {
        variableMatches.forEach(match => {
          const varName = match.match(/(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/)[2];
          const varRegex = new RegExp(`\\b${varName}\\b`, 'g');
          const matches = content.match(varRegex);
          
          if (matches && matches.length <= 1) {
            // 변수 선언에서만 사용됨 (미사용)
            const lineRegex = new RegExp(`.*${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*\n?`, 'g');
            content = content.replace(lineRegex, '');
            modified = true;
          }
        });
      }

      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ 미사용 변수 제거: ${filePath}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ 미사용 변수 제거 실패: ${filePath}`, error.message);
      return false;
    }
  }

  /**
   * 누락된 세미콜론을 추가합니다.
   */
  fixMissingSemicolons(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      let modified = false;

      // 세미콜론이 누락된 라인 찾기
      const lines = content.split('\n');
      const fixedLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed && 
            !trimmed.endsWith(';') && 
            !trimmed.endsWith('{') && 
            !trimmed.endsWith('}') && 
            !trimmed.endsWith(',') &&
            !trimmed.startsWith('//') &&
            !trimmed.startsWith('*') &&
            !trimmed.startsWith('import') &&
            !trimmed.startsWith('export') &&
            !trimmed.includes('if') &&
            !trimmed.includes('for') &&
            !trimmed.includes('while') &&
            !trimmed.includes('function') &&
            !trimmed.includes('=>')) {
          modified = true;
          return line + ';';
        }
        return line;
      });

      if (modified) {
        const fixedContent = fixedLines.join('\n');
        fs.writeFileSync(filePath, fixedContent);
        console.log(`✅ 누락된 세미콜론 추가: ${filePath}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ 세미콜론 수정 실패: ${filePath}`, error.message);
      return false;
    }
  }

  /**
   * 타입 에러를 수정합니다.
   */
  fixTypeErrors(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      let modified = false;

      // null/undefined 체크 추가
      const nullCheckPattern = /(\w+)\s*\.\s*(\w+)/g;
      content = content.replace(nullCheckPattern, (match, obj, prop) => {
        if (match.includes('?.')) return match; // 이미 옵셔널 체이닝 사용 중
        
        // null 체크가 없는 경우 옵셔널 체이닝으로 변경
        const beforeMatch = content.substring(0, content.indexOf(match));
        const linesBefore = beforeMatch.split('\n');
        const currentLine = linesBefore[linesBefore.length - 1];
        
        if (!currentLine.includes('if') && !currentLine.includes('&&')) {
          modified = true;
          return `${obj}?.${prop}`;
        }
        return match;
      });

      // any 타입 추가 (복잡한 타입 에러의 경우)
      const typeErrorPattern = /:\s*([^=;]+)\s*=/g;
      content = content.replace(typeErrorPattern, (match, type) => {
        if (type.includes('any') || type.includes('unknown')) return match;
        
        // 타입이 명시되지 않은 경우 any 추가
        if (!type.trim() || type.trim() === '=') {
          modified = true;
          return match.replace(type, 'any');
        }
        return match;
      });

      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ 타입 에러 수정: ${filePath}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ 타입 에러 수정 실패: ${filePath}`, error.message);
      return false;
    }
  }

  /**
   * 파일을 수정합니다.
   */
  async fixFile(filePath) {
    console.log(`🔧 파일 수정 중: ${filePath}`);
    
    // 백업 생성
    const backupPath = this.backupFile(filePath);
    if (!backupPath) return false;

    let fixed = false;

    try {
      // 1. 미사용 import 제거
      if (this.fixUnusedImports(filePath)) fixed = true;

      // 2. 미사용 변수 제거
      if (this.fixUnusedVariables(filePath)) fixed = true;

      // 3. 누락된 세미콜론 추가
      if (this.fixMissingSemicolons(filePath)) fixed = true;

      // 4. 타입 에러 수정
      if (this.fixTypeErrors(filePath)) fixed = true;

      if (fixed) {
        this.fixedFiles.push(filePath);
        console.log(`✅ 파일 수정 완료: ${filePath}`);
        return true;
      } else {
        console.log(`ℹ️ 수정할 내용이 없음: ${filePath}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ 파일 수정 실패: ${filePath}`, error.message);
      this.failedFixes.push({ file: filePath, error: error.message });
      
      // 실패 시 백업에서 복원
      if (backupPath && fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, filePath);
        console.log(`🔄 백업에서 복원: ${filePath}`);
      }
      
      return false;
    }
  }

  /**
   * 소스 파일들을 찾습니다.
   */
  findSourceFiles(dir = 'src') {
    const files = [];
    
    const scanDirectory = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile() && CONFIG.supportedExtensions.includes(path.extname(item))) {
          files.push(fullPath);
        }
      });
    };

    if (fs.existsSync(dir)) {
      scanDirectory(dir);
    }
    
    return files;
  }

  /**
   * 모든 파일을 수정합니다.
   */
  async fixAllFiles() {
    console.log('🔍 수정할 파일들을 찾는 중...');
    
    const files = this.findSourceFiles();
    console.log(`📁 발견된 파일: ${files.length}개`);
    
    if (files.length === 0) {
      console.log('❌ 수정할 파일이 없습니다.');
      return false;
    }

    // ESLint 자동 수정 먼저 실행
    await this.runESLintFix();

    // 각 파일별로 수정
    for (const file of files) {
      await this.fixFile(file);
    }

    return this.fixedFiles.length > 0;
  }

  /**
   * 수정 결과를 검증합니다.
   */
  async verifyFixes() {
    console.log('🔍 수정 결과 검증 중...');
    
    try {
      // 빌드 테스트
      execSync('npm run build', { stdio: 'pipe' });
      console.log('✅ 빌드 성공');
      
      // 린트 테스트
      execSync('npm run lint', { stdio: 'pipe' });
      console.log('✅ 린트 통과');
      
      // 타입 체크
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      console.log('✅ 타입 체크 통과');
      
      return true;
    } catch (error) {
      console.error('❌ 검증 실패:', error.message);
      return false;
    }
  }

  /**
   * 수정 요약을 출력합니다.
   */
  printSummary() {
    console.log('\n📊 자동 수정 결과');
    console.log('==================');
    console.log(`수정된 파일: ${this.fixedFiles.length}개`);
    console.log(`실패한 수정: ${this.failedFixes.length}개`);
    console.log(`백업 파일: ${this.backupFiles.length}개`);
    
    if (this.fixedFiles.length > 0) {
      console.log('\n✅ 수정된 파일들:');
      this.fixedFiles.forEach(file => console.log(`   - ${file}`));
    }
    
    if (this.failedFixes.length > 0) {
      console.log('\n❌ 수정 실패한 파일들:');
      this.failedFixes.forEach(({ file, error }) => {
        console.log(`   - ${file}: ${error}`);
      });
    }
    
    if (this.backupFiles.length > 0) {
      console.log('\n📁 백업 파일들:');
      this.backupFiles.forEach(file => console.log(`   - ${file}`));
    }
  }

  /**
   * 메인 실행 함수
   */
  async run() {
    console.log('🤖 자동 에러 수정 시작');
    console.log('======================\n');

    // 1. 모든 파일 수정
    const fixed = await this.fixAllFiles();
    
    if (!fixed) {
      console.log('ℹ️ 수정할 에러가 없습니다.');
      return;
    }

    // 2. 수정 결과 검증
    const verified = await this.verifyFixes();
    
    if (verified) {
      console.log('\n🎉 모든 수정이 성공적으로 완료되었습니다!');
    } else {
      console.log('\n⚠️ 일부 수정이 실패했습니다. 수동 검토가 필요합니다.');
    }

    // 3. 결과 요약
    this.printSummary();
  }
}

// CLI 인터페이스
if (require.main === module) {
  const fixer = new AutoFixErrors();
  fixer.run().catch(console.error);
}

module.exports = AutoFixErrors;
