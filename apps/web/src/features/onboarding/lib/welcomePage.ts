import type { ObjectsClient, ObjectTypesClient } from '@/shared/lib/data/types'

/**
 * Plate.js content for the "Getting Started" welcome page.
 */
export const WELCOME_PAGE_CONTENT = [
  {
    type: 'h1',
    children: [{ text: 'Welcome to Swashbuckler' }],
  },
  {
    type: 'p',
    children: [
      {
        text: 'Swashbuckler is your personal knowledge base — a place to capture ideas, organize information, and connect your thinking.',
      },
    ],
  },
  {
    type: 'h2',
    children: [{ text: 'Types' }],
  },
  {
    type: 'p',
    children: [
      {
        text: 'Everything you create is an entry, and every entry has a type. You start with a "Page" type, but you can create your own — like Projects, People, or Recipes. Each type can have custom fields and its own icon.',
      },
    ],
  },
  {
    type: 'h2',
    children: [{ text: 'The Editor' }],
  },
  {
    type: 'p',
    children: [
      { text: 'Type ' },
      { text: '/', bold: true },
      { text: ' to open the command menu — add headings, lists, callouts, and more. Use ' },
      { text: '@', bold: true },
      { text: ' to mention and link to other entries.' },
    ],
  },
  {
    type: 'h2',
    children: [{ text: 'Keyboard Shortcuts' }],
  },
  {
    type: 'ul',
    children: [
      {
        type: 'li',
        children: [
          {
            type: 'lic',
            children: [
              { text: '⌘K', bold: true },
              { text: ' — Search for anything' },
            ],
          },
        ],
      },
      {
        type: 'li',
        children: [
          {
            type: 'lic',
            children: [
              { text: '⌘E', bold: true },
              { text: ' — Quick capture a thought without leaving the page' },
            ],
          },
        ],
      },
    ],
  },
  {
    type: 'h2',
    children: [{ text: 'Explore' }],
  },
  {
    type: 'p',
    children: [
      {
        text: 'Use the Graph view to see how your entries connect. Add tags for flexible organization. Share a space to collaborate in real-time.',
      },
    ],
  },
  {
    type: 'p',
    children: [
      {
        text: 'Delete this page whenever you\'re ready — it\'s here to help you get started.',
      },
    ],
  },
]

/**
 * Creates a "Getting Started" welcome page in the given space.
 * Finds the first object type (typically Page) and creates an entry with introductory content.
 */
/**
 * Creates a "Getting Started" welcome page in the given space.
 * Returns the created object's ID so the caller can navigate to it, or null on failure.
 */
export async function createWelcomePage(
  objectsClient: ObjectsClient,
  objectTypesClient: ObjectTypesClient,
): Promise<string | null> {
  const typesResult = await objectTypesClient.list()
  if (typesResult.error || typesResult.data.length === 0) return null

  // Use the first available type (should be Page)
  const pageType = typesResult.data.find(t => t.slug === 'page') ?? typesResult.data[0]

  const result = await objectsClient.create({
    title: 'Getting Started',
    type_id: pageType.id,
    content: WELCOME_PAGE_CONTENT,
  })

  return result.data?.id ?? null
}
