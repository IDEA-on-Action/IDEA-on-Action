import { describe, it, expect } from 'vitest';
import {
  caseStudies,
  getCaseStudyBySlug,
  getCaseStudiesBySection,
  CASE_CATEGORY_LABELS,
  CASE_STAGE_LABELS,
} from '@/data/case-studies';

/** 사례 한 건의 공개 본문 전체 */
const bodyOf = (c: (typeof caseStudies)[number]) =>
  [c.summary, c.challenge, c.stageNote, c.role, ...c.highlights].join('\n');

describe('수행 사례 데이터', () => {
  it('위시켓 포트폴리오 번호 1~23이 빠짐없이 한 번씩 있다', () => {
    const numbers = caseStudies
      .map((c) => c.catalogNo)
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
  });

  it('slug 는 중복이 없고 주소에 쓸 수 있는 형식이다', () => {
    const slugs = caseStudies.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('회사 수행 사례는 결정된 일곱 건이다', () => {
    const company = getCaseStudiesBySection('company')
      .map((c) => c.catalogNo)
      .sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(company).toEqual([4, 5, 8, 9, 15, 16, 17]);
  });

  it('위시켓 목록에 없는 사례는 모두 대표 경력 구역이다', () => {
    const extras = caseStudies.filter((c) => c.catalogNo === null);
    expect(extras.length).toBeGreaterThan(0);
    for (const c of extras) {
      expect(c.section).toBe('career');
    }
  });

  it('모든 사례에 분야와 단계 표지, 본문이 있다', () => {
    for (const c of caseStudies) {
      expect(CASE_CATEGORY_LABELS[c.category]).toBeTruthy();
      expect(CASE_STAGE_LABELS[c.stage]).toBeTruthy();
      expect(c.summary.length).toBeGreaterThan(10);
      expect(c.challenge.length).toBeGreaterThan(10);
      expect(c.highlights.length).toBeGreaterThan(0);
    }
  });

  it('사례별 금지 표현이 본문에 들어 있지 않다', () => {
    for (const c of caseStudies) {
      const body = bodyOf(c);
      for (const phrase of c.forbidden) {
        expect(body, `${c.slug}: 「${phrase}」`).not.toContain(phrase);
      }
    }
  });

  it('고객사와 기관의 실명이 어디에도 없다', () => {
    const names = ['코레일', 'Korail', 'KORAIL', '태광', 'TKG', '기진회', '기계산업진흥회', 'KT', 'K-FDE', 'ARDP', '해양드론기술'];
    for (const c of caseStudies) {
      const text = [c.title, bodyOf(c), ...(c.tech ?? [])].join('\n');
      for (const name of names) {
        expect(text, `${c.slug}: ${name}`).not.toContain(name);
      }
    }
  });

  it('slug 로 사례를 찾는다', () => {
    expect(getCaseStudyBySlug('traditional-market-voucher-payment')?.catalogNo).toBe(7);
    expect(getCaseStudyBySlug('없는-사례')).toBeUndefined();
  });
});
