import type { DataError } from './types'

/**
 * Error codes that indicate permanent failures (no point retrying).
 *
 * - 23505: unique_violation (Postgres)
 * - 23503: foreign_key_violation (Postgres)
 * - 42501: insufficient_privilege (Postgres)
 * - 42P01: undefined_table (Postgres)
 * - PGRST116: row not found (PostgREST)
 * - PGRST204: column not found (PostgREST)
 * - 23514: check_violation (Postgres)
 */
const PERMANENT_CODES = new Set([
  '23505',
  '23503',
  '42501',
  '42P01',
  'PGRST116',
  'PGRST204',
  '23514',
])

/** Auth-related error codes / messages */
const AUTH_PATTERNS = [
  'JWT expired',
  'invalid claim',
  'not authenticated',
  'Invalid Refresh Token',
  'Auth session missing',
]

export class DataLayerError extends Error {
  readonly code: string | undefined
  readonly retryable: boolean
  readonly isAuth: boolean

  constructor(dataError: DataError) {
    super(dataError.message)
    this.name = 'DataLayerError'
    this.code = dataError.code

    this.isAuth = isAuthError(dataError)
    this.retryable = !this.isAuth && !PERMANENT_CODES.has(dataError.code ?? '')
  }
}

export function toDataLayerError(dataError: DataError): DataLayerError {
  return new DataLayerError(dataError)
}

export function isAuthError(error: DataError | Error): boolean {
  const message = error.message ?? ''
  return AUTH_PATTERNS.some((pattern) => message.includes(pattern))
}
