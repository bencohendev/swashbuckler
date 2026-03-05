import { INTRO_STEPS, type TutorialStep } from './steps'

export type TourId =
  | 'intro'
  | 'dashboard'
  | 'editor'
  | 'graph'
  | 'settings'
  | 'types-settings'
  | 'themes-settings'
  | 'sharing-settings'

export interface TourDefinition {
  id: TourId
  /** Title shown in the welcome dialog */
  title: string
  /** Description shown in the welcome dialog */
  description: string
  steps: TutorialStep[]
}

const DOCS_BASE = 'https://docs.swashbuckler.quest/docs'

export const TOURS: Record<TourId, TourDefinition> = {
  intro: {
    id: 'intro',
    title: 'Welcome to Swashbuckler',
    description: 'Let\u2019s take a quick tour of the app.',
    steps: INTRO_STEPS,
  },
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Your home base \u2014 pinned and recent entries at a glance.',
    steps: [
      {
        id: 'dashboard-welcome',
        type: 'dialog',
        target: null,
        title: 'Dashboard',
        description: 'Your home base \u2014 pinned and recent entries at a glance.',
        placement: 'bottom',
      },
      {
        id: 'dashboard-pinned',
        type: 'coachmark',
        target: '[data-tour="dashboard-pinned"]',
        title: 'Pinned Entries',
        description: 'Pin your most important entries for quick access.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/dashboard`,
      },
      {
        id: 'dashboard-recent',
        type: 'coachmark',
        target: '[data-tour="dashboard-recent"]',
        title: 'Recent Entries',
        description: 'Your most recently accessed entries appear here.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/dashboard`,
      },
    ],
  },
  editor: {
    id: 'editor',
    title: 'Editor',
    description: 'Learn about the entry editor and its features.',
    steps: [
      {
        id: 'editor-welcome',
        type: 'dialog',
        target: null,
        title: 'Editor',
        description: 'Learn about the entry editor and its features.',
        placement: 'bottom',
      },
      {
        id: 'editor-header',
        type: 'coachmark',
        target: '[data-tour="editor-header"]',
        title: 'Entry Header',
        description: 'Change the icon, see the type, and manage the entry.',
        placement: 'bottom',
      },
      {
        id: 'editor-properties',
        type: 'coachmark',
        target: '[data-tour="editor-properties"]',
        title: 'Properties',
        description: 'Custom fields defined by the entry\u2019s type.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/entries-and-types`,
      },
      {
        id: 'editor-area',
        type: 'coachmark',
        target: '[data-tour="editor-area"]',
        title: 'Editor',
        description: 'Rich text with slash commands, mentions, and more.',
        placement: 'left',
        docUrl: `${DOCS_BASE}/editor`,
      },
      {
        id: 'editor-tags',
        type: 'coachmark',
        target: '[data-tour="editor-tags"]',
        title: 'Tags',
        description: 'Add color-coded tags to organize entries.',
        placement: 'top',
        docUrl: `${DOCS_BASE}/tags`,
      },
      {
        id: 'editor-linked-objects',
        type: 'coachmark',
        target: '[data-tour="editor-linked-objects"]',
        title: 'Linked Entries',
        description: 'See and manage connections to other entries.',
        placement: 'top',
        docUrl: `${DOCS_BASE}/relations-and-linking`,
      },
    ],
  },
  graph: {
    id: 'graph',
    title: 'Graph View',
    description: 'Visualize how your entries connect.',
    steps: [
      {
        id: 'graph-welcome',
        type: 'dialog',
        target: null,
        title: 'Graph View',
        description: 'Visualize how your entries connect.',
        placement: 'bottom',
      },
      {
        id: 'graph-canvas',
        type: 'coachmark',
        target: '[data-tour="graph-canvas"]',
        title: 'Graph Canvas',
        description: 'Click and drag to explore. Click a node to see details.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/graph-view`,
      },
      {
        id: 'graph-layout-toggle',
        type: 'coachmark',
        target: '[data-tour="graph-layout-toggle"]',
        title: 'Layout Toggle',
        description: 'Switch between force-directed and radial layouts.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/graph-view`,
      },
      {
        id: 'graph-filter-panel',
        type: 'coachmark',
        target: '[data-tour="graph-filter-panel"]',
        title: 'Filters',
        description: 'Filter nodes by type to focus on what matters.',
        placement: 'left',
        docUrl: `${DOCS_BASE}/graph-view`,
      },
    ],
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    description: 'Manage your account, space, and workspace preferences.',
    steps: [
      {
        id: 'settings-welcome',
        type: 'dialog',
        target: null,
        title: 'Settings',
        description: 'Manage your account, space, and workspace preferences.',
        placement: 'bottom',
      },
      {
        id: 'settings-account',
        type: 'coachmark',
        target: '[data-tour="settings-account"]',
        title: 'Account Settings',
        description: 'Profile, security, spaces, global types, and custom themes.',
        placement: 'bottom',
      },
      {
        id: 'settings-space',
        type: 'coachmark',
        target: '[data-tour="settings-space"]',
        title: 'Space Settings',
        description: 'Appearance, templates, types, and sharing for the current space.',
        placement: 'top',
      },
    ],
  },
  'types-settings': {
    id: 'types-settings',
    title: 'Types',
    description: 'Manage your entry types and their fields.',
    steps: [
      {
        id: 'types-welcome',
        type: 'dialog',
        target: null,
        title: 'Types',
        description: 'Manage your entry types and their fields.',
        placement: 'bottom',
      },
      {
        id: 'types-actions',
        type: 'coachmark',
        target: '[data-tour="types-actions"]',
        title: 'Actions',
        description: 'Create new types, import from the library, or install starter kits.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/entries-and-types`,
      },
      {
        id: 'types-list',
        type: 'coachmark',
        target: '[data-tour="types-list"]',
        title: 'Your Types',
        description: 'Edit, archive, or delete types from the list.',
        placement: 'top',
        docUrl: `${DOCS_BASE}/entries-and-types`,
      },
    ],
  },
  'themes-settings': {
    id: 'themes-settings',
    title: 'Custom Themes',
    description: 'Personalize the look of your workspace.',
    steps: [
      {
        id: 'themes-welcome',
        type: 'dialog',
        target: null,
        title: 'Custom Themes',
        description: 'Personalize the look of your workspace.',
        placement: 'bottom',
      },
      {
        id: 'themes-grid',
        type: 'coachmark',
        target: '[data-tour="themes-grid"]',
        title: 'Theme Gallery',
        description: 'Browse and activate your custom themes.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/themes`,
      },
      {
        id: 'themes-create-button',
        type: 'coachmark',
        target: '[data-tour="themes-create-button"]',
        title: 'Create a Theme',
        description: 'Build a theme from scratch with the theme builder.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/themes`,
      },
    ],
  },
  'sharing-settings': {
    id: 'sharing-settings',
    title: 'Sharing',
    description: 'Collaborate by sharing your space with others.',
    steps: [
      {
        id: 'sharing-welcome',
        type: 'dialog',
        target: null,
        title: 'Sharing',
        description: 'Collaborate by sharing your space with others.',
        placement: 'bottom',
      },
      {
        id: 'sharing-form',
        type: 'coachmark',
        target: '[data-tour="sharing-form"]',
        title: 'Share Your Space',
        description: 'Invite someone by email and set their permission level.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/sharing`,
      },
      {
        id: 'sharing-list',
        type: 'coachmark',
        target: '[data-tour="sharing-list"]',
        title: 'Shared Users',
        description: 'Manage permissions and per-user content exclusions.',
        placement: 'top',
        docUrl: `${DOCS_BASE}/sharing`,
      },
    ],
  },
}

const PATH_TO_TOUR: [RegExp, TourId][] = [
  [/^\/dashboard$/, 'dashboard'],
  [/^\/objects\//, 'editor'],
  [/^\/graph$/, 'graph'],
  [/^\/settings$/, 'settings'],
  [/^\/settings\/types$/, 'types-settings'],
  [/^\/settings\/themes$/, 'themes-settings'],
  [/^\/settings\/sharing$/, 'sharing-settings'],
]

export function getTourIdForPath(pathname: string): TourId | null {
  for (const [pattern, tourId] of PATH_TO_TOUR) {
    if (pattern.test(pathname)) return tourId
  }
  return null
}
