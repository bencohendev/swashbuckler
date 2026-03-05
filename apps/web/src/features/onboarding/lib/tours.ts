import { INTRO_STEPS, type TutorialStep } from './steps'

export type TourId =
  | 'intro'
  | 'editor'
  | 'graph'
  | 'settings'

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
        description: 'Visualize how your entries connect. Click and drag to explore, click a node to see details.',
        placement: 'bottom',
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
        description: 'Manage your account, space, and workspace preferences. Let\u2019s walk through each option.',
        placement: 'bottom',
      },
      {
        id: 'settings-account-section',
        type: 'coachmark',
        target: '[data-tour="settings-account"]',
        title: 'Account Settings',
        description: 'These settings follow you across all your spaces.',
        placement: 'bottom',
      },
      {
        id: 'settings-account-card',
        type: 'coachmark',
        target: '[data-tour="settings-card-account"]',
        title: 'Account',
        description: 'Update your display name, email, password, and profile picture.',
        placement: 'bottom',
      },
      {
        id: 'settings-spaces-card',
        type: 'coachmark',
        target: '[data-tour="settings-card-spaces"]',
        title: 'Spaces',
        description: 'Create, rename, or delete spaces. Each space is an independent workspace with its own entries, types, and collaborators.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/spaces`,
      },
      {
        id: 'settings-global-types-card',
        type: 'coachmark',
        target: '[data-tour="settings-card-global-types"]',
        title: 'Global Types',
        description: 'Define reusable type blueprints that can be installed into any space, so you don\u2019t have to recreate them each time.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/entries-and-types`,
      },
      {
        id: 'settings-themes-card',
        type: 'coachmark',
        target: '[data-tour="settings-card-themes"]',
        title: 'Custom Themes',
        description: 'Build your own color themes with the visual theme builder and apply them to any space.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/themes`,
      },
      {
        id: 'settings-space-section',
        type: 'coachmark',
        target: '[data-tour="settings-space"]',
        title: 'Space Settings',
        description: 'These settings only affect the current space.',
        placement: 'top',
      },
      {
        id: 'settings-appearance-card',
        type: 'coachmark',
        target: '[data-tour="settings-card-appearance"]',
        title: 'Appearance',
        description: 'Choose a light, dark, or custom theme for this space. Each space can have its own look.',
        placement: 'bottom',
      },
      {
        id: 'settings-templates-card',
        type: 'coachmark',
        target: '[data-tour="settings-card-templates"]',
        title: 'Templates',
        description: 'Create reusable templates for your entries. New entries of a given type can start from a template instead of a blank page.',
        placement: 'bottom',
      },
      {
        id: 'settings-types-card',
        type: 'coachmark',
        target: '[data-tour="settings-card-types"]',
        title: 'Types',
        description: 'Customize the entry types in this space \u2014 add properties, change icons, or create new types from scratch.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/entries-and-types`,
      },
      {
        id: 'settings-sharing-card',
        type: 'coachmark',
        target: '[data-tour="settings-card-sharing"]',
        title: 'Sharing',
        description: 'Invite others to collaborate in this space. Set permissions per user and control what they can see and edit.',
        placement: 'bottom',
        docUrl: `${DOCS_BASE}/sharing`,
      },
    ],
  },
}

const PATH_TO_TOUR: [RegExp, TourId][] = [
  [/^\/objects\//, 'editor'],
  [/^\/graph$/, 'graph'],
  [/^\/settings$/, 'settings'],
]

export function getTourIdForPath(pathname: string): TourId | null {
  for (const [pattern, tourId] of PATH_TO_TOUR) {
    if (pattern.test(pathname)) return tourId
  }
  return null
}
