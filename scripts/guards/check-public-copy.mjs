#!/usr/bin/env node
/**
 * 공개 문구 검사 (K-FDE Studio 소개 페이지)
 *
 * 검사 항목
 *   1. 긴 줄표(U+2014, U+2015)가 공개 문구에 없는지
 *   2. 금칙어 목록의 낱말이 공개 문구에 없는지
 *
 * 금칙어 목록은 저장소에 두지 않습니다. 목록 자체가 비공개 정보이기 때문입니다.
 *   - 환경 변수 BLOCKED_TOKENS_JSON: blocked-tokens.json 의 내용 전체
 *   - 또는 환경 변수 BLOCKED_TOKENS_PATH / 인자 --tokens <경로>: 파일 경로
 *
 * 결과
 *   - 통과: 종료 코드 0
 *   - 위반: 종료 코드 1
 *   - 미측정: 검사 대상 문구가 0건이면 종료 코드 2.
 *     금칙어 목록이 없으면 금칙어 항목만 미측정으로 기록하고 종료 코드 0 (--strict 이면 2).
 *   미측정은 통과가 아닙니다. 출력과 작업 요약에 「미측정」으로 남깁니다.
 *
 * 검사가 실제로 동작하는지 확인하려고 실행할 때마다 양성 대조군을 돌립니다.
 * 문구 사본에 긴 줄표와 금칙어를 일부러 넣었을 때 잡히지 않으면 종료 코드 1 입니다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** 검사 대상 파일. 화면 문구가 들어가는 파일을 추가하면 여기에도 추가합니다. */
export const TARGET_FILES = [
  'src/data/products/kfde-studio.ts',
  'src/pages/services-platform/KfdeStudioPage.tsx',
];

const LONG_DASHES = ['—', '―'];

/** 소스 파일에서 문자열 리터럴과 JSX 글자를 뽑아 검사 대상 문구로 삼는다. */
export function extractTexts(source) {
  const texts = [];
  const literal = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  for (const match of source.matchAll(literal)) {
    const value = match[1] ?? match[2] ?? match[3] ?? '';
    if (value.trim()) texts.push(value);
  }
  const jsxText = />([^<>{}]*[가-힣][^<>{}]*)</g;
  for (const match of source.matchAll(jsxText)) {
    if (match[1].trim()) texts.push(match[1].trim());
  }
  return texts;
}

/** 금칙어 JSON 에서 낱말을 모은다. 범주별 배열, 중첩 객체, { token | pattern | value } 항목을 모두 받는다. */
export function collectTokens(node, category = 'tokens', out = []) {
  if (typeof node === 'string') {
    const token = node.trim();
    if (token) out.push({ token, category });
  } else if (Array.isArray(node)) {
    node.forEach((item) => collectTokens(item, category, out));
  } else if (node && typeof node === 'object') {
    const direct = node.token ?? node.pattern ?? node.value;
    if (typeof direct === 'string') {
      collectTokens(direct, category, out);
    } else {
      for (const [key, value] of Object.entries(node)) {
        // 설명용 칸은 금칙어가 아니다
        if (['description', 'note', 'notes', 'comment', 'version', 'updated_at', '$schema'].includes(key)) continue;
        collectTokens(value, key, out);
      }
    }
  }
  return out;
}

export function findDashes(texts) {
  return texts.flatMap((text) => LONG_DASHES.filter((dash) => text.includes(dash)).map(() => ({ text })));
}

export function findTokens(texts, tokens) {
  const hits = [];
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const { token, category } of tokens) {
      if (lower.includes(token.toLowerCase())) hits.push({ text, category });
    }
  }
  return hits;
}

function loadTokens(argv, env) {
  const flag = argv.indexOf('--tokens');
  const filePath = flag >= 0 ? argv[flag + 1] : env.BLOCKED_TOKENS_PATH;
  let raw = env.BLOCKED_TOKENS_JSON;
  if (!raw && filePath) raw = fs.readFileSync(path.resolve(filePath), 'utf-8');
  if (!raw || !raw.trim()) return null;
  return collectTokens(JSON.parse(raw));
}

function summarize(lines, env) {
  const body = lines.join('\n');
  console.log(body);
  if (env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `### 공개 문구 검사\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`);
  }
}

export function run({ argv = [], env = {}, readFile = (file) => fs.readFileSync(path.join(ROOT, file), 'utf-8') } = {}) {
  const strict = argv.includes('--strict');
  const lines = [];
  const texts = TARGET_FILES.flatMap((file) => extractTexts(readFile(file)));

  if (texts.length === 0) {
    lines.push('미측정: 검사 대상 문구가 0건입니다. 검사 대상 파일 목록을 확인해야 합니다.');
    return { code: 2, lines };
  }
  lines.push(`검사 대상 문구: ${texts.length}건 (${TARGET_FILES.join(', ')})`);

  let code = 0;

  // 1. 긴 줄표
  if (findDashes([...texts, `대조군 ${LONG_DASHES[0]} 문장`]).length !== findDashes(texts).length + 1) {
    lines.push('실패: 긴 줄표 양성 대조군이 잡히지 않았습니다.');
    code = 1;
  }
  const dashHits = findDashes(texts);
  if (dashHits.length > 0) {
    lines.push(`위반: 긴 줄표 ${dashHits.length}건`);
    dashHits.forEach((hit) => lines.push(`  · ${hit.text}`));
    code = 1;
  } else {
    lines.push('통과: 긴 줄표 0건 (양성 대조군 확인)');
  }

  // 2. 금칙어
  let tokens;
  try {
    tokens = loadTokens(argv, env);
  } catch (error) {
    lines.push(`실패: 금칙어 목록을 읽지 못했습니다 (${error instanceof Error ? error.message : error})`);
    return { code: 1, lines };
  }

  if (!tokens || tokens.length === 0) {
    lines.push('미측정: 금칙어 목록이 없어 금칙어 검사를 하지 못했습니다. 통과가 아닙니다.');
    if (env.GITHUB_ACTIONS) console.log('::warning title=공개 문구 검사::금칙어 목록(KFDE_BLOCKED_TOKENS_JSON)이 없어 금칙어 검사는 미측정입니다.');
    if (strict && code === 0) code = 2;
    return { code, lines };
  }

  // 양성 대조군: 목록의 낱말을 넣은 문장이 잡혀야 한다
  const control = findTokens([`대조군 ${tokens[0].token} 문장`], tokens);
  if (control.length === 0) {
    lines.push('실패: 금칙어 양성 대조군이 잡히지 않았습니다.');
    code = 1;
  }

  const tokenHits = findTokens(texts, tokens);
  if (tokenHits.length > 0) {
    // 금칙어 자체는 공개 로그에 찍지 않고 범주와 문장만 남긴다
    lines.push(`위반: 금칙어 ${tokenHits.length}건`);
    tokenHits.forEach((hit) => lines.push(`  · [${hit.category}] ${hit.text}`));
    code = 1;
  } else if (control.length > 0) {
    lines.push(`통과: 금칙어 0건 (목록 ${tokens.length}개, 양성 대조군 확인)`);
  }

  return { code, lines };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = run({ argv: process.argv.slice(2), env: process.env });
  summarize(result.lines, process.env);
  process.exit(result.code);
}
