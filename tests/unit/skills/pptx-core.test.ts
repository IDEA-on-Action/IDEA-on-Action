/**
 * PowerPoint Core 라이브러리 테스트
 *
 * @group unit
 * @group skills
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPresentation,
  addSlide,
  addTextBox,
  addImage,
  exportPresentation,
} from '@/lib/skills/pptx/core';
import type {
  Presentation,
  Slide,
  SlideLayout,
  CreatePresentationOptions,
  AddSlideOptions,
} from '@/types/pptx.types';

// ============================================================================
// Mock Setup
// ============================================================================

// crypto.randomUUID Mock
const mockUUID = '12345678-1234-1234-1234-123456789abc';
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => mockUUID),
});

// ============================================================================
// createPresentation 테스트
// ============================================================================

describe('createPresentation', () => {
  it('기본 옵션으로 프레젠테이션 생성', () => {
    const presentation = createPresentation();

    expect(presentation).toBeDefined();
    expect(presentation.id).toBe(mockUUID);
    expect(presentation.metadata.title).toBe('새 프레젠테이션');
    expect(presentation.slides).toEqual([]);
  });

  it('메타데이터를 포함한 프레젠테이션 생성', () => {
    const options: CreatePresentationOptions = {
      metadata: {
        title: '월간 보고서',
        author: '홍길동',
        company: '생각과행동',
        subject: '프로젝트 현황',
        keywords: ['보고서', '프로젝트'],
      },
    };

    const presentation = createPresentation(options);

    expect(presentation.metadata.title).toBe('월간 보고서');
    expect(presentation.metadata.author).toBe('홍길동');
    expect(presentation.metadata.company).toBe('생각과행동');
    expect(presentation.metadata.subject).toBe('프로젝트 현황');
    expect(presentation.metadata.keywords).toEqual(['보고서', '프로젝트']);
  });

  it('스타일 옵션을 포함한 프레젠테이션 생성', () => {
    const options: CreatePresentationOptions = {
      styles: {
        primaryColor: '#3B82F6',
        secondaryColor: '#0F172A',
        fontFamily: 'Arial',
        fontSize: 18,
      },
    };

    const presentation = createPresentation(options);

    expect(presentation.styles).toEqual(options.styles);
  });

  it('부분 메타데이터로 프레젠테이션 생성', () => {
    const options: CreatePresentationOptions = {
      metadata: {
        title: '테스트 프레젠테이션',
      },
    };

    const presentation = createPresentation(options);

    expect(presentation.metadata.title).toBe('테스트 프레젠테이션');
    expect(presentation.metadata.author).toBeUndefined();
  });
});

// ============================================================================
// addSlide 테스트
// ============================================================================

describe('addSlide', () => {
  let presentation: Presentation;

  beforeEach(() => {
    presentation = createPresentation();
  });

  it('제목 레이아웃 슬라이드 추가', () => {
    const options: AddSlideOptions = {
      layout: 'title' as SlideLayout,
      title: '프로젝트 개요',
      content: {
        type: 'title',
        title: '프로젝트 개요',
        subtitle: '2025년 1분기',
      },
    };

    const slide = addSlide(presentation, options);

    expect(slide).toBeDefined();
    expect(slide.id).toBe(mockUUID);
    expect(slide.layout).toBe('title');
    expect(slide.title).toBe('프로젝트 개요');
    expect(slide.elements).toHaveLength(2); // 제목 + 부제목
    expect(presentation.slides).toHaveLength(1);
  });

  it('콘텐츠 레이아웃 슬라이드 추가', () => {
    const options: AddSlideOptions = {
      layout: 'content' as SlideLayout,
      content: {
        type: 'content',
        title: '주요 기능',
        content: ['기능 1', '기능 2', '기능 3'],
      },
    };

    const slide = addSlide(presentation, options);

    expect(slide.layout).toBe('content');
    expect(slide.elements).toHaveLength(4); // 제목 + 3개 항목
  });

  it('2단 레이아웃 슬라이드 추가', () => {
    const options: AddSlideOptions = {
      layout: 'twoColumn' as SlideLayout,
      content: {
        type: 'twoColumn',
        title: '장단점 분석',
        leftTitle: '장점',
        rightTitle: '단점',
        leftContent: ['장점 1', '장점 2'],
        rightContent: ['단점 1', '단점 2'],
      },
    };

    const slide = addSlide(presentation, options);

    expect(slide.layout).toBe('twoColumn');
    expect(slide.elements).toHaveLength(7); // 제목 + 좌측제목 + 우측제목 + 각 2개씩
  });

  it('이미지 레이아웃 슬라이드 추가', () => {
    const options: AddSlideOptions = {
      layout: 'imageOnly' as SlideLayout,
      content: {
        type: 'image',
        title: '프로젝트 스크린샷',
        imageUrl: 'https://example.com/image.png',
        imageLayout: 'center',
        caption: '메인 화면',
      },
    };

    const slide = addSlide(presentation, options);

    expect(slide.layout).toBe('imageOnly');
    expect(slide.elements.length).toBeGreaterThan(0);
  });

  it('차트 레이아웃 슬라이드 추가', () => {
    const options: AddSlideOptions = {
      layout: 'chart' as SlideLayout,
      content: {
        type: 'chart',
        title: '월별 매출',
        chartData: {
          type: 'bar',
          labels: ['1월', '2월', '3월'],
          values: [100, 150, 200],
          seriesName: '매출',
        },
        showLegend: true,
        showDataLabels: true,
      },
    };

    const slide = addSlide(presentation, options);

    expect(slide.layout).toBe('chart');
    expect(slide.elements).toHaveLength(2); // 제목 + 차트
  });

  it('인용 레이아웃 슬라이드 추가', () => {
    const options: AddSlideOptions = {
      layout: 'quote' as SlideLayout,
      content: {
        type: 'quote',
        quoteText: 'Stay hungry, stay foolish',
        quoteAuthor: 'Steve Jobs',
      },
    };

    const slide = addSlide(presentation, options);

    expect(slide.layout).toBe('quote');
    expect(slide.elements).toHaveLength(2); // 인용문 + 출처
  });

  it('배경색과 노트가 포함된 슬라이드 추가', () => {
    const options: AddSlideOptions = {
      layout: 'content' as SlideLayout,
      backgroundColor: '#F0F0F0',
      notes: '발표자 노트 내용',
    };

    const slide = addSlide(presentation, options);

    expect(slide.backgroundColor).toBe('#F0F0F0');
    expect(slide.notes).toBe('발표자 노트 내용');
  });

  it('여러 슬라이드 순차 추가', () => {
    addSlide(presentation, {
      layout: 'title' as SlideLayout,
      content: { type: 'title', title: '제목 슬라이드' },
    });
    addSlide(presentation, {
      layout: 'content' as SlideLayout,
      content: { type: 'content', title: '콘텐츠', content: ['항목'] },
    });

    expect(presentation.slides).toHaveLength(2);
  });
});

// ============================================================================
// addTextBox 테스트
// ============================================================================

describe('addTextBox', () => {
  let presentation: Presentation;
  let slide: Slide;

  beforeEach(() => {
    presentation = createPresentation();
    slide = addSlide(presentation, {
      layout: 'content' as SlideLayout,
    });
  });

  it('기본 텍스트 박스 추가', () => {
    const initialLength = slide.elements.length;

    addTextBox(slide, {
      text: '테스트 텍스트',
      position: { x: 1, y: 2, w: 8, h: 1 },
    });

    expect(slide.elements).toHaveLength(initialLength + 1);
    const element = slide.elements[slide.elements.length - 1];
    expect(element.type).toBe('text');
    if (element.type === 'text') {
      expect(element.text).toBe('테스트 텍스트');
    }
  });

  it('스타일이 포함된 텍스트 박스 추가', () => {
    addTextBox(slide, {
      text: '스타일 텍스트',
      position: { x: 1, y: 2, w: 8, h: 1 },
      style: {
        fontSize: 24,
        bold: true,
        italic: true,
        color: '#FF0000',
        align: 'center',
      },
    });

    const element = slide.elements[slide.elements.length - 1];
    if (element.type === 'text') {
      expect(element.style?.fontSize).toBe(24);
      expect(element.style?.bold).toBe(true);
      expect(element.style?.italic).toBe(true);
      expect(element.style?.color).toBe('#FF0000');
      expect(element.style?.align).toBe('center');
    }
  });
});

// ============================================================================
// addImage 테스트
// ============================================================================

describe('addImage', () => {
  let presentation: Presentation;
  let slide: Slide;

  beforeEach(() => {
    presentation = createPresentation();
    slide = addSlide(presentation, {
      layout: 'imageOnly' as SlideLayout,
    });
  });

  it('URL 이미지 추가', () => {
    const initialLength = slide.elements.length;

    addImage(slide, {
      imageData: 'https://example.com/image.png',
      position: { x: 2, y: 2, w: 6, h: 3 },
    });

    expect(slide.elements).toHaveLength(initialLength + 1);
    const element = slide.elements[slide.elements.length - 1];
    expect(element.type).toBe('image');
    if (element.type === 'image') {
      expect(element.imageData).toBe('https://example.com/image.png');
    }
  });

  it('Base64 이미지 추가', () => {
    const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANS...';

    addImage(slide, {
      imageData: base64Data,
      position: { x: 2, y: 2, w: 6, h: 3 },
      altText: '로고 이미지',
    });

    const element = slide.elements[slide.elements.length - 1];
    if (element.type === 'image') {
      expect(element.imageData).toBe(base64Data);
      expect(element.altText).toBe('로고 이미지');
    }
  });
});

// ============================================================================
// exportPresentation 테스트
// ============================================================================

describe('exportPresentation', () => {
  // pptxgenjs Mock
  const mockWriteFile = vi.fn().mockResolvedValue(new Blob());
  const mockAddSlide = vi.fn().mockReturnValue({
    addText: vi.fn(),
    addImage: vi.fn(),
    addChart: vi.fn(),
    addTable: vi.fn(),
    addNotes: vi.fn(),
    pptx: {
      ChartType: {
        line: 'line',
        bar: 'bar',
        pie: 'pie',
        area: 'area',
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // pptxgenjs 동적 import Mock
    vi.doMock('pptxgenjs', () => ({
      default: vi.fn().mockImplementation(() => ({
        author: '',
        company: '',
        subject: '',
        title: '',
        addSlide: mockAddSlide,
        write: mockWriteFile,
      })),
    }));
  });

  it('빈 프레젠테이션 내보내기', async () => {
    const presentation = createPresentation();

    const result = await exportPresentation(presentation, 'test');

    expect(result.success).toBe(true);
    expect(result.fileName).toBe('test.pptx');
  });

  it('슬라이드가 포함된 프레젠테이션 내보내기', async () => {
    const presentation = createPresentation();
    addSlide(presentation, {
      layout: 'title' as SlideLayout,
      content: {
        type: 'title',
        title: '테스트 제목',
        subtitle: '테스트 부제목',
      },
    });

    const result = await exportPresentation(presentation, 'presentation');

    expect(result.success).toBe(true);
    expect(result.fileName).toBe('presentation.pptx');
  });

  it('파일명 미지정 시 기본값 사용', async () => {
    const presentation = createPresentation();

    const result = await exportPresentation(presentation);

    expect(result.fileName).toBe('presentation.pptx');
  });

  it('내보내기 오류 처리', async () => {
    // 에러를 발생시키는 Mock
    vi.doMock('pptxgenjs', () => ({
      default: vi.fn().mockImplementation(() => {
        throw new Error('pptxgenjs 로드 실패');
      }),
    }));

    const presentation = createPresentation();

    const result = await exportPresentation(presentation, 'error-test');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// 통합 테스트
// ============================================================================

describe('통합 시나리오', () => {
  it('전체 프레젠테이션 생성 워크플로우', () => {
    // 1. 프레젠테이션 생성
    const presentation = createPresentation({
      metadata: {
        title: '월간 보고서',
        author: '홍길동',
      },
    });

    expect(presentation).toBeDefined();

    // 2. 제목 슬라이드 추가
    const titleSlide = addSlide(presentation, {
      layout: 'title' as SlideLayout,
      content: {
        type: 'title',
        title: '월간 보고서',
        subtitle: '2025년 12월',
      },
    });

    expect(titleSlide).toBeDefined();

    // 3. 콘텐츠 슬라이드 추가
    const contentSlide = addSlide(presentation, {
      layout: 'content' as SlideLayout,
      content: {
        type: 'content',
        title: '주요 성과',
        content: ['성과 1', '성과 2', '성과 3'],
      },
    });

    expect(contentSlide).toBeDefined();

    // 4. 슬라이드에 추가 요소 추가
    addTextBox(contentSlide, {
      text: '추가 정보',
      position: { x: 1, y: 5, w: 8, h: 0.5 },
      style: { fontSize: 14, italic: true },
    });

    // 5. 검증
    expect(presentation.slides).toHaveLength(2);
    expect(contentSlide.elements.length).toBeGreaterThan(0);
  });

  it('다양한 레이아웃 슬라이드 생성', () => {
    const presentation = createPresentation();

    // 제목
    addSlide(presentation, {
      layout: 'title' as SlideLayout,
      content: { type: 'title', title: '제목' },
    });

    // 콘텐츠
    addSlide(presentation, {
      layout: 'content' as SlideLayout,
      content: { type: 'content', title: '콘텐츠', content: ['항목'] },
    });

    // 2단
    addSlide(presentation, {
      layout: 'twoColumn' as SlideLayout,
      content: {
        type: 'twoColumn',
        leftContent: ['좌측'],
        rightContent: ['우측'],
      },
    });

    // 차트
    addSlide(presentation, {
      layout: 'chart' as SlideLayout,
      content: {
        type: 'chart',
        chartData: {
          type: 'bar',
          labels: ['A'],
          values: [100],
        },
      },
    });

    expect(presentation.slides).toHaveLength(4);
  });
});
