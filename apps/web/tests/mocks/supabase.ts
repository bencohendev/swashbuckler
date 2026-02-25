import { vi } from 'vitest'

export function createMockSupabaseClient() {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
  }

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  }

  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  }

  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null })),
  }

  const mockFrom = vi.fn().mockReturnValue(mockQueryBuilder)

  return {
    auth: mockAuth,
    from: mockFrom,
    _mockQueryBuilder: mockQueryBuilder,
    _mockAuth: mockAuth,
  }
}

export function createMockAuthContext(overrides = {}) {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
    session: {
      access_token: 'mock-access-token',
    },
    isLoading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  }
}
