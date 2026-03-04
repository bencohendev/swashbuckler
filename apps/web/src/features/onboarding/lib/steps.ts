export type StepType = 'dialog' | 'coachmark'

export type Placement = 'top' | 'bottom' | 'left' | 'right'

export interface TutorialStep {
  id: string
  type: StepType
  /** CSS selector for the target element (null for dialog steps) */
  target: string | null
  title: string
  description: string
  /** Preferred placement of the coach mark relative to the target */
  placement: Placement
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    type: 'dialog',
    target: null,
    title: 'Welcome to Swashbuckler',
    description: 'We\u2019ve created a Getting Started page for you. Let\u2019s take a quick tour of the app.',
    placement: 'bottom',
  },
  {
    id: 'sidebar-nav',
    type: 'coachmark',
    target: '[data-tour="sidebar-nav"]',
    title: 'Navigation',
    description: 'Navigate between Home, Graph, and Settings.',
    placement: 'right',
  },
  {
    id: 'space-switcher',
    type: 'coachmark',
    target: '[data-tour="space-switcher"]',
    title: 'Spaces',
    description: 'Organize work into separate spaces.',
    placement: 'right',
  },
  {
    id: 'types',
    type: 'coachmark',
    target: '[data-tour="type-sections"]',
    title: 'Types',
    description: 'Entries are organized by type \u2014 click + to create a new entry.',
    placement: 'right',
  },
  {
    id: 'search',
    type: 'coachmark',
    target: '[data-tour="search"]',
    title: 'Search',
    description: 'Find anything instantly (\u2318K).',
    placement: 'bottom',
  },
  {
    id: 'quick-capture',
    type: 'coachmark',
    target: '[data-tour="quick-capture"]',
    title: 'Quick Capture',
    description: 'Capture a quick thought without leaving the page (\u2318E).',
    placement: 'top',
  },
  {
    id: 'editor',
    type: 'coachmark',
    target: '[data-tour="editor-area"]',
    title: 'Editor',
    description: 'Rich text editor \u2014 type / for commands, @ to link entries. Try it out on the Getting Started page!',
    placement: 'left',
  },
  {
    id: 'graph',
    type: 'coachmark',
    target: '[data-tour="nav-graph"]',
    title: 'Graph View',
    description: 'Visualize how your entries connect.',
    placement: 'right',
  },
  {
    id: 'tags',
    type: 'coachmark',
    target: '[data-tour="tags-section"]',
    title: 'Tags',
    description: 'Organize entries with color-coded tags.',
    placement: 'right',
  },
  {
    id: 'sharing',
    type: 'coachmark',
    target: '[data-tour="space-switcher"]',
    title: 'Sharing',
    description: 'Share your space for real-time collaboration.',
    placement: 'right',
  },
  {
    id: 'help',
    type: 'coachmark',
    target: '[data-tour="help-menu"]',
    title: 'Help & Shortcuts',
    description: 'Find docs and keyboard shortcuts here anytime.',
    placement: 'top',
  },
]
