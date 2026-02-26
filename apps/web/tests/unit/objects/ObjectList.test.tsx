import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../utils/render'
import { ObjectList } from '@/features/objects/components/ObjectList'
import { createMockObject, PAGE_TYPE_ID } from '../../fixtures/objects'
import type { ObjectType } from '@/shared/lib/data/types'

// Mock ObjectItem since it requires providers
vi.mock('@/features/objects/components/ObjectItem', () => ({
  ObjectItem: ({ object }: { object: { title: string } }) => (
    <div data-testid="object-item">{object.title}</div>
  ),
}))

const mockPageType: ObjectType = {
  id: PAGE_TYPE_ID,
  name: 'Page',
  plural_name: 'Pages',
  slug: 'page',
  icon: 'file-text',
  color: null,
  fields: [],
  owner_id: null,
  space_id: '99b075ae-465d-4843-a324-cc3d48a80d6e',
  sort_order: 0,
  is_archived: false,
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('ObjectList', () => {
  const objects = [
    createMockObject({ title: 'Page One' }),
    createMockObject({ title: 'Page Two' }),
    createMockObject({ title: 'Page Three' }),
  ]

  it('renders objects', () => {
    render(<ObjectList objects={objects} objectType={mockPageType} />)

    expect(screen.getByText('Page One')).toBeInTheDocument()
    expect(screen.getByText('Page Two')).toBeInTheDocument()
    expect(screen.getByText('Page Three')).toBeInTheDocument()
  })

  it('shows default empty state when no objects', () => {
    render(<ObjectList objects={[]} objectType={mockPageType} />)

    expect(screen.getByText('No entries yet')).toBeInTheDocument()
  })

  it('shows custom empty message', () => {
    render(<ObjectList objects={[]} emptyMessage="Nothing here" />)

    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('shows custom empty state component', () => {
    render(
      <ObjectList objects={[]} emptyState={<div>Custom empty</div>} />,
    )

    expect(screen.getByText('Custom empty')).toBeInTheDocument()
  })

  it('shows loading skeleton', () => {
    render(<ObjectList objects={[]} isLoading />)

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('renders compact spacing', () => {
    const { container } = render(
      <ObjectList objects={objects} objectType={mockPageType} compact />,
    )

    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain('space-y-0.5')
  })

  it('renders regular spacing without compact', () => {
    const { container } = render(
      <ObjectList objects={objects} objectType={mockPageType} />,
    )

    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain('space-y-2')
  })

  it('loading skeleton uses compact height when compact', () => {
    render(<ObjectList objects={[]} isLoading compact />)

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons[0].className).toContain('h-8')
  })

  it('loading skeleton uses regular height without compact', () => {
    render(<ObjectList objects={[]} isLoading />)

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons[0].className).toContain('h-16')
  })
})
