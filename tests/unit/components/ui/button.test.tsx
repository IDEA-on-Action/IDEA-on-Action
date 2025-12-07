import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('기본 버튼이 렌더링되어야 함', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('클릭 이벤트가 동작해야 함', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<Button onClick={handleClick}>Click me</Button>)

    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disabled 상태일 때 클릭이 불가능해야 함', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<Button onClick={handleClick} disabled>Click me</Button>)

    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('default variant 스타일이 적용되어야 함', () => {
    render(<Button variant="default">Default</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-blue-600')
  })

  it('destructive variant 스타일이 적용되어야 함', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-red-600')
  })

  it('outline variant 스타일이 적용되어야 함', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('border-2')
  })

  it('secondary variant 스타일이 적용되어야 함', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-slate-700')
  })

  it('ghost variant 스타일이 적용되어야 함', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-slate-600')
  })

  it('link variant 스타일이 적용되어야 함', () => {
    render(<Button variant="link">Link</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('underline-offset-4')
  })

  it('small size가 적용되어야 함', () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('h-9')
  })

  it('large size가 적용되어야 함', () => {
    render(<Button size="lg">Large</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('h-11')
  })

  it('icon size가 적용되어야 함', () => {
    render(<Button size="icon">🔥</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('h-10')
    expect(button.className).toContain('w-10')
  })

  it('custom className이 병합되어야 함', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('custom-class')
  })

  it('asChild prop으로 Slot을 사용해야 함', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })

  it('type 속성을 전달할 수 있어야 함', () => {
    render(<Button type="submit">Submit</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('aria-label을 전달할 수 있어야 함', () => {
    render(<Button aria-label="Close dialog">X</Button>)
    const button = screen.getByRole('button', { name: 'Close dialog' })
    expect(button).toBeInTheDocument()
  })

  it('data 속성을 전달할 수 있어야 함', () => {
    render(<Button data-testid="custom-button">Test</Button>)
    expect(screen.getByTestId('custom-button')).toBeInTheDocument()
  })

  it('여러 variant와 size 조합이 동작해야 함', () => {
    render(<Button variant="destructive" size="lg">Large Delete</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-red-600')
    expect(button.className).toContain('h-11')
  })

  it('disabled 상태에서 올바른 스타일이 적용되어야 함', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('disabled:pointer-events-none')
    expect(button.className).toContain('disabled:opacity-50')
  })

  it('포커스 시 ring 스타일이 적용되어야 함', () => {
    render(<Button>Focus me</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('focus-visible:ring-2')
  })
})
