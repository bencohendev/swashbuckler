import { describe, it, expect } from 'vitest'
import { isSafeUrl } from '@/shared/lib/url'

describe('isSafeUrl', () => {
  it('allows https URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true)
    expect(isSafeUrl('https://example.com/path?q=1')).toBe(true)
  })

  it('allows http URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true)
  })

  it('blocks javascript: protocol', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
  })

  it('blocks data: protocol', () => {
    expect(isSafeUrl('data:text/html,<h1>hi</h1>')).toBe(false)
  })

  it('blocks vbscript: protocol', () => {
    expect(isSafeUrl('vbscript:msgbox("hi")')).toBe(false)
  })

  it('blocks ftp: protocol', () => {
    expect(isSafeUrl('ftp://files.example.com')).toBe(false)
  })

  it('blocks file: protocol', () => {
    expect(isSafeUrl('file:///etc/passwd')).toBe(false)
  })

  it('treats empty string as relative (resolved against https base)', () => {
    expect(isSafeUrl('')).toBe(true)
  })

  it('treats relative paths as safe (resolved against https base)', () => {
    expect(isSafeUrl('/relative/path')).toBe(true)
    expect(isSafeUrl('relative/path')).toBe(true)
  })

  it('treats ambiguous protocol-like input as relative path', () => {
    // '://' is treated as a relative path resolved against https base
    expect(isSafeUrl('://')).toBe(true)
  })
})
