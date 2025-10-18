/**
 * Vitest Test Setup
 *
 * - @testing-library/jest-dom matchers 추가
 * - jest-axe matchers 추가 (접근성 테스트)
 */

import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

// jest-axe의 toHaveNoViolations matcher 추가
expect.extend(toHaveNoViolations)
