import { describe, it, expect } from 'vitest'
import { DataLayerError, toDataLayerError, isAuthError } from '@/shared/lib/data/errors'

describe('DataLayerError', () => {
  it('marks unique_violation (23505) as non-retryable', () => {
    const error = new DataLayerError({ message: 'duplicate key', code: '23505' })
    expect(error.retryable).toBe(false)
    expect(error.isAuth).toBe(false)
    expect(error.code).toBe('23505')
  })

  it('marks foreign_key_violation (23503) as non-retryable', () => {
    const error = new DataLayerError({ message: 'fk violation', code: '23503' })
    expect(error.retryable).toBe(false)
  })

  it('marks insufficient_privilege (42501) as non-retryable', () => {
    const error = new DataLayerError({ message: 'permission denied', code: '42501' })
    expect(error.retryable).toBe(false)
  })

  it('marks PGRST116 (row not found) as non-retryable', () => {
    const error = new DataLayerError({ message: 'not found', code: 'PGRST116' })
    expect(error.retryable).toBe(false)
  })

  it('marks PGRST204 (column not found) as non-retryable', () => {
    const error = new DataLayerError({ message: 'column missing', code: 'PGRST204' })
    expect(error.retryable).toBe(false)
  })

  it('marks check_violation (23514) as non-retryable', () => {
    const error = new DataLayerError({ message: 'check failed', code: '23514' })
    expect(error.retryable).toBe(false)
  })

  it('marks unknown codes as retryable', () => {
    const error = new DataLayerError({ message: 'something went wrong', code: '99999' })
    expect(error.retryable).toBe(true)
    expect(error.isAuth).toBe(false)
  })

  it('marks errors without a code as retryable', () => {
    const error = new DataLayerError({ message: 'network timeout' })
    expect(error.retryable).toBe(true)
  })

  it('marks JWT expired as auth error and non-retryable', () => {
    const error = new DataLayerError({ message: 'JWT expired' })
    expect(error.isAuth).toBe(true)
    expect(error.retryable).toBe(false)
  })

  it('marks invalid claim as auth error', () => {
    const error = new DataLayerError({ message: 'invalid claim: role' })
    expect(error.isAuth).toBe(true)
    expect(error.retryable).toBe(false)
  })

  it('marks "not authenticated" as auth error', () => {
    const error = new DataLayerError({ message: 'not authenticated' })
    expect(error.isAuth).toBe(true)
  })

  it('marks Invalid Refresh Token as auth error', () => {
    const error = new DataLayerError({ message: 'Invalid Refresh Token' })
    expect(error.isAuth).toBe(true)
  })

  it('marks Auth session missing as auth error', () => {
    const error = new DataLayerError({ message: 'Auth session missing' })
    expect(error.isAuth).toBe(true)
  })

  it('sets name to DataLayerError', () => {
    const error = new DataLayerError({ message: 'test' })
    expect(error.name).toBe('DataLayerError')
  })

  it('extends Error', () => {
    const error = new DataLayerError({ message: 'test' })
    expect(error).toBeInstanceOf(Error)
  })
})

describe('toDataLayerError', () => {
  it('creates a DataLayerError from a DataError', () => {
    const error = toDataLayerError({ message: 'test', code: '23505' })
    expect(error).toBeInstanceOf(DataLayerError)
    expect(error.code).toBe('23505')
  })
})

describe('isAuthError', () => {
  it('returns true for auth-related messages', () => {
    expect(isAuthError({ message: 'JWT expired' })).toBe(true)
    expect(isAuthError({ message: 'not authenticated' })).toBe(true)
    expect(isAuthError(new Error('Auth session missing'))).toBe(true)
  })

  it('returns false for non-auth messages', () => {
    expect(isAuthError({ message: 'network error' })).toBe(false)
    expect(isAuthError(new Error('timeout'))).toBe(false)
  })
})
