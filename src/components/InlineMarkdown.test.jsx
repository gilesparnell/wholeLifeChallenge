import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import InlineMarkdown from './InlineMarkdown'

describe('InlineMarkdown', () => {
  it('renders plain text unchanged', () => {
    const { container } = render(<InlineMarkdown text="hello world" />)
    expect(container.textContent).toBe('hello world')
    expect(container.querySelector('strong')).toBeNull()
    expect(container.querySelector('code')).toBeNull()
  })

  it('renders a **bold** span as <strong>', () => {
    const { container } = render(<InlineMarkdown text="be **bold**" />)
    const strong = container.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong.textContent).toBe('bold')
  })

  it('renders a `code` span as <code>', () => {
    const { container } = render(<InlineMarkdown text="edit `file.js`" />)
    const code = container.querySelector('code')
    expect(code).not.toBeNull()
    expect(code.textContent).toBe('file.js')
  })

  it('renders multiple spans in order', () => {
    const { container } = render(
      <InlineMarkdown text="**A** then `b` and **C**" />,
    )
    expect(container.textContent).toBe('A then b and C')
    expect(container.querySelectorAll('strong').length).toBe(2)
    expect(container.querySelectorAll('code').length).toBe(1)
  })

  it('leaves an unclosed marker as literal text', () => {
    const { container } = render(<InlineMarkdown text="half **open never" />)
    expect(container.textContent).toBe('half **open never')
    expect(container.querySelector('strong')).toBeNull()
  })

  it('renders empty input as empty output', () => {
    const { container } = render(<InlineMarkdown text="" />)
    expect(container.textContent).toBe('')
  })

  it('renders null / undefined as empty output without crashing', () => {
    const { container: c1 } = render(<InlineMarkdown text={null} />)
    const { container: c2 } = render(<InlineMarkdown text={undefined} />)
    expect(c1.textContent).toBe('')
    expect(c2.textContent).toBe('')
  })
})
