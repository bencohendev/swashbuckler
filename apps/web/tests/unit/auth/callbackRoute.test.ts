import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock createServerClient before importing route
const mockExchangeCode = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { exchangeCodeForSession: mockExchangeCode },
  })),
}))

// Track redirects
const redirectCalls: string[] = []

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: string) => {
      redirectCalls.push(url)
      return {
        cookies: { set: vi.fn() },
        url,
      }
    },
  },
}))

import { GET } from '@/app/auth/callback/route'

function createMockRequest(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  const url = `http://localhost:3000/auth/callback?${searchParams.toString()}`
  return {
    url,
    cookies: {
      getAll: vi.fn(() => []),
    },
  } as unknown as Parameters<typeof GET>[0]
}

describe('auth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    redirectCalls.length = 0
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  describe('OAuth error params', () => {
    it('redirects to /login?error=oauth_denied when error param exists', async () => {
      const request = createMockRequest({
        error: 'access_denied',
        error_description: 'User denied access',
      })
      await GET(request)

      expect(redirectCalls).toHaveLength(1)
      expect(redirectCalls[0]).toContain('/login?error=oauth_denied')
    })

    it('redirects to /settings/account?error=link_failed for account linking OAuth error', async () => {
      const request = createMockRequest({
        error: 'access_denied',
        next: '/settings/account',
      })
      await GET(request)

      expect(redirectCalls).toHaveLength(1)
      expect(redirectCalls[0]).toContain('/settings/account?error=link_failed')
    })
  })

  describe('missing env vars', () => {
    it('redirects to /login?error=oauth_error when Supabase env vars are missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      const request = createMockRequest({ code: 'test-code' })
      await GET(request)

      expect(redirectCalls).toHaveLength(1)
      expect(redirectCalls[0]).toContain('/login?error=oauth_error')
    })
  })

  describe('successful code exchange', () => {
    it('redirects to /dashboard on success with no next param', async () => {
      mockExchangeCode.mockResolvedValue({ error: null })

      const request = createMockRequest({ code: 'valid-code' })
      await GET(request)

      expect(redirectCalls).toHaveLength(1)
      expect(redirectCalls[0]).toContain('/dashboard')
      expect(redirectCalls[0]).not.toContain('error')
    })

    it('redirects to next param on success', async () => {
      mockExchangeCode.mockResolvedValue({ error: null })

      const request = createMockRequest({ code: 'valid-code', next: '/reset-password' })
      await GET(request)

      expect(redirectCalls).toHaveLength(1)
      expect(redirectCalls[0]).toContain('/reset-password')
    })

    it('sanitizes next param — rejects protocol-relative URLs', async () => {
      mockExchangeCode.mockResolvedValue({ error: null })

      const request = createMockRequest({ code: 'valid-code', next: '//evil.com' })
      await GET(request)

      expect(redirectCalls).toHaveLength(1)
      expect(redirectCalls[0]).toContain('/dashboard')
      expect(redirectCalls[0]).not.toContain('evil.com')
    })
  })

  describe('code exchange failure', () => {
    it('redirects to /forgot-password?error=link_expired for password reset failure', async () => {
      mockExchangeCode.mockResolvedValue({ error: { message: 'code expired' } })

      const request = createMockRequest({ code: 'expired-code', next: '/reset-password' })
      await GET(request)

      const lastRedirect = redirectCalls.at(-1)
      expect(lastRedirect).toContain('/forgot-password?error=link_expired')
    })

    it('redirects to /settings/account?error=link_failed for account linking failure', async () => {
      mockExchangeCode.mockResolvedValue({ error: { message: 'code expired' } })

      const request = createMockRequest({ code: 'expired-code', next: '/settings/account' })
      await GET(request)

      const lastRedirect = redirectCalls.at(-1)
      expect(lastRedirect).toContain('/settings/account?error=link_failed')
    })

    it('redirects to /login?error=link_expired for general failure', async () => {
      mockExchangeCode.mockResolvedValue({ error: { message: 'code expired' } })

      const request = createMockRequest({ code: 'expired-code' })
      await GET(request)

      const lastRedirect = redirectCalls.at(-1)
      expect(lastRedirect).toContain('/login?error=link_expired')
    })
  })

  describe('no code param', () => {
    it('redirects to /login?error=link_expired when no code provided', async () => {
      const request = createMockRequest({})
      await GET(request)

      const lastRedirect = redirectCalls.at(-1)
      expect(lastRedirect).toContain('/login?error=link_expired')
    })

    it('redirects to /forgot-password?error=link_expired for password reset without code', async () => {
      const request = createMockRequest({ next: '/reset-password' })
      await GET(request)

      const lastRedirect = redirectCalls.at(-1)
      expect(lastRedirect).toContain('/forgot-password?error=link_expired')
    })
  })
})
