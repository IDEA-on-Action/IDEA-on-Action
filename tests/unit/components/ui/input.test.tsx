import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('기본 input이 렌더링되어야 함', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('텍스트 입력이 동작해야 함', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Type here" />)

    const input = screen.getByPlaceholderText('Type here')
    await user.type(input, 'Hello World')

    expect(input).toHaveValue('Hello World')
  })

  it('onChange 이벤트가 동작해야 함', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<Input onChange={handleChange} placeholder="Type" />)

    const input = screen.getByPlaceholderText('Type')
    await user.type(input, 'test')

    expect(handleChange).toHaveBeenCalled()
  })

  it('type="password"가 적용되어야 함', () => {
    render(<Input type="password" placeholder="Password" />)
    const input = screen.getByPlaceholderText('Password')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('type="email"이 적용되어야 함', () => {
    render(<Input type="email" placeholder="Email" />)
    const input = screen.getByPlaceholderText('Email')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('type="number"가 적용되어야 함', () => {
    render(<Input type="number" placeholder="Age" />)
    const input = screen.getByPlaceholderText('Age')
    expect(input).toHaveAttribute('type', 'number')
  })

  it('disabled 상태일 때 입력이 불가능해야 함', async () => {
    const user = userEvent.setup()
    render(<Input disabled placeholder="Disabled" />)

    const input = screen.getByPlaceholderText('Disabled')
    await user.type(input, 'test')

    expect(input).toHaveValue('')
    expect(input).toBeDisabled()
  })

  it('readOnly 상태일 때 값이 변경되지 않아야 함', async () => {
    const user = userEvent.setup()
    render(<Input readOnly value="Read only" placeholder="Read only" />)

    const input = screen.getByDisplayValue('Read only')
    await user.type(input, 'test')

    expect(input).toHaveValue('Read only')
  })

  it('value prop으로 제어 컴포넌트로 사용할 수 있어야 함', () => {
    const { rerender } = render(<Input value="initial" onChange={() => {}} />)
    expect(screen.getByDisplayValue('initial')).toBeInTheDocument()

    rerender(<Input value="updated" onChange={() => {}} />)
    expect(screen.getByDisplayValue('updated')).toBeInTheDocument()
  })

  it('defaultValue로 초기값을 설정할 수 있어야 함', () => {
    render(<Input defaultValue="Default text" />)
    expect(screen.getByDisplayValue('Default text')).toBeInTheDocument()
  })

  it('custom className이 병합되어야 함', () => {
    render(<Input className="custom-input" placeholder="Custom" />)
    const input = screen.getByPlaceholderText('Custom')
    expect(input.className).toContain('custom-input')
  })

  it('기본 스타일이 적용되어야 함', () => {
    render(<Input placeholder="Styled" />)
    const input = screen.getByPlaceholderText('Styled')
    expect(input.className).toContain('rounded-md')
    expect(input.className).toContain('border')
  })

  it('포커스 시 ring 스타일이 적용되어야 함', () => {
    render(<Input placeholder="Focus" />)
    const input = screen.getByPlaceholderText('Focus')
    expect(input.className).toContain('focus-visible:ring-2')
  })

  it('disabled 시 올바른 스타일이 적용되어야 함', () => {
    render(<Input disabled placeholder="Disabled" />)
    const input = screen.getByPlaceholderText('Disabled')
    expect(input.className).toContain('disabled:cursor-not-allowed')
    expect(input.className).toContain('disabled:opacity-50')
  })

  it('maxLength 속성이 동작해야 함', async () => {
    const user = userEvent.setup()
    render(<Input maxLength={5} placeholder="Max 5" />)

    const input = screen.getByPlaceholderText('Max 5')
    await user.type(input, '123456789')

    expect(input).toHaveValue('12345')
  })

  it('required 속성이 적용되어야 함', () => {
    render(<Input required placeholder="Required" />)
    const input = screen.getByPlaceholderText('Required')
    expect(input).toBeRequired()
  })

  it('pattern 속성이 적용되어야 함', () => {
    render(<Input pattern="[0-9]*" placeholder="Numbers only" />)
    const input = screen.getByPlaceholderText('Numbers only')
    expect(input).toHaveAttribute('pattern', '[0-9]*')
  })

  it('aria-label을 전달할 수 있어야 함', () => {
    render(<Input aria-label="Search input" />)
    expect(screen.getByLabelText('Search input')).toBeInTheDocument()
  })

  it('data 속성을 전달할 수 있어야 함', () => {
    render(<Input data-testid="custom-input" placeholder="Test" />)
    expect(screen.getByTestId('custom-input')).toBeInTheDocument()
  })

  it('autoComplete 속성이 적용되어야 함', () => {
    render(<Input autoComplete="email" placeholder="Email" />)
    const input = screen.getByPlaceholderText('Email')
    expect(input).toHaveAttribute('autoComplete', 'email')
  })

  it('autoFocus 속성이 동작해야 함', () => {
    render(<Input autoFocus placeholder="Auto focus" />)
    const input = screen.getByPlaceholderText('Auto focus')
    expect(input).toHaveFocus()
  })

  it('name 속성이 적용되어야 함', () => {
    render(<Input name="username" placeholder="Username" />)
    const input = screen.getByPlaceholderText('Username')
    expect(input).toHaveAttribute('name', 'username')
  })

  it('id 속성이 적용되어야 함', () => {
    render(<Input id="email-input" placeholder="Email" />)
    const input = screen.getByPlaceholderText('Email')
    expect(input).toHaveAttribute('id', 'email-input')
  })
})
