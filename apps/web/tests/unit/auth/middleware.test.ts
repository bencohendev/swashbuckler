import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock createServerClient before importing middleware
const mockGetUser = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

// Mock NextResponse.redirect and NextResponse.next
const mockRedirect = vi.fn((url: URL) => ({
  type: 'redirect',
  url: url.toString(),
  cookies: { set: vi.fn() },
}))

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockNext = vi.fn((_opts?: unknown) => ({
  type: 'next',
  cookies: { set: vi.fn() },
}))

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL) => mockRedirect(url),
    next: (opts?: unknown) => mockNext(opts),
  },
}))

import { updateSession } from '@/shared/lib/supabase/middleware'

function createMockRequest(pathname: string, options: {
  hasGuestCookie?: boolean
  supabaseEnv?: boolean
} = {}) {
  const { hasGuestCookie = false, supabaseEnv = true } = options
  const url = `http://localhost:3000${pathname}`

  // Set env vars
  if (supabaseEnv) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  } else {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }

  const cookies = {
    getAll: vi.fn(() =>
      hasGuestCookie
        ? [{ name: 'swashbuckler-guest', value: '1' }]
        : []
    ),
    has: vi.fn((name: string) =>
      hasGuestCookie && name === 'swashbuckler-guest'
    ),
    set: vi.fn(),
  }

  return {
    url,
    cookies,
    nextUrl: {
      pathname,
      clone: () => {
        const cloned = new URL(url)
        return cloned
      },
    },
  } as unknown as Parameters<typeof updateSession>[0]
}

describe('updateSession middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  describe('protected route guard', () => {
    const protectedPaths = [
      '/dashboard',
      '/settings',
      '/settings/account',
      '/objects/123',
      '/trash',
      '/archive',
      '/graph',
      '/types',
      '/tags',
      '/templates',
    ]

    for (const path of protectedPaths) {
      it(`redirects unauthenticated user without guest cookie from ${path} to /login`, async () => {
        const request = createMockRequest(path, { hasGuestCookie: false })
        await updateSession(request)

        expect(mockRedirect).toHaveBeenCalled()
        const redirectUrl = mockRedirect.mock.calls.at(-1)?.[0]
        expect(redirectUrl?.pathname).toBe('/login')
      })
    }

    it('allows guest cookie user to access /dashboard', async () => {
      const request = createMockRequest('/dashboard', { hasGuestCookie: true })
      await updateSession(request)

      // Should not redirect to /login — should call next()
      const lastRedirect = mockRedirect.mock.calls.at(-1)?.[0]
      if (lastRedirect) {
        expect(lastRedirect.pathname).not.toBe('/login')
      }
    })

    it('allows authenticated user to access /dashboard', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
      })
      const request = createMockRequest('/dashboard')
      await updateSession(request)

      const lastRedirect = mockRedirect.mock.calls.at(-1)?.[0]
      if (lastRedirect) {
        expect(lastRedirect.pathname).not.toBe('/login')
      }
    })
  })

  describe('auth page redirects', () => {
    it('redirects authenticated user from /login to /dashboard', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
      })
      const request = createMockRequest('/login')
      await updateSession(request)

      expect(mockRedirect).toHaveBeenCalled()
      const redirectUrl = mockRedirect.mock.calls.at(-1)?.[0]
      expect(redirectUrl?.pathname).toBe('/dashboard')
    })

    it('redirects authenticated user from /signup to /dashboard', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
      })
      const request = createMockRequest('/signup')
      await updateSession(request)

      expect(mockRedirect).toHaveBeenCalled()
      const redirectUrl = mockRedirect.mock.calls.at(-1)?.[0]
      expect(redirectUrl?.pathname).toBe('/dashboard')
    })

    it('redirects authenticated user from /forgot-password to /dashboard', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
      })
      const request = createMockRequest('/forgot-password')
      await updateSession(request)

      expect(mockRedirect).toHaveBeenCalled()
      const redirectUrl = mockRedirect.mock.calls.at(-1)?.[0]
      expect(redirectUrl?.pathname).toBe('/dashboard')
    })

    it('does not redirect from /auth/callback (PKCE exchange must run)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
      })
      const request = createMockRequest('/auth/callback')
      await updateSession(request)

      // Should return next(), not redirect
      const lastRedirect = mockRedirect.mock.calls.at(-1)?.[0]
      if (lastRedirect) {
        expect(lastRedirect.pathname).not.toBe('/dashboard')
      }
    })
  })

  describe('root redirect', () => {
    it('redirects / to /dashboard for authenticated users', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
      })
      const request = createMockRequest('/')
      await updateSession(request)

      expect(mockRedirect).toHaveBeenCalled()
      const redirectUrl = mockRedirect.mock.calls.at(-1)?.[0]
      expect(redirectUrl?.pathname).toBe('/dashboard')
    })

    it('redirects / to /dashboard for guest users', async () => {
      const request = createMockRequest('/', { hasGuestCookie: true })
      await updateSession(request)

      expect(mockRedirect).toHaveBeenCalled()
      const redirectUrl = mockRedirect.mock.calls.at(-1)?.[0]
      expect(redirectUrl?.pathname).toBe('/dashboard')
    })

    it('redirects / to /landing for unauthenticated non-guest users', async () => {
      const request = createMockRequest('/')
      await updateSession(request)

      expect(mockRedirect).toHaveBeenCalled()
      const redirectUrl = mockRedirect.mock.calls.at(-1)?.[0]
      expect(redirectUrl?.pathname).toBe('/landing')
    })
  })
})
