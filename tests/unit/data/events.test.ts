import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { subscribe, emit, setQueryClient, type EventChannel } from '@/shared/lib/data/events'

describe('events', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    setQueryClient(queryClient)
  })

  describe('subscribe', () => {
    it('returns an unsubscribe function', () => {
      const unsubscribe = subscribe('objects', () => {})
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('calls listener when channel is emitted', () => {
      const listener = vi.fn()
      const unsubscribe = subscribe('objects', listener)

      emit('objects')

      expect(listener).toHaveBeenCalledTimes(1)
      unsubscribe()
    })

    it('calls all listeners on the channel', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const unsub1 = subscribe('objects', listener1)
      const unsub2 = subscribe('objects', listener2)

      emit('objects')

      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)

      unsub1()
      unsub2()
    })
  })

  describe('emit', () => {
    it('does not fire listeners on other channels', () => {
      const objectsListener = vi.fn()
      const tagsListener = vi.fn()
      const unsub1 = subscribe('objects', objectsListener)
      const unsub2 = subscribe('tags', tagsListener)

      emit('objects')

      expect(objectsListener).toHaveBeenCalledTimes(1)
      expect(tagsListener).not.toHaveBeenCalled()

      unsub1()
      unsub2()
    })

    it('invalidates TanStack Query keys', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      emit('objects')

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['objects'] })
    })

    it('invalidates correct prefix for each channel', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const channelToPrefixMap: Record<string, string> = {
        objects: 'objects',
        objectTypes: 'objectTypes',
        templates: 'templates',
        objectRelations: 'relations',
        spaces: 'spaces',
        spaceShares: 'spaceShares',
        tags: 'tags',
        pins: 'pins',
      }

      for (const [channel, prefix] of Object.entries(channelToPrefixMap)) {
        invalidateSpy.mockClear()
        emit(channel as EventChannel)
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [prefix] })
      }
    })
  })

  describe('unsubscribe', () => {
    it('removes listener so it is not called on subsequent emits', () => {
      const listener = vi.fn()
      const unsubscribe = subscribe('objects', listener)

      emit('objects')
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
      emit('objects')
      expect(listener).toHaveBeenCalledTimes(1) // still 1
    })
  })
})
