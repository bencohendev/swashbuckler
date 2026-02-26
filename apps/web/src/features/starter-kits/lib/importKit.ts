import type { DataClient, ObjectType } from '@/shared/lib/data'
import type { StarterKit } from '../data/kits'
import { emit } from '@/shared/lib/data/events'

export interface ImportKitResult {
  created: string[]
  skipped: string[]
  errors: string[]
}

export async function importKit(
  kit: StarterKit,
  dataClient: DataClient,
  existingTypes: ObjectType[],
): Promise<ImportKitResult> {
  const result: ImportKitResult = { created: [], skipped: [], errors: [] }

  const existingSlugs = new Set(existingTypes.map((t) => t.slug))
  const slugToTypeId = new Map<string, string>()

  for (const kitType of kit.types) {
    if (existingSlugs.has(kitType.slug)) {
      result.skipped.push(kitType.name)
      continue
    }

    const fields = kitType.fields.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      type: f.type,
      required: f.required,
      options: f.options,
      sort_order: f.sort_order,
    }))

    const createResult = await dataClient.objectTypes.create({
      name: kitType.name,
      plural_name: kitType.plural_name,
      slug: kitType.slug,
      icon: kitType.icon,
      color: kitType.color ?? null,
      fields,
    })

    if (createResult.error) {
      result.errors.push(`${kitType.name}: ${createResult.error.message}`)
    } else if (createResult.data) {
      result.created.push(kitType.name)
      slugToTypeId.set(kitType.slug, createResult.data.id)
    }
  }

  for (const kitTemplate of kit.templates) {
    const typeId = slugToTypeId.get(kitTemplate.type_slug)
    if (!typeId) continue

    const createResult = await dataClient.templates.create({
      name: kitTemplate.name,
      type_id: typeId,
      icon: kitTemplate.icon,
      properties: kitTemplate.properties,
      content: kitTemplate.content,
    })

    if (createResult.error) {
      result.errors.push(`Template "${kitTemplate.name}": ${createResult.error.message}`)
    }
  }

  if (result.created.length > 0) {
    emit('objectTypes')
    if (kit.templates.length > 0) {
      emit('templates')
    }
  }

  return result
}
