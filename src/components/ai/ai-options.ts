/**
 * AI 도우미 옵션 상수
 *
 * @module components/ai/ai-options
 */

import { FileText, ClipboardList, CalendarDays, FileOutput } from "lucide-react";
import type { AIOptionConfig, AIAssistOption } from "./AIAssistButton";

/**
 * AI 옵션 설정 목록
 */
export const AI_OPTIONS: AIOptionConfig[] = [
  {
    id: "generateRFP",
    label: "RFP 생성",
    description: "프로젝트 요구사항 정의서를 자동으로 생성합니다",
    icon: FileText,
    shortcut: "R",
  },
  {
    id: "analyzeRequirements",
    label: "요구사항 분석",
    description: "입력된 요구사항을 분석하고 정리합니다",
    icon: ClipboardList,
    shortcut: "A",
  },
  {
    id: "createPlan",
    label: "계획 생성",
    description: "프로젝트 일정과 마일스톤을 계획합니다",
    icon: CalendarDays,
    shortcut: "P",
  },
  {
    id: "writeReport",
    label: "보고서 작성",
    description: "프로젝트 보고서를 자동으로 작성합니다",
    icon: FileOutput,
    shortcut: "W",
  },
];

/**
 * 기본 활성화 옵션
 */
export const DEFAULT_ENABLED_OPTIONS: AIAssistOption[] = [
  "generateRFP",
  "analyzeRequirements",
  "createPlan",
  "writeReport",
];
