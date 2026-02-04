import { http, HttpResponse } from 'msw'

// Mock Supabase API responses
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'

export const handlers = [
  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
      },
    })
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
    })
  }),

  http.post(`${SUPABASE_URL}/auth/v1/signup`, () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
    })
  }),

  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // REST API for objects table
  http.get(`${SUPABASE_URL}/rest/v1/objects`, () => {
    return HttpResponse.json([])
  }),

  http.post(`${SUPABASE_URL}/rest/v1/objects`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 'new-object-id',
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }),
]
