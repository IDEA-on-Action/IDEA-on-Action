/**
 * 색상 대비(Contrast Ratio) 검증 스크립트
 *
 * WCAG 2.1 AA 기준:
 * - 일반 텍스트: 최소 4.5:1
 * - 큰 텍스트 (18pt+/14pt+ bold): 최소 3:1
 * - UI 컴포넌트: 최소 3:1
 *
 * 실행: node scripts/check-color-contrast.cjs
 */

/**
 * HSL을 RGB로 변환
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {[number, number, number]} RGB (0-255)
 */
function hslToRgb(h, s, l) {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * RGB를 상대 휘도(Relative Luminance)로 변환
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} Relative luminance (0-1)
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * 두 색상 간의 대비율 계산
 * @param {[number, number, number]} rgb1 - RGB 1
 * @param {[number, number, number]} rgb2 - RGB 2
 * @returns {number} Contrast ratio (1-21)
 */
function getContrastRatio(rgb1, rgb2) {
  const lum1 = getLuminance(...rgb1);
  const lum2 = getLuminance(...rgb2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG 2.1 AA 준수 여부 판정
 * @param {number} ratio - Contrast ratio
 * @param {string} type - 'normal' | 'large' | 'ui'
 * @returns {{pass: boolean, level: string}}
 */
function checkWCAG(ratio, type = 'normal') {
  const thresholds = {
    normal: { AA: 4.5, AAA: 7 },
    large: { AA: 3, AAA: 4.5 },
    ui: { AA: 3, AAA: null },
  };

  const { AA, AAA } = thresholds[type];

  if (AAA && ratio >= AAA) return { pass: true, level: 'AAA' };
  if (ratio >= AA) return { pass: true, level: 'AA' };
  return { pass: false, level: 'FAIL' };
}

/**
 * 결과를 콘솔에 출력
 */
function printResults() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎨 디자인 시스템 색상 대비 검증');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Light Mode Colors
  const lightColors = {
    primary: [217, 91, 52],         // Updated: 60 → 52 for better contrast
    primaryFg: [210, 40, 98],
    secondary: [210, 40, 96.1],
    secondaryFg: [222.2, 47.4, 11.2],
    accent: [38, 92, 50],
    accentFg: [222.2, 84, 4.9],
    muted: [210, 40, 96.1],
    mutedFg: [215.4, 16.3, 40],
    background: [0, 0, 100],
    foreground: [222.2, 84, 4.9],
  };

  // Dark Mode Colors
  const darkColors = {
    primary: [217, 91, 52],         // Updated: 60 → 52 for better contrast
    primaryFg: [210, 40, 98],
    secondary: [217.2, 32.6, 17.5],
    secondaryFg: [210, 40, 98],
    accent: [43, 96, 56],
    accentFg: [222.2, 84, 4.9],     // Updated: dark text for light accent bg
    muted: [217.2, 32.6, 17.5],
    mutedFg: [215, 20.2, 70],
    background: [222.2, 84, 4.9],
    foreground: [210, 40, 98],
  };

  // Convert HSL to RGB
  const lightRGB = Object.fromEntries(
    Object.entries(lightColors).map(([key, [h, s, l]]) => [key, hslToRgb(h, s, l)])
  );
  const darkRGB = Object.fromEntries(
    Object.entries(darkColors).map(([key, [h, s, l]]) => [key, hslToRgb(h, s, l)])
  );

  // Test combinations
  const testCases = [
    // Light Mode
    { mode: 'Light', name: 'Primary Button (default)', fg: 'primaryFg', bg: 'primary', type: 'normal', colors: lightRGB },
    { mode: 'Light', name: 'Secondary Button', fg: 'secondaryFg', bg: 'secondary', type: 'normal', colors: lightRGB },
    { mode: 'Light', name: 'Accent Text', fg: 'accentFg', bg: 'accent', type: 'normal', colors: lightRGB },
    { mode: 'Light', name: 'Muted Text', fg: 'mutedFg', bg: 'background', type: 'normal', colors: lightRGB },
    { mode: 'Light', name: 'Outline Button (hover)', fg: 'accentFg', bg: 'accent', type: 'ui', colors: lightRGB },

    // Dark Mode
    { mode: 'Dark', name: 'Primary Button (default)', fg: 'primaryFg', bg: 'primary', type: 'normal', colors: darkRGB },
    { mode: 'Dark', name: 'Secondary Button', fg: 'secondaryFg', bg: 'secondary', type: 'normal', colors: darkRGB },
    { mode: 'Dark', name: 'Accent Text', fg: 'accentFg', bg: 'accent', type: 'normal', colors: darkRGB },
    { mode: 'Dark', name: 'Muted Text', fg: 'mutedFg', bg: 'background', type: 'normal', colors: darkRGB },
    { mode: 'Dark', name: 'Outline Button (hover)', fg: 'accentFg', bg: 'accent', type: 'ui', colors: darkRGB },
  ];

  let failCount = 0;
  let currentMode = '';

  testCases.forEach(({ mode, name, fg, bg, type, colors }) => {
    if (mode !== currentMode) {
      console.log(`\n📱 ${mode} Mode`);
      console.log('─'.repeat(60));
      currentMode = mode;
    }

    const ratio = getContrastRatio(colors[fg], colors[bg]);
    const result = checkWCAG(ratio, type);

    const icon = result.pass ? '✅' : '❌';
    const status = result.pass ? `${result.level}` : 'FAIL';

    console.log(`${icon} ${name}`);
    console.log(`   대비율: ${ratio.toFixed(2)}:1 (${status})`);
    console.log(`   전경색: rgb(${colors[fg].join(', ')})`);
    console.log(`   배경색: rgb(${colors[bg].join(', ')})`);

    if (!result.pass) {
      failCount++;
      const minRatio = type === 'normal' ? 4.5 : 3;
      console.log(`   ⚠️  최소 요구사항: ${minRatio}:1`);
    }
    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 검증 결과: ${testCases.length - failCount}/${testCases.length} 통과`);
  if (failCount > 0) {
    console.log(`❌ ${failCount}개 조합이 WCAG 2.1 AA 기준 미달`);
  } else {
    console.log('✅ 모든 색상 조합이 WCAG 2.1 AA 기준 충족');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('💡 권장사항:');
  console.log('1. Outline 버튼의 기본 상태(hover 전)는 border만 보임');
  console.log('   → 테두리 색상을 더 진하게 조정 권장');
  console.log('2. Ghost 버튼은 hover 전에는 배경색 없음');
  console.log('   → hover 상태의 대비가 충분한지 확인 필요');
  console.log('3. Muted 텍스트는 보조 정보에만 사용');
  console.log('   → 중요한 정보는 primary/foreground 색상 사용\n');
}

// 실행
printResults();
