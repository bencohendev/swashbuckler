import { useState, useEffect } from 'react'
import type { CollapseSignal } from '../types'

export function useCollapsible(
  storageKey: string,
  collapseSignal?: CollapseSignal,
) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(storageKey) === 'true'
  })

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(storageKey, String(collapsed))
  }, [collapsed, storageKey])

  // Sync with bulk collapse signal — track the last-seen key via state
  // so newly mounted components don't immediately sync to an old signal.
  // This is the React "adjust state when props change" pattern.
  const [prevSignalKey, setPrevSignalKey] = useState(collapseSignal?.key)
  if (collapseSignal && prevSignalKey !== collapseSignal.key) {
    setPrevSignalKey(collapseSignal.key)
    setCollapsed(collapseSignal.collapsed)
  }

  return [collapsed, setCollapsed] as const
}
