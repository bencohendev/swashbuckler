export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user_metadata: {
    name: 'Test User',
  },
}

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: mockUser,
}

export function createMockUser(overrides = {}) {
  return {
    ...mockUser,
    id: `user-${Math.random().toString(36).slice(2, 9)}`,
    ...overrides,
  }
}

export function createMockSession(overrides: Partial<typeof mockSession> = {}) {
  const user = overrides.user || createMockUser()
  return {
    ...mockSession,
    user,
    ...overrides,
  }
}
