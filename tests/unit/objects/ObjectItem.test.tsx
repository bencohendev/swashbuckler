import { describe, it, expect } from 'vitest'
import { render, screen } from '../../utils/render'
import { ObjectItem } from '@/features/objects/components/ObjectItem'
import { createMockObject } from '../../fixtures/objects'

describe('ObjectItem', () => {
  const mockPage = createMockObject({ title: 'My Page', type: 'page' })
  const mockNote = createMockObject({ title: 'My Note', type: 'note' })
  const mockWithIcon = createMockObject({ title: 'With Icon', type: 'page', icon: '📚' })

  it('renders page with title', () => {
    render(<ObjectItem object={mockPage} />)

    expect(screen.getByText('My Page')).toBeInTheDocument()
    expect(screen.getByText('page')).toBeInTheDocument()
  })

  it('renders note with title', () => {
    render(<ObjectItem object={mockNote} />)

    expect(screen.getByText('My Note')).toBeInTheDocument()
    expect(screen.getByText('note')).toBeInTheDocument()
  })

  it('renders custom icon when provided', () => {
    render(<ObjectItem object={mockWithIcon} />)

    expect(screen.getByText('📚')).toBeInTheDocument()
  })

  it('links to object detail page', () => {
    render(<ObjectItem object={mockPage} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', `/objects/${mockPage.id}`)
  })

  it('renders compact version', () => {
    render(<ObjectItem object={mockPage} compact />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('py-1.5')
  })

  it('shows active state when isActive is true', () => {
    render(<ObjectItem object={mockPage} isActive />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('border-primary')
  })
})
