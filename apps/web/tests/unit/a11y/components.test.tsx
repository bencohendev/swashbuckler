import { describe, it, expect } from 'vitest'
import { render } from '../../utils/render'
import { checkA11y } from '../../utils/axe'
import { Button } from '@/shared/components/ui/Button'

describe('Accessibility: core components', () => {
  it('Button has no a11y violations', async () => {
    const { container } = render(<Button>Click me</Button>)
    const results = await checkA11y(container)
    expect(results).toHaveNoViolations()
  })

  it('Button (disabled) has no a11y violations', async () => {
    const { container } = render(<Button disabled>Disabled</Button>)
    const results = await checkA11y(container)
    expect(results).toHaveNoViolations()
  })

  it('Button (destructive) has no a11y violations', async () => {
    const { container } = render(
      <Button variant="destructive">Delete</Button>,
    )
    const results = await checkA11y(container)
    expect(results).toHaveNoViolations()
  })
})
