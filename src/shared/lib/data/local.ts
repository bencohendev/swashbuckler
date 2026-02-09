import Dexie, { type EntityTable } from 'dexie'
import type {
  DataClient,
  ObjectsClient,
  ObjectTypesClient,
  DataObject,
  ObjectType,
  CreateObjectInput,
  UpdateObjectInput,
  CreateObjectTypeInput,
  UpdateObjectTypeInput,
  ListObjectsOptions,
  DataResult,
  DataListResult,
} from './types'
import { BUILT_IN_TYPE_IDS } from './types'

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
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// IndexedDB database schema
class SwashbucklerDB extends Dexie {
  objects!: EntityTable<DataObject, 'id'>
  objectTypes!: EntityTable<ObjectType, 'id'>

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

function createObjectTypesClient(): ObjectTypesClient {
  return {
    async list(): Promise<DataListResult<ObjectType>> {
      try {
        const database = getDB()
        const results = await database.objectTypes.toArray()
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

function createObjectsClient(): ObjectsClient {
  return {
    async list(options: ListObjectsOptions = {}): Promise<DataListResult<DataObject>> {
      try {
        const database = getDB()
        const collection = database.objects.toCollection()

        // Apply filters
        const filters: ((obj: DataObject) => boolean)[] = []

        if (options.parentId !== undefined) {
          filters.push(obj => obj.parent_id === options.parentId)
        }

        if (options.typeId) {
          filters.push(obj => obj.type_id === options.typeId)
        }

        if (options.isDeleted !== undefined) {
          filters.push(obj => obj.is_deleted === options.isDeleted)
        }

        if (options.isTemplate !== undefined) {
          filters.push(obj => obj.is_template === options.isTemplate)
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

        const obj: DataObject = {
          id: generateUUID(),
          title: input.title,
          type_id: input.type_id,
          owner_id: null, // Guest mode has no owner
          parent_id: input.parent_id ?? null,
          icon: input.icon ?? null,
          cover_image: input.cover_image ?? null,
          properties: input.properties ?? {},
          content: input.content ?? null,
          is_template: input.is_template ?? false,
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

    async search(query: string): Promise<DataListResult<DataObject>> {
      try {
        const database = getDB()
        const lowerQuery = query.toLowerCase()

        const results = await database.objects
          .filter(obj =>
            !obj.is_deleted &&
            obj.title.toLowerCase().includes(lowerQuery)
          )
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

export function createLocalDataClient(): DataClient {
  return {
    objects: createObjectsClient(),
    objectTypes: createObjectTypesClient(),
    isLocal: true,
  }
}

export async function clearLocalData(): Promise<void> {
  const database = getDB()
  await database.objects.clear()
  await database.objectTypes.clear()
  // Re-seed built-in types
  await database.objectTypes.bulkAdd(BUILT_IN_TYPES)
}

export async function exportLocalData(): Promise<{ objects: DataObject[]; objectTypes: ObjectType[] }> {
  const database = getDB()
  const objects = await database.objects.toArray()
  const objectTypes = await database.objectTypes.toArray()
  return { objects, objectTypes }
}
