/**
 * Weekly Recap Edge Function
 *
 * 매주 일요일 자정에 실행되어 지난 주 활동 로그를 요약하고
 * 블로그 포스트로 자동 발행하는 Supabase Edge Function
 *
 * 실행 방법:
 * 1. 수동 실행: supabase functions serve weekly-recap
 * 2. CRON Job: pg_cron 스케줄링
 *
 * @see supabase/migrations/20251114000001_weekly_recap_function.sql
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { WeeklyLog, ProjectActivity, WeeklyStats } from '../_shared/toss-payments.types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Markdown 템플릿 생성
 */
function generateMarkdown(
  stats: WeeklyStats,
  logs: WeeklyLog[],
  projects: ProjectActivity[]
): string {
  const startDate = new Date(stats.start_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  const endDate = new Date(stats.end_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  const year = new Date(stats.end_date).getFullYear()
  const weekNumber = getWeekNumber(new Date(stats.end_date))

  let markdown = `# Weekly Recap - ${year}년 ${weekNumber}주차\n\n`
  markdown += `> ${startDate} ~ ${endDate}\n\n`

  // 주간 통계
  markdown += `## 📊 이번 주 통계\n\n`
  markdown += `- **총 활동**: ${stats.total_logs}건\n`
  markdown += `- **릴리스**: ${stats.release_count}건\n`
  markdown += `- **학습**: ${stats.learning_count}건\n`
  markdown += `- **결정**: ${stats.decision_count}건\n`
  markdown += `- **활성 프로젝트**: ${stats.active_projects}개\n\n`

  // 인기 태그
  if (stats.top_tags && stats.top_tags.length > 0) {
    markdown += `**인기 태그**: ${stats.top_tags.map(t => `#${t.tag}`).join(', ')}\n\n`
  }

  // 프로젝트 활동
  if (projects.length > 0) {
    markdown += `## 🚀 프로젝트 활동\n\n`
    projects.forEach(p => {
      markdown += `### ${p.project_title}\n\n`
      markdown += `- 총 ${p.log_count}건의 활동\n`
      if (p.release_count > 0) markdown += `- 🎉 릴리스 ${p.release_count}건\n`
      if (p.learning_count > 0) markdown += `- 📚 학습 ${p.learning_count}건\n`
      if (p.decision_count > 0) markdown += `- 🤔 결정 ${p.decision_count}건\n`
      markdown += `\n`
    })
  }

  // 상세 로그
  markdown += `## 📝 상세 활동\n\n`

  logs.forEach(({ log_type, logs: logList }) => {
    const typeEmoji = log_type === 'release' ? '🎉' : log_type === 'learning' ? '📚' : '🤔'
    const typeName = log_type === 'release' ? '릴리스' : log_type === 'learning' ? '학습' : '결정'

    markdown += `### ${typeEmoji} ${typeName}\n\n`

    logList.forEach(log => {
      const date = new Date(log.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
      markdown += `#### ${log.title}\n\n`
      markdown += `> ${date}\n\n`
      markdown += `${log.content}\n\n`
      if (log.tags.length > 0) {
        markdown += `**태그**: ${log.tags.map(t => `\`${t}\``).join(', ')}\n\n`
      }
      markdown += `---\n\n`
    })
  })

  // 푸터
  markdown += `\n\n*📌 이 리캡은 자동으로 생성되었습니다. [IDEA on Action](https://www.ideaonaction.ai)*\n`

  return markdown
}

/**
 * ISO 주차 계산
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Edge Function 핸들러
 */
Deno.serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabase 클라이언트 생성
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // 날짜 범위 계산 (지난 7일)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    console.log(`Generating Weekly Recap: ${startDate.toISOString()} ~ ${endDate.toISOString()}`)

    // 주간 통계 가져오기
    const { data: stats, error: statsError } = await supabaseClient.rpc('get_weekly_stats', {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    })

    if (statsError) throw new Error(`Stats error: ${statsError.message}`)
    if (stats.total_logs === 0) {
      return new Response(
        JSON.stringify({ message: 'No activity this week, skipping recap generation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 주간 로그 가져오기
    const { data: logs, error: logsError } = await supabaseClient.rpc('get_weekly_logs', {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    })

    if (logsError) throw new Error(`Logs error: ${logsError.message}`)

    // 주간 프로젝트 활동 가져오기
    const { data: projects, error: projectsError } = await supabaseClient.rpc('get_weekly_project_activity', {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    })

    if (projectsError) throw new Error(`Projects error: ${projectsError.message}`)

    // Markdown 생성
    const markdown = generateMarkdown(stats, logs || [], projects || [])

    const year = endDate.getFullYear()
    const weekNumber = getWeekNumber(endDate)
    const slug = `weekly-recap-${year}-w${weekNumber}`
    const title = `Weekly Recap - ${year}년 ${weekNumber}주차`

    // 블로그 포스트로 발행
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .insert({
        slug,
        title,
        body: markdown,
        tags: ['weekly-recap', 'automation'],
        series: 'Weekly Recap',
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (postError) {
      // 이미 존재하는 경우 업데이트
      if (postError.code === '23505') {
        const { data: updatedPost, error: updateError } = await supabaseClient
          .from('posts')
          .update({ body: markdown, published_at: new Date().toISOString() })
          .eq('slug', slug)
          .select()
          .single()

        if (updateError) throw new Error(`Update error: ${updateError.message}`)

        return new Response(
          JSON.stringify({ message: 'Weekly Recap updated', post: updatedPost }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
      throw new Error(`Post error: ${postError.message}`)
    }

    console.log(`Weekly Recap generated: ${slug}`)

    return new Response(
      JSON.stringify({ message: 'Weekly Recap generated successfully', post }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error generating Weekly Recap:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
