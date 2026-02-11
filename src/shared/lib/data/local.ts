import Dexie, { type EntityTable } from 'dexie'
import type {
  DataClient,
  ObjectsClient,
  ObjectTypesClient,
  TemplatesClient,
  RelationsClient,
  SpacesClient,
  SharingClient,
  Space,
  DataObject,
  ObjectType,
  ObjectRelation,
  Template,
  CreateObjectInput,
  UpdateObjectInput,
  CreateObjectTypeInput,
  UpdateObjectTypeInput,
  CreateObjectRelationInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  ListObjectsOptions,
  ListRelationsOptions,
  ListAllRelationsOptions,
  ListTemplatesOptions,
  SearchOptions,
  DataResult,
  DataListResult,
} from './types'
import { extractTextFromContent } from '@/features/search/lib/extractText'
import { BUILT_IN_TYPE_IDS } from './types'

const LOCAL_DEFAULT_SPACE_ID = '00000000-0000-0000-0000-000000000099'

const BUILT_IN_TYPES: ObjectType[] = [
  {
    id: BUILT_IN_TYPE_IDS.page,
    name: 'Page',
    plural_name: 'Pages',
    slug: 'page',
    icon: 'file-text',
    color: null,
    fields: [],
    is_built_in: true,
    owner_id: null,
    space_id: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: BUILT_IN_TYPE_IDS.note,
    name: 'Note',
    plural_name: 'Notes',
    slug: 'note',
    icon: 'sticky-note',
    color: null,
    fields: [],
    is_built_in: true,
    owner_id: null,
    space_id: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// IndexedDB database schema
class SwashbucklerDB extends Dexie {
  objects!: EntityTable<DataObject, 'id'>
  objectTypes!: EntityTable<ObjectType, 'id'>
  templates!: EntityTable<Template, 'id'>
  objectRelations!: EntityTable<ObjectRelation, 'id'>
  spaces!: EntityTable<Space, 'id'>

  constructor() {
    super('swashbuckler')

    this.version(1).stores({
      objects: 'id, title, type, parent_id, is_deleted, updated_at',
    })

    this.version(2).stores({
      objects: 'id, title, type_id, parent_id, is_deleted, updated_at',
      objectTypes: 'id, name, slug, owner_id, sort_order',
    }).upgrade(async (tx) => {
      // Seed built-in types
      await tx.table('objectTypes').bulkAdd(BUILT_IN_TYPES)

      // Migrate existing objects: type -> type_id
      await tx.table('objects').toCollection().modify((obj: Record<string, unknown>) => {
        if (obj.type === 'page') {
          obj.type_id = BUILT_IN_TYPE_IDS.page
        } else if (obj.type === 'note') {
          obj.type_id = BUILT_IN_TYPE_IDS.note
        } else {
          // Fallback: assign to page type
          obj.type_id = BUILT_IN_TYPE_IDS.page
        }
        delete obj.type
      })
    })

    this.version(3).stores({
      objects: 'id, title, type_id, parent_id, is_deleted, updated_at',
      objectTypes: 'id, name, slug, owner_id, sort_order',
    }).upgrade(async (tx) => {
      // Add plural_name to existing types
      await tx.table('objectTypes').toCollection().modify((type: Record<string, unknown>) => {
        if (!type.plural_name) {
          type.plural_name = (type.name as string) + 's'
        }
      })
    })

    this.version(4).stores({
      objects: 'id, title, type_id, parent_id, is_deleted, updated_at',
      objectTypes: 'id, name, slug, owner_id, sort_order',
      templates: 'id, name, type_id, owner_id, updated_at',
    }).upgrade(async (tx) => {
      // Migrate template objects to the new templates table
      const allObjects = await tx.table('objects').toArray()
      const templateObjects = allObjects.filter(
        (obj: Record<string, unknown>) => obj.is_template === true && obj.is_deleted !== true
      )

      for (const obj of templateObjects) {
        await tx.table('templates').add({
          id: obj.id,
          name: obj.title,
          type_id: obj.type_id,
          owner_id: obj.owner_id,
          icon: obj.icon,
          cover_image: obj.cover_image,
          properties: obj.properties ?? {},
          content: obj.content ?? null,
          created_at: obj.created_at,
          updated_at: obj.updated_at,
        })
      }

      // Delete all template objects (including soft-deleted ones)
      const templateIds = allObjects
        .filter((obj: Record<string, unknown>) => obj.is_template === true)
        .map((obj: Record<string, unknown>) => obj.id)
      await tx.table('objects').bulkDelete(templateIds)

      // Remove is_template field from remaining objects
      await tx.table('objects').toCollection().modify((obj: Record<string, unknown>) => {
        delete obj.is_template
      })
    })

    this.version(5).stores({
      objects: 'id, title, type_id, parent_id, is_deleted, updated_at',
      objectTypes: 'id, name, slug, owner_id, sort_order',
      templates: 'id, name, type_id, owner_id, updated_at',
      objectRelations: 'id, source_id, target_id, relation_type, created_at',
    })

    this.version(6).stores({
      objects: 'id, title, type_id, parent_id, is_deleted, updated_at, space_id',
      objectTypes: 'id, name, slug, owner_id, sort_order, space_id',
      templates: 'id, name, type_id, owner_id, updated_at, space_id',
      objectRelations: 'id, source_id, target_id, relation_type, created_at',
      spaces: 'id, name, owner_id, created_at',
    }).upgrade(async (tx) => {
      // Create default local space
      const now = new Date().toISOString()
      await tx.table('spaces').add({
        id: LOCAL_DEFAULT_SPACE_ID,
        name: 'My Space',
        icon: '📁',
        owner_id: 'local',
        created_at: now,
        updated_at: now,
      })

      // Backfill space_id on all existing objects
      await tx.table('objects').toCollection().modify((obj: Record<string, unknown>) => {
        obj.space_id = LOCAL_DEFAULT_SPACE_ID
      })

      // Backfill space_id on custom object types (not built-in)
      await tx.table('objectTypes').toCollection().modify((type: Record<string, unknown>) => {
        if (!type.is_built_in) {
          type.space_id = LOCAL_DEFAULT_SPACE_ID
        } else {
          type.space_id = null
        }
      })

      // Backfill space_id on all templates
      await tx.table('templates').toCollection().modify((template: Record<string, unknown>) => {
        template.space_id = LOCAL_DEFAULT_SPACE_ID
      })
    })
  }
}

let db: SwashbucklerDB | null = null

function getDB(): SwashbucklerDB {
  if (!db) {
    db = new SwashbucklerDB()
  }
  return db
}

function generateUUID(): string {
  return crypto.randomUUID()
}

function createObjectTypesClient(spaceId?: string): ObjectTypesClient {
  return {
    async list(): Promise<DataListResult<ObjectType>> {
      try {
        const database = getDB()
        let results = await database.objectTypes.toArray()
        // Return built-in types plus space-specific types
        if (spaceId) {
          results = results.filter(t => t.is_built_in || t.space_id === spaceId)
        }
        results.sort((a, b) => a.sort_order - b.sort_order)
        return { data: results, error: null }
      } catch (error) {
        return {
          data: [],
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async get(id: string): Promise<DataResult<ObjectType>> {
      try {
        const database = getDB()
        const objectType = await database.objectTypes.get(id)

        if (!objectType) {
          return { data: null, error: { message: 'Object type not found', code: 'NOT_FOUND' } }
        }

        return { data: objectType, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async create(input: CreateObjectTypeInput): Promise<DataResult<ObjectType>> {
      try {
        const database = getDB()
        const now = new Date().toISOString()

        // Determine sort_order if not provided
        let sortOrder = input.sort_order
        if (sortOrder === undefined) {
          const all = await database.objectTypes.toArray()
          sortOrder = all.length > 0 ? Math.max(...all.map(t => t.sort_order)) + 1 : 0
        }

        const objectType: ObjectType = {
          id: generateUUID(),
          name: input.name,
          plural_name: input.plural_name,
          slug: input.slug,
          icon: input.icon,
          color: input.color ?? null,
          fields: input.fields ?? [],
          is_built_in: false,
          owner_id: null,
          space_id: spaceId ?? null,
          sort_order: sortOrder,
          created_at: now,
          updated_at: now,
        }

        await database.objectTypes.add(objectType)
        return { data: objectType, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async update(id: string, input: UpdateObjectTypeInput): Promise<DataResult<ObjectType>> {
      try {
        const database = getDB()
        const existing = await database.objectTypes.get(id)

        if (!existing) {
          return { data: null, error: { message: 'Object type not found', code: 'NOT_FOUND' } }
        }

        if (existing.is_built_in) {
          // Allow updating fields on built-in types but not name/slug/icon
          const allowed: UpdateObjectTypeInput = { fields: input.fields, sort_order: input.sort_order }
          const updated: ObjectType = {
            ...existing,
            ...allowed,
            updated_at: new Date().toISOString(),
          }
          await database.objectTypes.put(updated)
          return { data: updated, error: null }
        }

        const updated: ObjectType = {
          ...existing,
          ...input,
          updated_at: new Date().toISOString(),
        }

        await database.objectTypes.put(updated)
        return { data: updated, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async delete(id: string): Promise<DataResult<void>> {
      try {
        const database = getDB()
        const existing = await database.objectTypes.get(id)

        if (!existing) {
          return { data: null, error: { message: 'Object type not found', code: 'NOT_FOUND' } }
        }

        if (existing.is_built_in) {
          return { data: null, error: { message: 'Cannot delete built-in types' } }
        }

        await database.objectTypes.delete(id)
        return { data: null, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },
  }
}

function createObjectsClient(spaceId?: string): ObjectsClient {
  return {
    async list(options: ListObjectsOptions = {}): Promise<DataListResult<DataObject>> {
      try {
        const database = getDB()
        const collection = database.objects.toCollection()

        // Apply filters
        const filters: ((obj: DataObject) => boolean)[] = []

        if (spaceId) {
          filters.push(obj => obj.space_id === spaceId)
        }

        if (options.parentId !== undefined) {
          filters.push(obj => obj.parent_id === options.parentId)
        }

        if (options.typeId) {
          filters.push(obj => obj.type_id === options.typeId)
        }

        if (options.isDeleted !== undefined) {
          filters.push(obj => obj.is_deleted === options.isDeleted)
        }

        let results = await collection.toArray()

        // Apply filters
        for (const filter of filters) {
          results = results.filter(filter)
        }

        // Sort by updated_at descending
        results.sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )

        // Apply pagination
        if (options.offset) {
          results = results.slice(options.offset)
        }

        if (options.limit) {
          results = results.slice(0, options.limit)
        }

        return { data: results, error: null }
      } catch (error) {
        return {
          data: [],
          error: { message: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    },

    async get(id: string): Promise<DataResult<DataObject>> {
      try {
        const database = getDB()
        const obj = await database.objects.get(id)

        if (!obj) {
          return { data: null, error: { message: 'Object not found', code: 'NOT_FOUND' } }
        }

        return { data: obj, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    },

    async create(input: CreateObjectInput): Promise<DataResult<DataObject>> {
      try {
        const database = getDB()
        const now = new Date().toISOString()
        const effectiveSpaceId = spaceId ?? LOCAL_DEFAULT_SPACE_ID

        const obj: DataObject = {
          id: generateUUID(),
          title: input.title,
          type_id: input.type_id,
          owner_id: null, // Guest mode has no owner
          space_id: effectiveSpaceId,
          parent_id: input.parent_id ?? null,
          icon: input.icon ?? null,
          cover_image: input.cover_image ?? null,
          properties: input.properties ?? {},
          content: input.content ?? null,
          is_deleted: false,
          deleted_at: null,
          created_at: now,
          updated_at: now,
        }

        await database.objects.add(obj)

        return { data: obj, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    },

    async update(id: string, input: UpdateObjectInput): Promise<DataResult<DataObject>> {
      try {
        const database = getDB()
        const existing = await database.objects.get(id)

        if (!existing) {
          return { data: null, error: { message: 'Object not found', code: 'NOT_FOUND' } }
        }

        const updated: DataObject = {
          ...existing,
          ...input,
          updated_at: new Date().toISOString(),
        }

        await database.objects.put(updated)

        return { data: updated, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    },

    async delete(id: string, permanent = false): Promise<DataResult<void>> {
      try {
        const database = getDB()

        if (permanent) {
          await database.objects.delete(id)
          // Cascade: delete relations referencing this object
          const relatedRelations = await database.objectRelations
            .filter(r => r.source_id === id || r.target_id === id)
            .toArray()
          if (relatedRelations.length > 0) {
            await database.objectRelations.bulkDelete(relatedRelations.map(r => r.id))
          }
        } else {
          const existing = await database.objects.get(id)
          if (existing) {
            await database.objects.put({
              ...existing,
              is_deleted: true,
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
        }

        return { data: null, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    },

    async restore(id: string): Promise<DataResult<DataObject>> {
      try {
        const database = getDB()
        const existing = await database.objects.get(id)

        if (!existing) {
          return { data: null, error: { message: 'Object not found', code: 'NOT_FOUND' } }
        }

        const restored: DataObject = {
          ...existing,
          is_deleted: false,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        }

        await database.objects.put(restored)

        return { data: restored, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    },

    async purgeExpired(): Promise<DataResult<number>> {
      try {
        const database = getDB()
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime()

        const expired = await database.objects
          .filter(obj => obj.is_deleted && obj.deleted_at != null && new Date(obj.deleted_at).getTime() < thirtyDaysAgo)
          .toArray()

        if (expired.length === 0) {
          return { data: 0, error: null }
        }

        const expiredIds = expired.map(obj => obj.id)

        // Cascade: delete relations referencing expired objects
        const expiredIdSet = new Set(expiredIds)
        const relatedRelations = await database.objectRelations
          .filter(r => expiredIdSet.has(r.source_id) || expiredIdSet.has(r.target_id))
          .toArray()
        if (relatedRelations.length > 0) {
          await database.objectRelations.bulkDelete(relatedRelations.map(r => r.id))
        }

        await database.objects.bulkDelete(expiredIds)

        return { data: expiredIds.length, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async search(query: string, options?: SearchOptions): Promise<DataListResult<DataObject>> {
      try {
        const database = getDB()
        const lowerQuery = query.toLowerCase()

        const results = await database.objects
          .filter(obj => {
            if (obj.is_deleted) return false
            if (spaceId && obj.space_id !== spaceId) return false
            if (options?.typeIds && options.typeIds.length > 0 && !options.typeIds.includes(obj.type_id)) return false

            const titleMatch = obj.title.toLowerCase().includes(lowerQuery)
            if (titleMatch) return true

            const contentText = extractTextFromContent(obj.content)
            return contentText.toLowerCase().includes(lowerQuery)
          })
          .limit(50)
          .toArray()

        // Sort by updated_at descending
        results.sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )

        return { data: results, error: null }
      } catch (error) {
        return {
          data: [],
          error: { message: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    },
  }
}

function createTemplatesClient(spaceId?: string): TemplatesClient {
  return {
    async list(options: ListTemplatesOptions = {}): Promise<DataListResult<Template>> {
      try {
        const database = getDB()
        let results = await database.templates.toArray()

        if (spaceId) {
          results = results.filter(t => t.space_id === spaceId)
        }

        if (options.typeId) {
          results = results.filter(t => t.type_id === options.typeId)
        }

        results.sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )

        return { data: results, error: null }
      } catch (error) {
        return {
          data: [],
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async get(id: string): Promise<DataResult<Template>> {
      try {
        const database = getDB()
        const template = await database.templates.get(id)

        if (!template) {
          return { data: null, error: { message: 'Template not found', code: 'NOT_FOUND' } }
        }

        return { data: template, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async create(input: CreateTemplateInput): Promise<DataResult<Template>> {
      try {
        const database = getDB()
        const now = new Date().toISOString()
        const effectiveSpaceId = spaceId ?? LOCAL_DEFAULT_SPACE_ID

        const template: Template = {
          id: generateUUID(),
          name: input.name,
          type_id: input.type_id,
          owner_id: null, // Guest mode has no owner
          space_id: effectiveSpaceId,
          icon: input.icon ?? null,
          cover_image: input.cover_image ?? null,
          properties: input.properties ?? {},
          content: input.content ?? null,
          created_at: now,
          updated_at: now,
        }

        await database.templates.add(template)
        return { data: template, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async update(id: string, input: UpdateTemplateInput): Promise<DataResult<Template>> {
      try {
        const database = getDB()
        const existing = await database.templates.get(id)

        if (!existing) {
          return { data: null, error: { message: 'Template not found', code: 'NOT_FOUND' } }
        }

        const updated: Template = {
          ...existing,
          ...input,
          updated_at: new Date().toISOString(),
        }

        await database.templates.put(updated)
        return { data: updated, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async delete(id: string): Promise<DataResult<void>> {
      try {
        const database = getDB()
        await database.templates.delete(id)
        return { data: null, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },
  }
}

function createRelationsClient(spaceId?: string): RelationsClient {
  return {
    async listAll(options: ListAllRelationsOptions = {}): Promise<DataListResult<ObjectRelation>> {
      try {
        const database = getDB()

        // Get non-deleted object IDs in this space
        let objects = await database.objects.filter(o => !o.is_deleted).toArray()
        if (spaceId) {
          objects = objects.filter(o => o.space_id === spaceId)
        }
        const objectIds = new Set(objects.map(o => o.id))

        if (objectIds.size === 0) {
          return { data: [], error: null }
        }

        let results = await database.objectRelations.toArray()

        if (options.relationType) {
          results = results.filter(r => r.relation_type === options.relationType)
        }

        // Filter to relations where both endpoints exist in the space
        results = results.filter(r => objectIds.has(r.source_id) && objectIds.has(r.target_id))

        results.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        return { data: results, error: null }
      } catch (error) {
        return {
          data: [],
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async list(options: ListRelationsOptions): Promise<DataListResult<ObjectRelation>> {
      try {
        const database = getDB()
        const results = await database.objectRelations
          .filter(r => {
            const matchesObject = r.source_id === options.objectId || r.target_id === options.objectId
            if (!matchesObject) return false
            if (options.relationType) return r.relation_type === options.relationType
            return true
          })
          .toArray()

        results.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        return { data: results, error: null }
      } catch (error) {
        return {
          data: [],
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async create(input: CreateObjectRelationInput): Promise<DataResult<ObjectRelation>> {
      try {
        const database = getDB()

        if (input.source_id === input.target_id) {
          return { data: null, error: { message: 'Cannot create self-referencing relation' } }
        }

        // Check for duplicate
        const existing = await database.objectRelations
          .filter(r =>
            r.source_id === input.source_id &&
            r.target_id === input.target_id &&
            r.relation_type === (input.relation_type ?? 'link') &&
            r.source_property === (input.source_property ?? null)
          )
          .first()

        if (existing) {
          return { data: existing, error: null }
        }

        const relation: ObjectRelation = {
          id: generateUUID(),
          source_id: input.source_id,
          target_id: input.target_id,
          relation_type: input.relation_type ?? 'link',
          source_property: input.source_property ?? null,
          context: input.context ?? null,
          created_at: new Date().toISOString(),
        }

        await database.objectRelations.add(relation)
        return { data: relation, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async delete(id: string): Promise<DataResult<void>> {
      try {
        const database = getDB()
        await database.objectRelations.delete(id)
        return { data: null, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async deleteBySourceAndTarget(sourceId: string, targetId: string, relationType?: string): Promise<DataResult<void>> {
      try {
        const database = getDB()
        const matches = await database.objectRelations
          .filter(r => {
            if (r.source_id !== sourceId || r.target_id !== targetId) return false
            if (relationType) return r.relation_type === relationType
            return true
          })
          .toArray()

        await database.objectRelations.bulkDelete(matches.map(r => r.id))
        return { data: null, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async syncMentions(sourceId: string, mentionTargetIds: string[]): Promise<DataResult<void>> {
      try {
        const database = getDB()

        const existing = await database.objectRelations
          .filter(r => r.source_id === sourceId && r.relation_type === 'mention')
          .toArray()

        const existingTargetIds = new Set(existing.map(r => r.target_id))
        const desiredTargetIds = new Set(mentionTargetIds.filter(id => id !== sourceId))

        // Delete removed mentions
        const toDelete = existing.filter(r => !desiredTargetIds.has(r.target_id))
        if (toDelete.length > 0) {
          await database.objectRelations.bulkDelete(toDelete.map(r => r.id))
        }

        // Add new mentions
        const toAdd: ObjectRelation[] = []
        for (const targetId of desiredTargetIds) {
          if (!existingTargetIds.has(targetId)) {
            toAdd.push({
              id: generateUUID(),
              source_id: sourceId,
              target_id: targetId,
              relation_type: 'mention',
              source_property: null,
              context: null,
              created_at: new Date().toISOString(),
            })
          }
        }
        if (toAdd.length > 0) {
          await database.objectRelations.bulkAdd(toAdd)
        }

        return { data: null, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },
  }
}

function createLocalSpacesClient(): SpacesClient {
  return {
    async list(): Promise<DataListResult<Space>> {
      try {
        const database = getDB()
        const results = await database.spaces.toArray()
        results.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        return { data: results, error: null }
      } catch (error) {
        return {
          data: [],
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async get(id: string): Promise<DataResult<Space>> {
      try {
        const database = getDB()
        const space = await database.spaces.get(id)

        if (!space) {
          return { data: null, error: { message: 'Space not found', code: 'NOT_FOUND' } }
        }

        return { data: space, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async create(input: { name: string; icon?: string }): Promise<DataResult<Space>> {
      try {
        const database = getDB()
        const now = new Date().toISOString()

        const space: Space = {
          id: generateUUID(),
          name: input.name,
          icon: input.icon ?? '📁',
          owner_id: 'local',
          created_at: now,
          updated_at: now,
        }

        await database.spaces.add(space)
        return { data: space, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async update(id: string, input: { name?: string; icon?: string }): Promise<DataResult<Space>> {
      try {
        const database = getDB()
        const existing = await database.spaces.get(id)

        if (!existing) {
          return { data: null, error: { message: 'Space not found', code: 'NOT_FOUND' } }
        }

        const updated: Space = {
          ...existing,
          ...input,
          updated_at: new Date().toISOString(),
        }

        await database.spaces.put(updated)
        return { data: updated, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },

    async delete(id: string): Promise<DataResult<void>> {
      try {
        const database = getDB()
        // Delete all objects, types, and templates in this space
        const objectsInSpace = await database.objects.filter(o => o.space_id === id).toArray()
        if (objectsInSpace.length > 0) {
          await database.objects.bulkDelete(objectsInSpace.map(o => o.id))
        }
        const typesInSpace = await database.objectTypes.filter(t => t.space_id === id).toArray()
        if (typesInSpace.length > 0) {
          await database.objectTypes.bulkDelete(typesInSpace.map(t => t.id))
        }
        const templatesInSpace = await database.templates.filter(t => t.space_id === id).toArray()
        if (templatesInSpace.length > 0) {
          await database.templates.bulkDelete(templatesInSpace.map(t => t.id))
        }
        await database.spaces.delete(id)
        return { data: null, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : 'Unknown error' },
        }
      }
    },
  }
}

function createNoOpSharingClient(): SharingClient {
  const notAvailable = { message: 'Sharing is not available in guest mode' }
  return {
    async listShares() { return { data: [], error: notAvailable } },
    async getShare() { return { data: null, error: notAvailable } },
    async createShare() { return { data: null, error: notAvailable } },
    async updateShare() { return { data: null, error: notAvailable } },
    async deleteShare() { return { data: null, error: notAvailable } },
    async listExclusions() { return { data: [], error: notAvailable } },
    async addExclusion() { return { data: null, error: notAvailable } },
    async removeExclusion() { return { data: null, error: notAvailable } },
    async findUserByEmail() { return { data: null, error: notAvailable } },
    async getSharedSpaces() { return { data: [], error: notAvailable } },
  }
}

export function createLocalDataClient(spaceId?: string): DataClient {
  return {
    objects: createObjectsClient(spaceId),
    objectTypes: createObjectTypesClient(spaceId),
    templates: createTemplatesClient(spaceId),
    relations: createRelationsClient(spaceId),
    spaces: createLocalSpacesClient(),
    sharing: createNoOpSharingClient(),
    isLocal: true,
  }
}

export async function clearLocalData(): Promise<void> {
  const database = getDB()
  await database.objects.clear()
  await database.objectTypes.clear()
  await database.templates.clear()
  await database.objectRelations.clear()
  await database.spaces.clear()
  // Re-seed built-in types
  await database.objectTypes.bulkAdd(BUILT_IN_TYPES)
}

export async function exportLocalData(): Promise<{
  objects: DataObject[]
  objectTypes: ObjectType[]
  templates: Template[]
  objectRelations: ObjectRelation[]
  spaces: Space[]
}> {
  const database = getDB()
  const objects = await database.objects.toArray()
  const objectTypes = await database.objectTypes.toArray()
  const templates = await database.templates.toArray()
  const objectRelations = await database.objectRelations.toArray()
  const spaces = await database.spaces.toArray()
  return { objects, objectTypes, templates, objectRelations, spaces }
}

export async function ensureLocalDefaultSpace(): Promise<Space> {
  const database = getDB()
  const existing = await database.spaces.get(LOCAL_DEFAULT_SPACE_ID)
  if (existing) return existing

  const now = new Date().toISOString()
  const space: Space = {
    id: LOCAL_DEFAULT_SPACE_ID,
    name: 'My Space',
    icon: '📁',
    owner_id: 'local',
    created_at: now,
    updated_at: now,
  }
  await database.spaces.add(space)
  return space
}

export { LOCAL_DEFAULT_SPACE_ID }
