import type { SupabaseClient } from '@supabase/supabase-js'
import { emit, type EventChannel } from './events'

const TABLE_TO_CHANNEL: Record<string, EventChannel> = {
  objects: 'objects',
  object_types: 'objectTypes',
  templates: 'templates',
  object_relations: 'objectRelations',
  spaces: 'spaces',
  space_shares: 'spaceShares',
  tags: 'tags',
  object_tags: 'tags',
  pins: 'pins',
}

const DEBOUNCE_MS = 100

export function subscribeToRealtimeChanges(supabase: SupabaseClient): () => void {
  const pending = new Set<EventChannel>()
  let timer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    timer = null
    for (const channel of pending) {
      emit(channel)
    }
    pending.clear()
  }

  function handleChange(table: string) {
    const channel = TABLE_TO_CHANNEL[table]
    if (!channel) return

    pending.add(channel)
    if (!timer) {
      timer = setTimeout(flush, DEBOUNCE_MS)
    }
  }

  const realtimeChannel = supabase
    .channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'objects' }, () => handleChange('objects'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'object_types' }, () => handleChange('object_types'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, () => handleChange('templates'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'object_relations' }, () => handleChange('object_relations'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'spaces' }, () => handleChange('spaces'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'space_shares' }, () => handleChange('space_shares'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => handleChange('tags'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'object_tags' }, () => handleChange('object_tags'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pins' }, () => handleChange('pins'))
    .subscribe()
  return () => {
    if (timer) clearTimeout(timer)
    supabase.removeChannel(realtimeChannel)
  }
}
