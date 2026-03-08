# Testing

This guide covers the testing infrastructure, conventions, and patterns used across the codebase. All features and bug fixes are expected to ship with corresponding test coverage.

---

## Testing Stack

| Tool | Purpose |
|------|---------|
| Vitest | Unit and integration test runner (fast, Vite-based) |
| Testing Library | React component testing (`render`, `screen`, `userEvent`) |
| happy-dom | Lightweight DOM implementation for unit tests |
| Playwright | End-to-end browser testing against the real app |
| MSW (Mock Service Worker) | API mocking at the network level for unit tests |
| vitest-axe | Accessibility assertion matchers for Vitest |
| axe-core | Accessibility rule engine (powers vitest-axe) |
| fake-indexeddb | In-memory IndexedDB polyfill for Dexie tests |

---

## Running Tests

```bash
# Unit + integration tests (single run)
cd apps/web && npx vitest run

# Unit + integration tests (watch mode, re-runs on file changes)
cd apps/web && npx vitest

# E2E tests (requires dev server at localhost:3000)
cd apps/web && npx playwright test

# E2E tests (specific file)
cd apps/web && npx playwright test tests/e2e/home.test.ts

# Type checking
cd apps/web && npx tsc --noEmit

# Linting (from repo root)
npm run lint
```

All four checks (unit tests, e2e tests, types, lint) must pass before merging.

---

## Test Directory Layout

All tests live under `apps/web/tests/`:

```
apps/web/tests/
├── setup.ts                        # Global Vitest setup (MSW, polyfills, matchers)
├── utils/
│   ├── render.tsx                  # Custom render with providers, createHookWrapper
│   └── axe.ts                     # checkA11y helper with JSDOM-irrelevant rules disabled
├── mocks/
│   ├── server.ts                  # MSW server instance
│   ├── handlers.ts                # Default MSW request handlers (Supabase API)
│   └── supabase.ts                # Mock Supabase client + auth context factories
├── fixtures/
│   ├── objects.ts                 # Mock objects, createMockObject()
│   ├── objectTypes.ts             # Mock object types, createMockObjectType()
│   ├── spaces.ts                  # Mock spaces, createMockSpace()
│   ├── tags.ts                    # Mock tags, createMockTag()
│   ├── templates.ts               # Mock templates, createMockTemplate()
│   ├── relations.ts               # Mock relations, createMockRelation()
│   ├── users.ts                   # Mock users + sessions, createMockUser()
│   └── content.ts                 # Plate editor content (mentions, variables, text)
├── unit/
│   ├── a11y/                      # Accessibility tests
│   ├── auth/                      # Auth feature tests
│   ├── collaboration/             # Collaboration tests
│   ├── components/                # UI component tests
│   ├── data/                      # Data layer tests (local client, events, query keys)
│   ├── editor/                    # Editor store, auto-save tests
│   ├── graph/                     # Graph view tests
│   ├── object-types/              # Object type hook tests
│   ├── objects/                   # Object hook + component tests
│   ├── pins/                      # Pin hook tests
│   ├── relations/                 # Relation + mention extraction tests
│   ├── search/                    # Search hook + text extraction tests
│   ├── sharing/                   # Sharing permission tests
│   ├── sidebar/                   # Sidebar collapsible tests
│   ├── starter-kits/              # Starter kit import tests
│   ├── table-view/                # Filter, sort, view mode tests
│   ├── tags/                      # Tag hook tests
│   ├── templates/                 # Template hook + variable tests
│   └── theme-builder/             # Contrast ratio tests
├── integration/
│   └── data/                      # Data client integration tests
└── e2e/
    ├── helpers.ts                 # Custom test fixture (guestPage), entry/nav/tag/pin helpers
    ├── home.test.ts               # Landing, login, signup page tests
    ├── guest-mode.test.ts         # Guest mode entry creation flow
    ├── editor.test.ts             # Editor interaction tests
    ├── navigation-and-lifecycle.test.ts
    ├── dashboard-and-archive.test.ts
    ├── search-and-quick-capture.test.ts
    ├── search.test.ts
    ├── tags-and-pins.test.ts
    ├── templates.test.ts
    ├── theme-and-editor-formatting.test.ts
    ├── type-settings-and-properties.test.ts
    └── types-and-entries.test.ts
```

---

## Vitest Configuration

Defined in `apps/web/vitest.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.d.ts', '**/*.config.{ts,js}', '.next/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Key points:
- **Environment:** `happy-dom` (faster than jsdom, sufficient for most tests).
- **Path alias:** `@/` resolves to `./src/`, matching the app's TypeScript paths.
- **Globals:** `true` -- `describe`, `it`, `expect`, `vi` are available without importing. Tests in this codebase still import them explicitly from `vitest` for clarity.
- **Coverage:** V8-based, with test and config files excluded.

---

## Test Setup

The global setup file (`apps/web/tests/setup.ts`) runs before every test file. It handles:

1. **Testing Library matchers** -- imports `@testing-library/jest-dom/vitest` for DOM assertions like `toBeInTheDocument()`.
2. **IndexedDB polyfill** -- `fake-indexeddb/auto` gives Dexie a working in-memory IndexedDB.
3. **Accessibility matchers** -- extends `expect` with `vitest-axe/matchers` (e.g., `toHaveNoViolations()`).
4. **MSW lifecycle** -- starts the mock server before all tests, resets handlers after each test, and closes the server after all tests.
5. **Browser API mocks** -- stubs `window.matchMedia`, `IntersectionObserver`, and `ResizeObserver` since happy-dom does not implement them.

```typescript
// MSW lifecycle
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
```

The `onUnhandledRequest: 'error'` setting means any HTTP request that does not match an MSW handler will fail the test immediately. This catches unintentionally leaked network calls.

---

## Unit Test Patterns

### Component Tests

File: `tests/unit/components/Button.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '../../utils/render'
import { Button } from '@/shared/components/ui/Button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('data-variant', 'default')
  })

  it('renders as disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

Important: import `render` and `screen` from `../../utils/render`, not directly from `@testing-library/react`. The custom render wraps components in the necessary providers.

### Hook Tests

File: `tests/unit/objects/useObjects.test.tsx`

Hook tests use `renderHook` with a wrapper that provides `QueryClientProvider` and `DataProvider`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useObjects } from '@/features/objects/hooks/useObjects'
import { clearLocalData } from '@/shared/lib/data/local'
import { createHookWrapper } from '../../utils/render'

vi.mock('@/shared/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(),
  }),
}))

const Wrapper = createHookWrapper()

describe('useObjects', () => {
  beforeEach(async () => {
    await clearLocalData()
  })

  it('returns empty array initially', async () => {
    const { result } = renderHook(() => useObjects(), { wrapper: Wrapper })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.objects).toEqual([])
  })

  it('creates and lists objects', async () => {
    const { result } = renderHook(() => useObjects(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let created: Awaited<ReturnType<typeof result.current.create>> = null
    await act(async () => {
      created = await result.current.create({ title: 'Test Page', type_id: PAGE_TYPE_ID })
    })

    expect(created).not.toBeNull()
    await waitFor(() => {
      expect(result.current.objects.length).toBe(1)
    })
  })
})
```

The pattern in detail:

1. **Mock the Supabase client** at the top of the file with `vi.mock()`. This forces guest/local mode so tests use the Dexie (IndexedDB) backend.
2. **Create a wrapper** via `createHookWrapper()` from `tests/utils/render.tsx`. This sets up `QueryClientProvider` (with `retry: false`) and `DataProvider` in guest mode.
3. **Clear local data** in `beforeEach` to isolate tests.
4. **Wait for loading** before asserting -- hooks powered by TanStack Query are async.
5. **Use `act()`** for mutations that trigger state updates.

### Accessibility Tests

File: `tests/unit/a11y/components.test.tsx`

```typescript
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
})
```

Use the `checkA11y` helper from `tests/utils/axe.ts` instead of calling `axe()` directly. The helper disables rules that require a full page context (e.g., `region`, `document-title`, `html-has-lang`) since happy-dom does not provide one.

---

## Test Utilities

### `tests/utils/render.tsx`

Provides two exports:

- **`render()`** -- a custom `render` function that wraps components in `AllProviders`. Use this for component tests.
- **`createHookWrapper()`** -- returns a React component that wraps children in `QueryClientProvider` + `DataProvider`. Use this with `renderHook()`.

```typescript
import { render, screen } from '../../utils/render'
// Component tests use the custom render

import { createHookWrapper } from '../../utils/render'
const Wrapper = createHookWrapper()
// Hook tests use createHookWrapper
```

The hook wrapper creates a fresh `QueryClient` per test (via `useState`) and registers it with the event system via `setQueryClient()`.

### `tests/utils/axe.ts`

Wraps `axe()` from `vitest-axe` with disabled rules that are irrelevant in the happy-dom environment:

```typescript
export async function checkA11y(container: HTMLElement): Promise<AxeCore.AxeResults> {
  return axe(container, {
    rules: {
      region: { enabled: false },
      'document-title': { enabled: false },
      'html-has-lang': { enabled: false },
      'landmark-one-main': { enabled: false },
      'page-has-heading-one': { enabled: false },
    },
  })
}
```

---

## Mocking Strategy

### MSW (Network-Level Mocks)

MSW intercepts HTTP requests at the network layer. Default handlers are in `tests/mocks/handlers.ts` and cover common Supabase endpoints:

```typescript
import { http, HttpResponse } from 'msw'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'

export const handlers = [
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: { id: 'test-user-id', email: 'test@example.com', ... },
    })
  }),
  http.get(`${SUPABASE_URL}/rest/v1/objects`, () => {
    return HttpResponse.json([])
  }),
  // ... more handlers
]
```

The MSW server is configured in `tests/mocks/server.ts`:

```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
export const server = setupServer(...handlers)
```

To override handlers in a specific test, use `server.use()`:

```typescript
import { server } from '../../mocks/server'
import { http, HttpResponse } from 'msw'

it('handles API error', async () => {
  server.use(
    http.get(`${SUPABASE_URL}/rest/v1/objects`, () => {
      return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    })
  )
  // ... test error handling
})
```

Handlers are automatically reset after each test by the setup file (`server.resetHandlers()`).

### Supabase Client Mocks

`tests/mocks/supabase.ts` provides factory functions for creating mock Supabase clients:

- **`createMockSupabaseClient()`** -- returns a full mock client with chainable query builder methods (`select`, `eq`, `order`, etc.) and auth methods.
- **`createMockAuthContext()`** -- returns a mock auth context object for testing auth-dependent components.

Most unit tests mock the Supabase client at the module level rather than using these factories:

```typescript
vi.mock('@/shared/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(),
  }),
}))
```

This forces the app into guest mode, routing all data operations through the local Dexie client.

### General Mocking Principles

- **Mock at the DataClient boundary.** Most tests mock the Supabase client to force local mode, then test against the real Dexie implementation. Do not mock internal hook implementations.
- **Use fixtures** from `tests/fixtures/` for consistent test data. Fixtures provide factory functions like `createMockObject()`, `createMockTag()`, etc.
- **E2E tests do not use mocks.** They run against the real application at `localhost:3000`.

---

## Test Fixtures

Fixtures live in `apps/web/tests/fixtures/` and provide both static mock data and factory functions.

### Factory Pattern

Every fixture file exports a `createMock*()` function that generates test data with sensible defaults and accepts overrides:

```typescript
import { createMockObject, PAGE_TYPE_ID } from '../../fixtures/objects'

const obj = createMockObject({ title: 'My Page' })
// obj.id is a fresh crypto.randomUUID()
// obj.type_id defaults to PAGE_TYPE_ID
// obj.title is 'My Page'
```

### UUID Requirement

Zod 4 enforces strict RFC 4122 UUID validation. Synthetic UUIDs like `00000000-0000-0000-0000-000000000001` will fail schema validation in some contexts. Use `crypto.randomUUID()` in fixtures and tests to generate compliant UUIDs.

### Available Fixtures

| File | Factory | Description |
|------|---------|-------------|
| `objects.ts` | `createMockObject()` | Objects with title, type, space, content |
| `objectTypes.ts` | `createMockObjectType()` | Object type definitions with fields |
| `spaces.ts` | `createMockSpace()` | Spaces with owner |
| `tags.ts` | `createMockTag()` | Tags with name and color |
| `templates.ts` | `createMockTemplate()` | Templates with content and variables |
| `relations.ts` | `createMockRelation()` | Object relations (link and mention types) |
| `users.ts` | `createMockUser()`, `createMockSession()` | Auth users and sessions |
| `content.ts` | (static exports) | Plate editor content: mentions, variables, nested structures |

---

## Playwright Configuration

Defined in `apps/web/playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? '50%' : undefined,
  reporter: process.env.CI ? [['github'], ['html']] : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '...',
    },
  },
})
```

Key points:
- **Three browsers:** Chromium, Firefox, and WebKit all run by default.
- **Web server management:** Playwright starts `npm run dev` automatically if no server is running on port 3000. In CI it builds first, then starts.
- **Placeholder Supabase env vars** are provided so the app can boot in guest mode even without a real Supabase instance.
- **Traces** are captured on first retry for debugging failures.
- **Screenshots** are captured only on failure.

---

## E2E Test Patterns

### The `guestPage` Fixture

Most E2E tests run in guest mode. The `helpers.ts` file exports a custom `test` fixture that provides a `guestPage`:

```typescript
import { test, expect, createEntryWithTitle } from './helpers'

test.describe('My Feature', () => {
  test('should work in guest mode', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Test Entry')
    // ... assertions
  })
})
```

The `guestPage` fixture:
1. Sets the `swashbuckler-guest` cookie to enter guest mode.
2. Navigates to `/dashboard` and sets `tutorialCompleted` in localStorage to dismiss the onboarding tour.
3. Re-navigates and waits for the sidebar to confirm the app loaded.

Tests that do not need guest mode can use the standard Playwright `page` fixture instead.

### Helper Functions

`tests/e2e/helpers.ts` provides reusable functions:

| Helper | Purpose |
|--------|---------|
| `createEntry(page)` | Creates a new entry via the sidebar dropdown, returns the object ID |
| `createEntryWithTitle(page, title)` | Creates an entry and fills in the title |
| `createType(page, name)` | Creates a new type via the sidebar dialog |
| `navigateToDashboard(page)` | Navigates to `/dashboard` |
| `navigateToGraph(page)` | Navigates to `/graph` |
| `navigateToTrash(page)` | Navigates to `/trash` |
| `navigateToArchive(page)` | Navigates to `/archive` |
| `navigateToSettings(page)` | Navigates to `/settings` |
| `openSearch(page)` | Opens the Cmd+K search dialog (with retry) |
| `openQuickCapture(page)` | Opens the Cmd+E quick capture dialog (with retry) |
| `openMoreMenu(page)` | Opens the "More options" dropdown on an entry |
| `waitForToast(page, text)` | Waits for a toast notification containing the given text |
| `addTagToEntry(page, tagName)` | Adds a tag (creates it if needed) |
| `removeTagFromEntry(page, tagName)` | Removes a tag via its X button |
| `pinCurrentEntry(page)` | Pins the current entry |
| `unpinCurrentEntry(page)` | Unpins the current entry |
| `archiveCurrentEntry(page)` | Archives via the More options menu |
| `saveAsTemplate(page, name)` | Saves the current entry as a template |
| `dismissTourIfPresent(page)` | Dismisses the onboarding tutorial if visible |

### Basic E2E Test

File: `tests/e2e/home.test.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('redirects unauthenticated users to landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/landing/)
  })

  test('landing page has guest mode and sign-up options', async ({ page }) => {
    await page.goto('/landing')
    await expect(page.getByRole('heading', { name: 'Swashbuckler' })).toBeVisible()
    await expect(page.getByRole('button', { name: /try as guest/i })).toBeVisible()
  })
})
```

### E2E Test with Guest Page Fixture

File: `tests/e2e/tags-and-pins.test.ts`

```typescript
import {
  test,
  expect,
  createEntryWithTitle,
  addTagToEntry,
  pinCurrentEntry,
  navigateToDashboard,
} from './helpers'

test.describe('Tags & Pins', () => {
  test('create tag and assign to entry', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Tagged Entry')
    await page.waitForTimeout(500)
    await addTagToEntry(page, 'important')

    const badge = page.locator('span').filter({ hasText: 'important' }).first()
    await expect(badge).toBeVisible()
  })

  test('pin entry shows on dashboard', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Pinned Entry')
    await page.waitForTimeout(500)
    await pinCurrentEntry(page)
    await navigateToDashboard(page)

    const pinnedSection = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Pinned', level: 2 }),
    })
    await expect(pinnedSection.getByText('Pinned Entry')).toBeVisible({ timeout: 10000 })
  })
})
```

---

## Integration Tests

Integration tests live in `tests/integration/` and test how multiple modules work together. They use the same Vitest runner as unit tests but exercise larger slices of the system:

```typescript
// tests/integration/data/dataClient.test.tsx
describe('Data Client Integration', () => {
  it('can create and retrieve objects in local mode', async () => {
    const { result } = renderHook(() => useDataClient(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLocal).toBe(true))

    const createResult = await result.current.objects.create({
      title: 'Test Page',
      type_id: '00000000-0000-0000-0000-000000000101',
    })
    expect(createResult.error).toBeNull()

    const getResult = await result.current.objects.get(createResult.data!.id)
    expect(getResult.data?.title).toBe('Test Page')
  })
})
```

The key difference from unit tests: integration tests call the actual `DataClient` methods and verify end-to-end data flow through the local (Dexie) backend, rather than mocking the data layer.

---

## What to Test

### Always test (unit tests):
- Hook return values and state transitions
- Component rendering with different props and states
- User interactions (clicks, typing, keyboard shortcuts)
- Error states and loading states
- Accessibility (`checkA11y` on key components)
- Pure functions (data transformations, filters, sorting)

### Test with E2E:
- Full user flows (enter guest mode, create entry, edit, save)
- Navigation between pages
- Cross-feature interactions (editor + mentions + relations)
- Keyboard shortcuts (Cmd+K for search, Cmd+E for quick capture)
- Toast notifications and feedback

### Do not test:
- Implementation details (internal state shape, private methods)
- Third-party library internals (Plate.js rendering, Supabase SDK behavior)
- CSS styling (unless testing accessibility contrast ratios)

---

## Gotchas

1. **Zod 4 UUID validation is strict.** Use `crypto.randomUUID()` in fixtures and tests. Synthetic UUIDs like `00000000-0000-0000-0000-000000000001` may fail validation depending on the schema.

2. **TanStack Query needs a wrapper.** Hook tests must render inside `QueryClientProvider`. Use `createHookWrapper()` from `tests/utils/render.tsx`.

3. **DataProvider is required for data hooks.** The wrapper from `createHookWrapper()` includes it. If building a custom wrapper, pass `user={null}` and `isAuthLoading={false}` for guest mode.

4. **Mock the Supabase client module.** Most unit tests add a `vi.mock('@/shared/lib/supabase/client', ...)` block at the top to force guest mode. Without this, the DataProvider may attempt real network calls.

5. **Clear local data between tests.** Call `await clearLocalData()` in `beforeEach` to reset the Dexie database and prevent test pollution.

6. **MSW handlers reset automatically.** The setup file calls `server.resetHandlers()` after each test. Any `server.use()` overrides are scoped to the test that set them.

7. **happy-dom lacks some browser APIs.** `matchMedia`, `IntersectionObserver`, and `ResizeObserver` are stubbed in setup.ts. If your code uses other browser APIs not supported by happy-dom, you may need to add additional mocks.

8. **E2E tests need the dev server running.** Playwright starts it automatically via the `webServer` config, but if you see connection errors, verify that `localhost:3000` is reachable.

9. **Accessibility tests can be slow.** Run them selectively. The `checkA11y` helper already disables full-page rules that do not apply in happy-dom.

10. **Keyboard shortcut tests in E2E use retries.** The `openSearch` and `openQuickCapture` helpers retry the shortcut up to 3 times because the event listener may not be attached yet when the page first loads.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `apps/web/vitest.config.ts` | Vitest configuration (environment, includes, aliases) |
| `apps/web/playwright.config.ts` | Playwright configuration (browsers, base URL, web server) |
| `apps/web/tests/setup.ts` | Global setup (MSW, polyfills, browser API mocks) |
| `apps/web/tests/utils/render.tsx` | Custom `render()` and `createHookWrapper()` |
| `apps/web/tests/utils/axe.ts` | `checkA11y()` helper with disabled JSDOM rules |
| `apps/web/tests/mocks/server.ts` | MSW server instance |
| `apps/web/tests/mocks/handlers.ts` | Default Supabase API handlers |
| `apps/web/tests/mocks/supabase.ts` | Mock Supabase client and auth context factories |
| `apps/web/tests/fixtures/*.ts` | Test data factories for all entity types |
| `apps/web/tests/e2e/helpers.ts` | E2E `guestPage` fixture and reusable helper functions |

---

## Exercises

1. **Write a unit test for a hook.** Pick a simple hook like `usePins` or `useTags`. Follow the pattern in `tests/unit/pins/usePins.test.tsx`: mock the Supabase client, use `createHookWrapper()`, clear local data in `beforeEach`, and test the CRUD operations.

2. **Write an E2E test that creates an entry.** Use the `guestPage` fixture and `createEntryWithTitle()` helper. Verify the entry appears in the sidebar by navigating to the dashboard.

3. **Run the accessibility tests.** Execute `cd apps/web && npx vitest run tests/unit/a11y/` and review the output. Try rendering a component without a label and see what violations axe reports.

4. **Add a test fixture.** Create a factory function for a new entity type. Verify it passes Zod validation by importing the schema and calling `parse()` on the generated data.

5. **Trace an E2E test.** Read `tests/e2e/tags-and-pins.test.ts` end to end. Follow each helper call into `helpers.ts` to understand the page interactions. Run it with `--headed` to watch it execute: `cd apps/web && npx playwright test tests/e2e/tags-and-pins.test.ts --headed`.
