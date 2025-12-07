import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from '@/components/ui/textarea'

describe('Textarea', () => {
  it('기본 textarea가 렌더링되어야 함', () => {
    render(<Textarea placeholder="Enter description" />)
    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument()
  })

  it('텍스트 입력이 동작해야 함', async () => {
    const user = userEvent.setup()
    render(<Textarea placeholder="Type here" />)

    const textarea = screen.getByPlaceholderText('Type here')
    await user.type(textarea, 'Hello\nWorld')

    expect(textarea).toHaveValue('Hello\nWorld')
  })

  it('onChange 이벤트가 동작해야 함', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<Textarea onChange={handleChange} placeholder="Type" />)

    const textarea = screen.getByPlaceholderText('Type')
    await user.type(textarea, 'test')

    expect(handleChange).toHaveBeenCalled()
  })

  it('disabled 상태일 때 입력이 불가능해야 함', async () => {
    const user = userEvent.setup()
    render(<Textarea disabled placeholder="Disabled" />)

    const textarea = screen.getByPlaceholderText('Disabled')
    await user.type(textarea, 'test')

    expect(textarea).toHaveValue('')
    expect(textarea).toBeDisabled()
  })

  it('readOnly 상태일 때 값이 변경되지 않아야 함', async () => {
    const user = userEvent.setup()
    render(<Textarea readOnly value="Read only text" placeholder="Read only" />)

    const textarea = screen.getByDisplayValue('Read only text')
    await user.type(textarea, 'test')

    expect(textarea).toHaveValue('Read only text')
  })

  it('value prop으로 제어 컴포넌트로 사용할 수 있어야 함', () => {
    const { rerender } = render(<Textarea value="initial" onChange={() => {}} />)
    expect(screen.getByDisplayValue('initial')).toBeInTheDocument()

    rerender(<Textarea value="updated" onChange={() => {}} />)
    expect(screen.getByDisplayValue('updated')).toBeInTheDocument()
  })

  it('defaultValue로 초기값을 설정할 수 있어야 함', () => {
    render(<Textarea defaultValue="Default text content" />)
    expect(screen.getByDisplayValue('Default text content')).toBeInTheDocument()
  })

  it('custom className이 병합되어야 함', () => {
    render(<Textarea className="custom-textarea" placeholder="Custom" />)
    const textarea = screen.getByPlaceholderText('Custom')
    expect(textarea.className).toContain('custom-textarea')
  })

  it('기본 스타일이 적용되어야 함', () => {
    render(<Textarea placeholder="Styled" />)
    const textarea = screen.getByPlaceholderText('Styled')
    expect(textarea.className).toContain('rounded-md')
    expect(textarea.className).toContain('border')
    expect(textarea.className).toContain('min-h-[80px]')
  })

  it('포커스 시 ring 스타일이 적용되어야 함', () => {
    render(<Textarea placeholder="Focus" />)
    const textarea = screen.getByPlaceholderText('Focus')
    expect(textarea.className).toContain('focus-visible:ring-2')
  })

  it('disabled 시 올바른 스타일이 적용되어야 함', () => {
    render(<Textarea disabled placeholder="Disabled" />)
    const textarea = screen.getByPlaceholderText('Disabled')
    expect(textarea.className).toContain('disabled:cursor-not-allowed')
    expect(textarea.className).toContain('disabled:opacity-50')
  })

  it('rows 속성이 적용되어야 함', () => {
    render(<Textarea rows={10} placeholder="Many rows" />)
    const textarea = screen.getByPlaceholderText('Many rows')
    expect(textarea).toHaveAttribute('rows', '10')
  })

  it('cols 속성이 적용되어야 함', () => {
    render(<Textarea cols={50} placeholder="Many cols" />)
    const textarea = screen.getByPlaceholderText('Many cols')
    expect(textarea).toHaveAttribute('cols', '50')
  })

  it('maxLength 속성이 동작해야 함', async () => {
    const user = userEvent.setup()
    render(<Textarea maxLength={10} placeholder="Max 10" />)

    const textarea = screen.getByPlaceholderText('Max 10')
    await user.type(textarea, '12345678901234567890')

    expect(textarea).toHaveValue('1234567890')
  })

  it('required 속성이 적용되어야 함', () => {
    render(<Textarea required placeholder="Required" />)
    const textarea = screen.getByPlaceholderText('Required')
    expect(textarea).toBeRequired()
  })

  it('aria-label을 전달할 수 있어야 함', () => {
    render(<Textarea aria-label="Description field" />)
    expect(screen.getByLabelText('Description field')).toBeInTheDocument()
  })

  it('data 속성을 전달할 수 있어야 함', () => {
    render(<Textarea data-testid="custom-textarea" placeholder="Test" />)
    expect(screen.getByTestId('custom-textarea')).toBeInTheDocument()
  })

  it('autoFocus 속성이 동작해야 함', () => {
    render(<Textarea autoFocus placeholder="Auto focus" />)
    const textarea = screen.getByPlaceholderText('Auto focus')
    expect(textarea).toHaveFocus()
  })

  it('name 속성이 적용되어야 함', () => {
    render(<Textarea name="description" placeholder="Description" />)
    const textarea = screen.getByPlaceholderText('Description')
    expect(textarea).toHaveAttribute('name', 'description')
  })

  it('id 속성이 적용되어야 함', () => {
    render(<Textarea id="comment-textarea" placeholder="Comment" />)
    const textarea = screen.getByPlaceholderText('Comment')
    expect(textarea).toHaveAttribute('id', 'comment-textarea')
  })

  it('여러 줄 텍스트를 입력할 수 있어야 함', async () => {
    const user = userEvent.setup()
    render(<Textarea placeholder="Multi-line" />)

    const textarea = screen.getByPlaceholderText('Multi-line')
    const multiLineText = 'Line 1\nLine 2\nLine 3'
    await user.type(textarea, multiLineText)

    expect(textarea).toHaveValue(multiLineText)
  })

  it('placeholder 스타일이 적용되어야 함', () => {
    render(<Textarea placeholder="Placeholder text" />)
    const textarea = screen.getByPlaceholderText('Placeholder text')
    expect(textarea.className).toContain('placeholder:text-muted-foreground')
  })
})
