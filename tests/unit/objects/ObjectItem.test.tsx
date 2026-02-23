import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../utils/render'
import { ObjectItem } from '@/features/objects/components/ObjectItem'
import { createMockObject, PAGE_TYPE_ID, NOTE_TYPE_ID } from '../../fixtures/objects'
import type { ObjectType } from '@/shared/lib/data/types'

// SidebarLink and PinButton require providers (QueryClient, DataProvider,
// Next.js navigation) not in scope for unit tests — substitute stubs.
vi.mock('@/features/sidebar/components/SidebarLink', () => ({
  SidebarLink: ({ href, className, children, ...props }: Record<string, unknown>) => {
    const cls = typeof className === 'function' ? (className as (active: boolean) => string)(false) : className
    return <a href={href as string} className={cls as string} {...props}>{children as React.ReactNode}</a>
  },
}))

vi.mock('@/features/pins', () => ({
  PinButton: () => null,
}))

const mockPageType: ObjectType = {
  id: PAGE_TYPE_ID,
  name: 'Page',
  plural_name: 'Pages',
  slug: 'page',
  icon: 'file-text',
  color: null,
  fields: [],
  is_built_in: false,
  owner_id: null,
  space_id: '00000000-0000-0000-0000-000000000099',
  sort_order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockNoteType: ObjectType = {
  ...mockPageType,
  id: NOTE_TYPE_ID,
  name: 'Note',
  plural_name: 'Notes',
  slug: 'note',
  icon: 'sticky-note',
  sort_order: 1,
}

describe('ObjectItem', () => {
  const mockPage = createMockObject({ title: 'My Page', type_id: PAGE_TYPE_ID })
  const mockNote = createMockObject({ title: 'My Note', type_id: NOTE_TYPE_ID })
  const mockWithIcon = createMockObject({ title: 'With Icon', type_id: PAGE_TYPE_ID, icon: '📚' })

  it('renders page with title', () => {
    render(<ObjectItem object={mockPage} objectType={mockPageType} />)

    expect(screen.getByText('My Page')).toBeInTheDocument()
    expect(screen.getByText('Page')).toBeInTheDocument()
  })

  it('renders note with title', () => {
    render(<ObjectItem object={mockNote} objectType={mockNoteType} />)

    expect(screen.getByText('My Note')).toBeInTheDocument()
    expect(screen.getByText('Note')).toBeInTheDocument()
  })

  it('renders custom icon when provided', () => {
    render(<ObjectItem object={mockWithIcon} objectType={mockPageType} />)

    expect(screen.getByText('📚')).toBeInTheDocument()
  })

  it('links to object detail page', () => {
    render(<ObjectItem object={mockPage} objectType={mockPageType} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', `/objects/${mockPage.id}`)
  })

  it('renders compact version', () => {
    render(<ObjectItem object={mockPage} objectType={mockPageType} compact />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('py-1.5')
  })

  it('shows active state when isActive is true', () => {
    render(<ObjectItem object={mockPage} objectType={mockPageType} isActive />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('border-primary')
  })
})
