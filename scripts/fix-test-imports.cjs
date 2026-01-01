const fs = require('fs');
const path = require('path');

const replacements = [
  // useAuth 경로 수정
  ["from '@/hooks/useAuth'", "from '@/hooks/auth/useAuth'"],
  ["vi.mock('@/hooks/useAuth'", "vi.mock('@/hooks/auth/useAuth'"],
  ["vi.unmock('@/hooks/useAuth'", "vi.unmock('@/hooks/auth/useAuth'"],
  ["import('@/hooks/useAuth')", "import('@/hooks/auth/useAuth')"],
  ["import { useAuth } from '@/hooks/useAuth'", "import { useAuth } from '@/hooks/auth/useAuth'"],
];

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walkDir(filepath, callback);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filepath);
    }
  });
}

let modifiedCount = 0;

function processFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  let modified = false;
  
  replacements.forEach(([oldStr, newStr]) => {
    if (content.includes(oldStr)) {
      content = content.split(oldStr).join(newStr);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filepath, content, 'utf8');
    modifiedCount++;
    console.log('Modified:', filepath);
  }
}

walkDir('tests', processFile);
console.log('\nTotal files modified:', modifiedCount);
