/**
 * xlsx 모듈 모킹 (deprecated 모듈)
 *
 * lazy-loader.ts에서 동적 import 해결을 위한 mock
 * 실제 xlsx 패키지는 설치되지 않음 (exceljs로 마이그레이션됨)
 */

export const utils = {
  book_new: () => ({}),
  book_append_sheet: () => {},
  json_to_sheet: () => ({}),
  aoa_to_sheet: () => ({}),
  sheet_to_json: () => [],
};

export const read = () => ({ SheetNames: [], Sheets: {} });
export const write = () => new ArrayBuffer(0);
export const writeFile = () => {};

export default {
  utils,
  read,
  write,
  writeFile,
};
