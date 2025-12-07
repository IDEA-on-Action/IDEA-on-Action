import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('기본 배지가 렌더링되어야 함', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('default variant 스타일이 적용되어야 함', () => {
    render(<Badge variant="default">Default</Badge>)
    const badge = screen.getByText('Default')
    expect(badge.className).toContain('bg-primary')
    expect(badge.className).toContain('text-primary-foreground')
  })

  it('secondary variant 스타일이 적용되어야 함', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    const badge = screen.getByText('Secondary')
    expect(badge.className).toContain('bg-secondary')
    expect(badge.className).toContain('text-secondary-foreground')
  })

  it('destructive variant 스타일이 적용되어야 함', () => {
    render(<Badge variant="destructive">Error</Badge>)
    const badge = screen.getByText('Error')
    expect(badge.className).toContain('bg-destructive')
    expect(badge.className).toContain('text-destructive-foreground')
  })

  it('outline variant 스타일이 적용되어야 함', () => {
    render(<Badge variant="outline">Outline</Badge>)
    const badge = screen.getByText('Outline')
    expect(badge.className).toContain('text-foreground')
  })

  it('custom className이 병합되어야 함', () => {
    render(<Badge className="custom-badge">Custom</Badge>)
    const badge = screen.getByText('Custom')
    expect(badge.className).toContain('custom-badge')
  })

  it('기본 스타일이 적용되어야 함', () => {
    render(<Badge>Styled</Badge>)
    const badge = screen.getByText('Styled')
    expect(badge.className).toContain('rounded-full')
    expect(badge.className).toContain('border')
    expect(badge.className).toContain('px-2.5')
    expect(badge.className).toContain('py-0.5')
    expect(badge.className).toContain('text-xs')
    expect(badge.className).toContain('font-semibold')
  })

  it('children으로 텍스트를 렌더링해야 함', () => {
    render(<Badge>Badge Text</Badge>)
    expect(screen.getByText('Badge Text')).toBeInTheDocument()
  })

  it('children으로 숫자를 렌더링해야 함', () => {
    render(<Badge>42</Badge>)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('children으로 JSX를 렌더링해야 함', () => {
    render(
      <Badge>
        <span data-testid="icon">🔥</span> Hot
      </Badge>
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Hot')).toBeInTheDocument()
  })

  it('data 속성을 전달할 수 있어야 함', () => {
    render(<Badge data-testid="custom-badge">Test</Badge>)
    expect(screen.getByTestId('custom-badge')).toBeInTheDocument()
  })

  it('onClick 핸들러를 전달할 수 있어야 함', async () => {
    const handleClick = vi.fn()
    render(<Badge onClick={handleClick}>Clickable</Badge>)

    const badge = screen.getByText('Clickable')
    await userEvent.click(badge)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('aria-label을 전달할 수 있어야 함', () => {
    render(<Badge aria-label="Status badge">Active</Badge>)
    expect(screen.getByLabelText('Status badge')).toBeInTheDocument()
  })

  it('id 속성을 전달할 수 있어야 함', () => {
    render(<Badge id="status-badge">Status</Badge>)
    const badge = screen.getByText('Status')
    expect(badge).toHaveAttribute('id', 'status-badge')
  })

  it('role 속성을 전달할 수 있어야 함', () => {
    render(<Badge role="status">Loading</Badge>)
    const badge = screen.getByText('Loading')
    expect(badge).toHaveAttribute('role', 'status')
  })

  it('여러 variant를 렌더링할 수 있어야 함', () => {
    const { container } = render(
      <div>
        <Badge variant="default">Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
    )

    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(screen.getByText('Secondary')).toBeInTheDocument()
    expect(screen.getByText('Destructive')).toBeInTheDocument()
    expect(screen.getByText('Outline')).toBeInTheDocument()
  })

  it('빈 children은 렌더링하지 않아야 함', () => {
    const { container } = render(<Badge></Badge>)
    const badge = container.querySelector('div')
    expect(badge).toBeInTheDocument()
    expect(badge?.textContent).toBe('')
  })

  it('포커스 시 ring 스타일이 적용되어야 함', () => {
    render(<Badge>Focus</Badge>)
    const badge = screen.getByText('Focus')
    expect(badge.className).toContain('focus:ring-2')
  })

  it('hover 시 투명도가 변경되어야 함', () => {
    render(<Badge variant="default">Hover</Badge>)
    const badge = screen.getByText('Hover')
    expect(badge.className).toContain('hover:bg-primary/80')
  })

  it('transition 스타일이 적용되어야 함', () => {
    render(<Badge>Transition</Badge>)
    const badge = screen.getByText('Transition')
    expect(badge.className).toContain('transition-colors')
  })
})
