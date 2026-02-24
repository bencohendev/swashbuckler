import Dexie, { type EntityTable } from 'dexie'
import type {
  DataClient,
  ObjectsClient,
  ObjectTypesClient,
  GlobalObjectTypesClient,
  TemplatesClient,
  RelationsClient,
  SpacesClient,
  SharingClient,
  TagsClient,
  PinsClient,
  Pin,
  Space,
  DataObject,
  ObjectType,
  ObjectRelation,
  Template,
  Tag,
  ObjectTag,
  CreateObjectInput,
  UpdateObjectInput,
  CreateObjectTypeInput,
  UpdateObjectTypeInput,
  CreateObjectRelationInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateTagInput,
  UpdateTagInput,
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

// Default Page type ID for fresh local databases
const LOCAL_DEFAULT_PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'

const DEFAULT_TYPES: ObjectType[] = [
  {
    id: LOCAL_DEFAULT_PAGE_TYPE_ID,
    name: 'Page',
    plural_name: 'Pages',
    slug: 'page',
    icon: 'file-text',
    color: null,
    fields: [],
    is_built_in: false,
    owner_id: null,
    space_id: LOCAL_DEFAULT_SPACE_ID,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// Legacy built-in types for Dexie v2 migration (upgrading from v1)
const LEGACY_BUILT_IN_TYPES: ObjectType[] = [
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
  tags!: EntityTable<Tag, 'id'>
  objectTags!: EntityTable<ObjectTag, 'id'>
  pins!: EntityTable<Pin, 'id'>

  constructor() {
    super('swashbuckler')

    this.version(1).stores({
      objects: 'id, title, type, parent_id, is_deleted, updated_at',
    })

    this.version(2).stores({
      objects: 'id, title, type_id, parent_id, is_deleted, updated_at',
      objectTypes: 'id, name, slug, owner_id, sort_order',
    }).upgrade(async (tx) => {
      // Seed built-in types (legacy, converted to regular types in v7)
      await tx.table('objectTypes').bulkAdd(LEGACY_BUILT_IN_TYPES)

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

    // Version 7: Convert built-in types to regular space-scoped types
    this.version(7).stores({
      objects: 'id, title, type_id, parent_id, is_deleted, updated_at, space_id',
      objectTypes: 'id, name, slug, owner_id, sort_order, space_id',
      templates: 'id, name, type_id, owner_id, updated_at, space_id',
      objectRelations: 'id, source_id, target_id, relation_type, created_at',
      spaces: 'id, name, owner_id, created_at',
    }).upgrade(async (tx) => {
      // Convert built-in types to regular types with space_id
      await tx.table('objectTypes').toCollection().modify((type: Record<string, unknown>) => {
        if (type.is_built_in) {
          type.is_built_in = false
          type.space_id = LOCAL_DEFAULT_SPACE_ID
        }
      })

      // Check if Note type has any objects referencing it
      const noteTypeId = BUILT_IN_TYPE_IDS.note
      const noteObjects = await tx.table('objects')
        .filter((obj: Record<string, unknown>) => obj.type_id === noteTypeId)
        .count()

      // Also check templates
      const noteTemplates = await tx.table('templates')
        .filter((t: Record<string, unknown>) => t.type_id === noteTypeId)
        .count()

      // If no objects or templates reference Note type, delete it
      if (noteObjects === 0 && noteTemplates === 0) {
        await tx.table('objectTypes').delete(noteTypeId)
      }
    })

    // Version 8: Add tags and objectTags tables
    this.version(8).stores({
      objects: 'id, title, type_id, parent_id, is_deleted, updated_at, space_id',
      objectTypes: 'id, name, slug, owner_id, sort_order, space_id',
      templates: 'id, name, type_id, owner_id, updated_at, space_id',
      objectRelations: 'id, source_id, target_id, relation_type, created_at',
      spaces: 'id, name, owner_id, created_at',
      tags: 'id, name, space_id',
      objectTags: 'id, object_id, tag_id',
    })

    // Version 9: Add pins table
    this.version(9).stores({
      objects: 'id, title, type_id, parent_id, is_deleted, updated_at, space_id',
      objectTypes: 'id, name, slug, owner_id, sort_order, space_id',
      templates: 'id, name, type_id, owner_id, updated_at, space_id',
      objectRelations: 'id, source_id, target_id, relation_type, created_at',
      spaces: 'id, name, owner_id, created_at',
      tags: 'id, name, space_id',
      objectTags: 'id, object_id, tag_id',
      pins: 'id, object_id',
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
        if (spaceId) {
          results = results.filter(t => t.space_id === spaceId)
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

        // Cascade: delete associated objects, their relations/tags/pins, and templates
        const objectIds = await database.objects
          .where('type_id').equals(id)
          .primaryKeys()

        if (objectIds.length > 0) {
          for (const oid of objectIds) {
            await database.objectRelations
              .where('source_id').equals(oid).delete()
            await database.objectRelations
              .where('target_id').equals(oid).delete()
            await database.objectTags
              .where('object_id').equals(oid).delete()
            await database.pins
              .where('object_id').equals(oid).delete()
          }
          await database.objects.where('type_id').equals(id).delete()
        }

        await database.templates.where('type_id').equals(id).delete()
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

function createLocalGlobalObjectTypesClient(): GlobalObjectTypesClient {
  return {
    async list(): Promise<DataListResult<ObjectType>> {
      try {
        const database = getDB()
        const results = await database.objectTypes
          .filter(t => t.space_id === null || t.space_id === undefined)
          .toArray()
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

        if (!objectType || (objectType.space_id !== null && objectType.space_id !== undefined)) {
          return { data: null, error: { message: 'Global type not found', code: 'NOT_FOUND' } }
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

        let sortOrder = input.sort_order
        if (sortOrder === undefined) {
          const all = await database.objectTypes
            .filter(t => t.space_id === null || t.space_id === undefined)
            .toArray()
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
          space_id: null,
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

        if (!existing || (existing.space_id !== null && existing.space_id !== undefined)) {
          return { data: null, error: { message: 'Global type not found', code: 'NOT_FOUND' } }
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

        if (!existing || (existing.space_id !== null && existing.space_id !== undefined)) {
          return { data: null, error: { message: 'Global type not found', code: 'NOT_FOUND' } }
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

    async importToSpace(id: string, targetSpaceId: string): Promise<DataResult<ObjectType>> {
      try {
        const database = getDB()
        const globalType = await database.objectTypes.get(id)

        if (!globalType || (globalType.space_id !== null && globalType.space_id !== undefined)) {
          return { data: null, error: { message: 'Global type not found', code: 'NOT_FOUND' } }
        }

        // Check for slug conflict in target space
        const existing = await database.objectTypes
          .filter(t => t.space_id === targetSpaceId && t.slug === globalType.slug)
          .first()

        if (existing) {
          return { data: null, error: { message: `A type with slug "${globalType.slug}" already exists in this space`, code: 'DUPLICATE' } }
        }

        // Copy with new field UUIDs
        const now = new Date().toISOString()
        const newType: ObjectType = {
          id: generateUUID(),
          name: globalType.name,
          plural_name: globalType.plural_name,
          slug: globalType.slug,
          icon: globalType.icon,
          color: globalType.color,
          fields: globalType.fields.map(field => ({
            ...field,
            id: generateUUID(),
          })),
          is_built_in: false,
          owner_id: globalType.owner_id,
          space_id: targetSpaceId,
          sort_order: globalType.sort_order,
          created_at: now,
          updated_at: now,
        }

        await database.objectTypes.add(newType)
        return { data: newType, error: null }
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
          // Cascade: delete object_tags referencing this object
          const relatedTags = await database.objectTags
            .filter(ot => ot.object_id === id)
            .toArray()
          if (relatedTags.length > 0) {
            await database.objectTags.bulkDelete(relatedTags.map(ot => ot.id))
          }
          // Cascade: delete pins referencing this object
          const relatedPins = await database.pins
            .filter(p => p.object_id === id)
            .toArray()
          if (relatedPins.length > 0) {
            await database.pins.bulkDelete(relatedPins.map(p => p.id))
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
        // Cascade: delete object_tags referencing expired objects
        const relatedTags = await database.objectTags
          .filter(ot => expiredIdSet.has(ot.object_id))
          .toArray()
        if (relatedTags.length > 0) {
          await database.objectTags.bulkDelete(relatedTags.map(ot => ot.id))
        }
        // Cascade: delete pins referencing expired objects
        const relatedPins = await database.pins
          .filter(p => expiredIdSet.has(p.object_id))
          .toArray()
        if (relatedPins.length > 0) {
          await database.pins.bulkDelete(relatedPins.map(p => p.id))
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
          const objectIds = new Set(objectsInSpace.map(o => o.id))
          // Cascade: delete pins referencing objects in this space
          const relatedPins = await database.pins
            .filter(p => objectIds.has(p.object_id))
            .toArray()
          if (relatedPins.length > 0) {
            await database.pins.bulkDelete(relatedPins.map(p => p.id))
          }
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
        // Delete tags and object_tags in this space
        const tagsInSpace = await database.tags.filter(t => t.space_id === id).toArray()
        if (tagsInSpace.length > 0) {
          const tagIds = new Set(tagsInSpace.map(t => t.id))
          const relatedObjectTags = await database.objectTags
            .filter(ot => tagIds.has(ot.tag_id))
            .toArray()
          if (relatedObjectTags.length > 0) {
            await database.objectTags.bulkDelete(relatedObjectTags.map(ot => ot.id))
          }
          await database.tags.bulkDelete(tagsInSpace.map(t => t.id))
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

function createLocalTagsClient(spaceId?: string): TagsClient {
  const effectiveSpaceId = spaceId ?? LOCAL_DEFAULT_SPACE_ID
  return {
    async list(): Promise<DataListResult<Tag>> {
      try {
        const database = getDB()
        const results = await database.tags
          .filter(t => t.space_id === effectiveSpaceId)
          .toArray()
        results.sort((a, b) => a.name.localeCompare(b.name))
        return { data: results, error: null }
      } catch (error) {
        return { data: [], error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },

    async get(id: string): Promise<DataResult<Tag>> {
      try {
        const database = getDB()
        const tag = await database.tags.get(id)
        if (!tag) {
          return { data: null, error: { message: 'Tag not found', code: 'NOT_FOUND' } }
        }
        return { data: tag, error: null }
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },

    async create(input: CreateTagInput): Promise<DataResult<Tag>> {
      try {
        const database = getDB()
        // Check for duplicate name in space
        const existing = await database.tags
          .filter(t => t.space_id === effectiveSpaceId && t.name === input.name)
          .first()
        if (existing) {
          return { data: null, error: { message: 'A tag with this name already exists', code: 'DUPLICATE' } }
        }

        const now = new Date().toISOString()
        const tag: Tag = {
          id: generateUUID(),
          space_id: effectiveSpaceId,
          name: input.name,
          color: input.color ?? null,
          created_at: now,
          updated_at: now,
        }
        await database.tags.add(tag)
        return { data: tag, error: null }
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },

    async update(id: string, input: UpdateTagInput): Promise<DataResult<Tag>> {
      try {
        const database = getDB()
        const existing = await database.tags.get(id)
        if (!existing) {
          return { data: null, error: { message: 'Tag not found', code: 'NOT_FOUND' } }
        }
        const updated: Tag = {
          ...existing,
          ...input,
          updated_at: new Date().toISOString(),
        }
        await database.tags.put(updated)
        return { data: updated, error: null }
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },

    async delete(id: string): Promise<DataResult<void>> {
      try {
        const database = getDB()
        // Cascade: remove all object_tags for this tag
        const relatedObjectTags = await database.objectTags
          .filter(ot => ot.tag_id === id)
          .toArray()
        if (relatedObjectTags.length > 0) {
          await database.objectTags.bulkDelete(relatedObjectTags.map(ot => ot.id))
        }
        await database.tags.delete(id)
        return { data: null, error: null }
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },

    async getObjectTags(objectId: string): Promise<DataListResult<Tag>> {
      try {
        const database = getDB()
        const objectTags = await database.objectTags
          .filter(ot => ot.object_id === objectId)
          .toArray()
        const tagIds = objectTags.map(ot => ot.tag_id)
        if (tagIds.length === 0) return { data: [], error: null }
        const tags = await database.tags.bulkGet(tagIds)
        return { data: tags.filter((t): t is Tag => t !== undefined), error: null }
      } catch (error) {
        return { data: [], error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },

    async getObjectTagsBatch(objectIds: string[]): Promise<DataListResult<{ object_id: string; tags: Tag[] }>> {
      if (objectIds.length === 0) return { data: [], error: null }
      try {
        const database = getDB()
        const objectTags = await database.objectTags
          .where('object_id')
          .anyOf(objectIds)
          .toArray()

        const uniqueTagIds = [...new Set(objectTags.map(ot => ot.tag_id))]
        const allTags = uniqueTagIds.length > 0
          ? await database.tags.bulkGet(uniqueTagIds)
          : []
        const tagMap = new Map<string, Tag>()
        for (const tag of allTags) {
          if (tag) tagMap.set(tag.id, tag)
        }

        const grouped = new Map<string, Tag[]>()
        for (const ot of objectTags) {
          const tag = tagMap.get(ot.tag_id)
          if (!tag) continue
          const existing = grouped.get(ot.object_id)
          if (existing) {
            existing.push(tag)
          } else {
            grouped.set(ot.object_id, [tag])
          }
        }

        const result = objectIds.map(id => ({
          object_id: id,
          tags: grouped.get(id) ?? [],
        }))

        return { data: result, error: null }
      } catch (error) {
        return { data: [], error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },

    async addTagToObject(objectId: string, tagId: string): Promise<DataResult<ObjectTag>> {
      try {
        const database = getDB()
        // Check for duplicate
        const existing = await database.objectTags
          .filter(ot => ot.object_id === objectId && ot.tag_id === tagId)
          .first()
        if (existing) return { data: existing, error: null }

        const objectTag: ObjectTag = {
          id: generateUUID(),
          object_id: objectId,
          tag_id: tagId,
          created_at: new Date().toISOString(),
        }
        await database.objectTags.add(objectTag)
        return { data: objectTag, error: null }
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },

    async removeTagFromObject(objectId: string, tagId: string): Promise<DataResult<void>> {
      try {
        const database = getDB()
        const match = await database.objectTags
          .filter(ot => ot.object_id === objectId && ot.tag_id === tagId)
          .first()
        if (match) {
          await database.objectTags.delete(match.id)
        }
        return { data: null, error: null }
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },

    async getObjectsByTag(tagId: string): Promise<DataListResult<DataObject>> {
      try {
        const database = getDB()
        const objectTags = await database.objectTags
          .filter(ot => ot.tag_id === tagId)
          .toArray()
        const objectIds = objectTags.map(ot => ot.object_id)
        if (objectIds.length === 0) return { data: [], error: null }

        const objects = await database.objects.bulkGet(objectIds)
        const results = objects
          .filter((o): o is DataObject => o !== undefined && !o.is_deleted)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        return { data: results, error: null }
      } catch (error) {
        return { data: [], error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },
  }
}

function createLocalPinsClient(): PinsClient {
  return {
    async list(): Promise<DataListResult<Pin>> {
      try {
        const database = getDB()
        const results = await database.pins.toArray()
        results.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        return { data: results, error: null }
      } catch (error) {
        return { data: [], error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },

    async pin(objectId: string): Promise<DataResult<Pin>> {
      try {
        const database = getDB()
        // Check for duplicate
        const existing = await database.pins
          .filter(p => p.object_id === objectId)
          .first()
        if (existing) return { data: existing, error: null }

        const pin: Pin = {
          id: generateUUID(),
          user_id: null,
          object_id: objectId,
          created_at: new Date().toISOString(),
        }
        await database.pins.add(pin)
        return { data: pin, error: null }
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },

    async unpin(objectId: string): Promise<DataResult<void>> {
      try {
        const database = getDB()
        const match = await database.pins
          .filter(p => p.object_id === objectId)
          .first()
        if (match) {
          await database.pins.delete(match.id)
        }
        return { data: null, error: null }
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } }
      }
    },

    async isPinned(objectId: string): Promise<boolean> {
      try {
        const database = getDB()
        const match = await database.pins
          .filter(p => p.object_id === objectId)
          .first()
        return !!match
      } catch {
        return false
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
    async listSpaceExclusions() { return { data: [], error: notAvailable } },
    async addSpaceExclusion() { return { data: null, error: notAvailable } },
    async findUserByEmail() { return { data: null, error: notAvailable } },
    async getSharedSpaces() { return { data: [], error: notAvailable } },
  }
}

export function createLocalDataClient(spaceId?: string): DataClient {
  return {
    objects: createObjectsClient(spaceId),
    objectTypes: createObjectTypesClient(spaceId),
    globalObjectTypes: createLocalGlobalObjectTypesClient(),
    templates: createTemplatesClient(spaceId),
    relations: createRelationsClient(spaceId),
    spaces: createLocalSpacesClient(),
    sharing: createNoOpSharingClient(),
    tags: createLocalTagsClient(spaceId),
    pins: createLocalPinsClient(),
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
  await database.tags.clear()
  await database.objectTags.clear()
  await database.pins.clear()
  // Re-seed default types (Page only)
  await database.objectTypes.bulkAdd(DEFAULT_TYPES)
}

export async function exportLocalData(): Promise<{
  objects: DataObject[]
  objectTypes: ObjectType[]
  templates: Template[]
  objectRelations: ObjectRelation[]
  spaces: Space[]
  tags: Tag[]
  objectTags: ObjectTag[]
  pins: Pin[]
}> {
  const database = getDB()
  const objects = await database.objects.toArray()
  const objectTypes = await database.objectTypes.toArray()
  const templates = await database.templates.toArray()
  const objectRelations = await database.objectRelations.toArray()
  const spaces = await database.spaces.toArray()
  const tags = await database.tags.toArray()
  const objectTags = await database.objectTags.toArray()
  const pins = await database.pins.toArray()
  return { objects, objectTypes, templates, objectRelations, spaces, tags, objectTags, pins }
}

export async function ensureLocalDefaultTypes(): Promise<void> {
  const database = getDB()
  const count = await database.objectTypes.where('space_id').equals(LOCAL_DEFAULT_SPACE_ID).count()
  if (count > 0) return
  await database.objectTypes.bulkAdd(DEFAULT_TYPES)
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
