import { useCallback } from 'react'
import { toast } from '@/shared/hooks/useToast'
import { emit, type EventChannel } from '@/shared/lib/data/events'
import type { DataResult } from '@/shared/lib/data/types'

interface MutationActionOptions<T> {
  /** Human-readable label shown in the error toast title (e.g. "Create object") */
  actionLabel: string
  /** Channels to emit on success — skipped on failure */
  emitChannels?: EventChannel[]
  /** Callback fired after a successful mutation, before emit */
  onSuccess?: (data: T) => void
}

/**
 * Wraps a DataResult-returning async function with:
 * - Error toasting (destructive variant)
 * - Conditional emit (only on success)
 * - onSuccess callback for side effects
 *
 * Returns T on success, null on failure (toast already shown).
 */
export function useMutationAction<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<DataResult<T>>,
  options: MutationActionOptions<T>,
): (...args: Args) => Promise<T | null> {
  const { actionLabel, emitChannels, onSuccess } = options

  return useCallback(
    async (...args: Args): Promise<T | null> => {
      const result = await fn(...args)

      if (result.error) {
        toast({
          title: actionLabel,
          description: result.error.message,
          variant: 'destructive',
        })
        return null
      }

      if (result.data != null) {
        onSuccess?.(result.data)
      }

      if (emitChannels) {
        for (const channel of emitChannels) {
          emit(channel)
        }
      }

      return result.data
    },
    [fn, actionLabel, emitChannels, onSuccess],
  )
}

/**
 * Same as useMutationAction but for DataResult<void> mutations.
 * Returns true on success, false on failure.
 */
export function useVoidMutationAction<Args extends unknown[]>(
  fn: (...args: Args) => Promise<DataResult<void>>,
  options: Omit<MutationActionOptions<void>, 'onSuccess'> & { onSuccess?: () => void },
): (...args: Args) => Promise<boolean> {
  const { actionLabel, emitChannels, onSuccess } = options

  return useCallback(
    async (...args: Args): Promise<boolean> => {
      const result = await fn(...args)

      if (result.error) {
        toast({
          title: actionLabel,
          description: result.error.message,
          variant: 'destructive',
        })
        return false
      }

      onSuccess?.()

      if (emitChannels) {
        for (const channel of emitChannels) {
          emit(channel)
        }
      }

      return true
    },
    [fn, actionLabel, emitChannels, onSuccess],
  )
}
