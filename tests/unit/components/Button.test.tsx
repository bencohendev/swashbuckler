import { describe, it, expect } from 'vitest'
import { render, screen } from '../../utils/render'
import { Button } from '@/shared/components/ui/Button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)

    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('data-variant', 'default')
    expect(button).toHaveAttribute('data-size', 'default')
  })

  it('renders with destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>)

    const button = screen.getByRole('button', { name: /delete/i })
    expect(button).toHaveAttribute('data-variant', 'destructive')
  })

  it('renders with outline variant', () => {
    render(<Button variant="outline">Cancel</Button>)

    const button = screen.getByRole('button', { name: /cancel/i })
    expect(button).toHaveAttribute('data-variant', 'outline')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'sm')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'lg')
  })

  it('renders as disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)

    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })
})
