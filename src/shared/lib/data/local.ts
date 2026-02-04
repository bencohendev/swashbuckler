import Dexie, { type EntityTable } from 'dexie'
import type {
  DataClient,
  ObjectsClient,
  DataObject,
  CreateObjectInput,
  UpdateObjectInput,
  ListObjectsOptions,
  DataResult,
  DataListResult,
} from './types'

// IndexedDB database schema
class SwashbucklerDB extends Dexie {
  objects!: EntityTable<DataObject, 'id'>

  constructor() {
    super('swashbuckler')
    this.version(1).stores({
      objects: 'id, title, type, parent_id, is_deleted, updated_at',
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

        if (options.type) {
          filters.push(obj => obj.type === options.type)
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
          type: input.type,
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
    isLocal: true,
  }
}

export async function clearLocalData(): Promise<void> {
  const database = getDB()
  await database.objects.clear()
}

export async function exportLocalData(): Promise<DataObject[]> {
  const database = getDB()
  return database.objects.toArray()
}
