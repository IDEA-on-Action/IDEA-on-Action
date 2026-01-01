/**
 * PromptTemplatePreview Component
 * Preview rendered prompt with variable substitution
 *
 * Features:
 * - Variable input form (dynamic based on template variables)
 * - Real-time prompt rendering
 * - System prompt + User prompt preview
 * - Copy to clipboard button
 * - Missing variable detection
 *
 * v2.21.0 - SSDD 프롬프트 템플릿 미리보기
 */

import React, { useState, useMemo } from 'react'
import { Copy, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

// UI Components
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Types & Utils
import type { PromptTemplateVariable } from '@/types/ai/prompt-template.types'
import { interpolateTemplate, extractVariables } from '@/types/ai/prompt-template.types'

// =====================================================
// COMPONENT PROPS
// =====================================================

export interface PromptTemplatePreviewProps {
  systemPrompt: string
  userPromptTemplate: string
  variables: PromptTemplateVariable[]
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function PromptTemplatePreview({
  systemPrompt,
  userPromptTemplate,
  variables,
}: PromptTemplatePreviewProps) {
  // ========================================
  // State
  // ========================================

  const [variableValues, setVariableValues] = useState<Record<string, string>>(() => {
    // Initialize with default values
    const initial: Record<string, string> = {}
    variables.forEach((v) => {
      if (v.default !== undefined && v.default !== null) {
        initial[v.name] = String(v.default)
      } else if (v.example) {
        initial[v.name] = v.example
      } else {
        initial[v.name] = ''
      }
    })
    return initial
  })

  // ========================================
  // Computed Values
  // ========================================

  // Detect variables in template
  const detectedVariables = useMemo(() => {
    const systemVars = extractVariables(systemPrompt)
    const userVars = extractVariables(userPromptTemplate)
    return Array.from(new Set([...systemVars, ...userVars]))
  }, [systemPrompt, userPromptTemplate])

  // Check missing required variables
  const missingRequired = useMemo(() => {
    return variables
      .filter((v) => v.required && !variableValues[v.name])
      .map((v) => v.name)
  }, [variables, variableValues])

  // Render prompts
  const renderedSystemPrompt = useMemo(() => {
    if (!systemPrompt) return null
    return interpolateTemplate(systemPrompt, variableValues)
  }, [systemPrompt, variableValues])

  const renderedUserPrompt = useMemo(() => {
    return interpolateTemplate(userPromptTemplate, variableValues)
  }, [userPromptTemplate, variableValues])

  // ========================================
  // Event Handlers
  // ========================================

  const handleVariableChange = (name: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleCopyToClipboard = async () => {
    const text = [
      renderedSystemPrompt ? `[시스템 프롬프트]\n${renderedSystemPrompt}\n` : '',
      `[사용자 프롬프트]\n${renderedUserPrompt}`,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      await navigator.clipboard.writeText(text)
      toast.success('클립보드에 복사되었습니다')
    } catch (error) {
      toast.error('복사 실패')
    }
  }

  // ========================================
  // Render
  // ========================================

  return (
    <div className="space-y-6">
      {/* Variable Input Form */}
      {variables.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">변수 입력</h3>
            {missingRequired.length > 0 && (
              <Badge variant="destructive">{missingRequired.length}개 필수 변수 미입력</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {variables.map((variable) => (
              <div key={variable.name} className="space-y-2">
                <Label htmlFor={`var-${variable.name}`}>
                  {variable.description}
                  {variable.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  id={`var-${variable.name}`}
                  type={variable.type === 'number' ? 'number' : 'text'}
                  value={variableValues[variable.name] || ''}
                  onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                  placeholder={variable.example || `${variable.name} 입력`}
                />
                {variable.example && (
                  <p className="text-xs text-muted-foreground">예시: {variable.example}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Variables Warning */}
      {detectedVariables.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            템플릿에서 감지된 변수: {detectedVariables.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Rendered Prompts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">렌더링된 프롬프트</h3>
          <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            복사
          </Button>
        </div>

        {/* System Prompt */}
        {renderedSystemPrompt && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">시스템 프롬프트</Badge>
            </div>
            <div className="p-4 bg-muted rounded-lg border border-border">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {renderedSystemPrompt}
              </pre>
            </div>
          </div>
        )}

        {/* User Prompt */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="default">사용자 프롬프트</Badge>
          </div>
          <div className="p-4 bg-muted rounded-lg border border-border">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {renderedUserPrompt}
            </pre>
          </div>
        </div>

        {/* Missing Required Variables Warning */}
        {missingRequired.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              필수 변수가 입력되지 않았습니다: {missingRequired.join(', ')}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
