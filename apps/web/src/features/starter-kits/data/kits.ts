import type { FieldType } from '@/shared/lib/data'

export interface StarterKitField {
  name: string
  type: FieldType
  required?: boolean
  options?: string[]
  sort_order: number
}

export interface StarterKitType {
  name: string
  plural_name: string
  slug: string
  icon: string
  color: string | null
  fields: StarterKitField[]
}

export interface StarterKitTemplate {
  name: string
  type_slug: string
  icon: string | null
  properties: Record<string, unknown>
  content: unknown | null
}

export interface StarterKit {
  id: string
  name: string
  description: string
  icon: string
  category: string
  types: StarterKitType[]
  templates: StarterKitTemplate[]
}

export const STARTER_KITS: StarterKit[] = [
  // ── Productivity ──────────────────────────────────────────────────────
  {
    id: 'note-taking',
    name: 'Note Taking',
    description: 'Notes, meeting notes with action items, and a daily journal',
    icon: '📝',
    category: 'Productivity',
    types: [
      {
        name: 'Note',
        plural_name: 'Notes',
        slug: 'note',
        icon: '📄',
        color: null,
        fields: [
          { name: 'Tags', type: 'multi_select', options: ['Reference', 'Idea', 'Draft', 'Archive'], sort_order: 0 },
        ],
      },
      {
        name: 'Meeting Notes',
        plural_name: 'Meeting Notes',
        slug: 'meeting-notes',
        icon: '🤝',
        color: null,
        fields: [
          { name: 'Date', type: 'date', required: true, sort_order: 0 },
          { name: 'Attendees', type: 'text', sort_order: 1 },
          { name: 'Action Items', type: 'text', sort_order: 2 },
          { name: 'Status', type: 'select', options: ['Upcoming', 'In Progress', 'Completed'], sort_order: 3 },
        ],
      },
      {
        name: 'Journal',
        plural_name: 'Journals',
        slug: 'journal',
        icon: '📔',
        color: null,
        fields: [
          { name: 'Date', type: 'date', required: true, sort_order: 0 },
          { name: 'Mood', type: 'select', options: ['Great', 'Good', 'Okay', 'Bad', 'Awful'], sort_order: 1 },
        ],
      },
    ],
    templates: [],
  },

  // ── Lifestyle ─────────────────────────────────────────────────────────
  {
    id: 'recipes',
    name: 'Recipes',
    description: 'Organize recipes and plan weekly meals',
    icon: '🍳',
    category: 'Lifestyle',
    types: [
      {
        name: 'Recipe',
        plural_name: 'Recipes',
        slug: 'recipe',
        icon: '🥘',
        color: null,
        fields: [
          { name: 'Ingredients', type: 'text', sort_order: 0 },
          { name: 'Cook Time', type: 'text', sort_order: 1 },
          { name: 'Servings', type: 'number', sort_order: 2 },
          { name: 'Cuisine', type: 'select', options: ['Italian', 'Mexican', 'Asian', 'American', 'Indian', 'Mediterranean', 'Other'], sort_order: 3 },
          { name: 'Difficulty', type: 'select', options: ['Easy', 'Medium', 'Hard'], sort_order: 4 },
        ],
      },
      {
        name: 'Meal Plan',
        plural_name: 'Meal Plans',
        slug: 'meal-plan',
        icon: '📅',
        color: null,
        fields: [
          { name: 'Week Of', type: 'date', required: true, sort_order: 0 },
        ],
      },
    ],
    templates: [],
  },

  // ── Creative ──────────────────────────────────────────────────────────
  {
    id: 'roleplaying',
    name: 'Roleplaying',
    description: 'Characters, locations, factions, items, and session logs for tabletop RPGs',
    icon: '🎲',
    category: 'Creative',
    types: [
      {
        name: 'Character',
        plural_name: 'Characters',
        slug: 'character',
        icon: '🧙',
        color: null,
        fields: [
          { name: 'Race', type: 'text', sort_order: 0 },
          { name: 'Class', type: 'text', sort_order: 1 },
          { name: 'Level', type: 'number', sort_order: 2 },
          { name: 'Status', type: 'select', options: ['Active', 'Retired', 'Deceased'], sort_order: 3 },
        ],
      },
      {
        name: 'Location',
        plural_name: 'Locations',
        slug: 'location',
        icon: '🏰',
        color: null,
        fields: [
          { name: 'Region', type: 'text', sort_order: 0 },
          { name: 'Type', type: 'select', options: ['City', 'Town', 'Village', 'Dungeon', 'Wilderness', 'Other'], sort_order: 1 },
          { name: 'Discovered', type: 'checkbox', sort_order: 2 },
        ],
      },
      {
        name: 'Faction',
        plural_name: 'Factions',
        slug: 'faction',
        icon: '⚔️',
        color: null,
        fields: [
          { name: 'Alignment', type: 'select', options: ['Ally', 'Neutral', 'Enemy', 'Unknown'], sort_order: 0 },
          { name: 'Influence', type: 'select', options: ['Local', 'Regional', 'Global'], sort_order: 1 },
        ],
      },
      {
        name: 'Session Log',
        plural_name: 'Session Logs',
        slug: 'session-log',
        icon: '📜',
        color: null,
        fields: [
          { name: 'Session Number', type: 'number', required: true, sort_order: 0 },
          { name: 'Date', type: 'date', sort_order: 1 },
          { name: 'Location', type: 'text', sort_order: 2 },
        ],
      },
      {
        name: 'Item',
        plural_name: 'Items',
        slug: 'item',
        icon: '🗡️',
        color: null,
        fields: [
          { name: 'Type', type: 'select', options: ['Weapon', 'Armor', 'Potion', 'Scroll', 'Artifact', 'Mundane'], sort_order: 0 },
          { name: 'Rarity', type: 'select', options: ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'], sort_order: 1 },
          { name: 'Attuned', type: 'checkbox', sort_order: 2 },
        ],
      },
    ],
    templates: [],
  },
]
