import type { DataClient } from '@/shared/lib/data/types'
import { emit } from '@/shared/lib/data/events'
import { CAMPAIGN_TYPES, CAMPAIGN_ENTRIES } from './exampleCampaign'
import { extractMentionIds } from '@/features/relations/lib/extractMentions'
import type { Value } from '@udecode/plate'

/**
 * Seeds the example pirate campaign into the given space.
 * Returns the ID of the Campaign Overview entry for navigation.
 */
export async function seedExampleCampaign(client: DataClient): Promise<string | null> {
  // 1. Create types and collect key → ID mapping.
  //    If a type with the same slug already exists (e.g. Page was seeded
  //    by ensureLocalDefaultTypes), reuse its ID instead of failing.
  const typeKeyToId = new Map<string, string>()

  // Build a slug → ID lookup of existing types
  const existingTypes = await client.objectTypes.list()
  const existingBySlug = new Map(
    (existingTypes.data ?? []).map(t => [t.slug, t.id]),
  )

  for (const campaignType of CAMPAIGN_TYPES) {
    const { key, ...input } = campaignType

    const existingId = existingBySlug.get(input.slug)
    if (existingId) {
      typeKeyToId.set(key, existingId)
      // Update icon to match campaign definition
      if (input.icon) {
        await client.objectTypes.update(existingId, { icon: input.icon })
      }
      continue
    }

    // Add UUIDs to field definitions
    const fields = (input.fields ?? []).map(f => ({
      ...f,
      id: crypto.randomUUID(),
    }))
    const result = await client.objectTypes.create({ ...input, fields })
    if (result.data) {
      typeKeyToId.set(key, result.data.id)
    }
  }

  emit('objectTypes')

  // 2. Create entries with placeholder mention IDs (the keys)
  const entryKeyToId = new Map<string, string>()

  for (const entry of CAMPAIGN_ENTRIES) {
    const typeId = typeKeyToId.get(entry.typeKey)
    if (!typeId) continue

    const result = await client.objects.create({
      title: entry.title,
      type_id: typeId,
      properties: entry.properties ?? {},
      content: entry.content,
      icon: entry.icon ?? null,
    })

    if (result.data) {
      entryKeyToId.set(entry.key, result.data.id)
    }
  }

  emit('objects')

  // 3. Patch content — replace placeholder keys with real UUIDs in mention nodes
  for (const entry of CAMPAIGN_ENTRIES) {
    const entryId = entryKeyToId.get(entry.key)
    if (!entryId) continue

    const patched = replaceMentionKeys(entry.content, entryKeyToId)
    if (!patched.changed) continue

    await client.objects.update(entryId, { content: patched.content })

    // Sync mention relations
    const mentionIds = extractMentionIds(patched.content as Value)
    if (mentionIds.length > 0) {
      await client.relations.syncMentions(entryId, mentionIds)
    }
  }

  emit('objects')

  return entryKeyToId.get('overview') ?? null
}

/**
 * Deep-clones content and replaces mention objectId keys with real UUIDs.
 */
function replaceMentionKeys(
  content: unknown[],
  keyToId: Map<string, string>,
): { content: unknown[]; changed: boolean } {
  let changed = false

  function walk(node: unknown): unknown {
    if (typeof node !== 'object' || node === null) return node
    if (Array.isArray(node)) return node.map(walk)

    const record = { ...(node as Record<string, unknown>) }

    if (record.type === 'mention' && typeof record.objectId === 'string') {
      const realId = keyToId.get(record.objectId)
      if (realId) {
        record.objectId = realId
        changed = true
      }
    }

    if (Array.isArray(record.children)) {
      record.children = record.children.map(walk)
    }

    return record
  }

  const result = content.map(walk) as unknown[]
  return { content: result, changed }
}
