import type { SupabaseClient } from '@supabase/supabase-js'
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

function createObjectsClient(supabase: SupabaseClient): ObjectsClient {
  return {
    async list(options: ListObjectsOptions = {}): Promise<DataListResult<DataObject>> {
      let query = supabase
        .from('objects')
        .select('*')
        .order('updated_at', { ascending: false })

      if (options.parentId !== undefined) {
        query = options.parentId === null
          ? query.is('parent_id', null)
          : query.eq('parent_id', options.parentId)
      }

      if (options.type) {
        query = query.eq('type', options.type)
      }

      if (options.isDeleted !== undefined) {
        query = query.eq('is_deleted', options.isDeleted)
      }

      if (options.isTemplate !== undefined) {
        query = query.eq('is_template', options.isTemplate)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as DataObject[], error: null }
    },

    async get(id: string): Promise<DataResult<DataObject>> {
      const { data, error } = await supabase
        .from('objects')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as DataObject, error: null }
    },

    async create(input: CreateObjectInput): Promise<DataResult<DataObject>> {
      const now = new Date().toISOString()
      const objectData = {
        ...input,
        properties: input.properties || {},
        is_template: input.is_template ?? false,
        is_deleted: input.is_deleted ?? false,
        created_at: now,
        updated_at: now,
      }

      const { data, error } = await supabase
        .from('objects')
        .insert(objectData)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as DataObject, error: null }
    },

    async update(id: string, input: UpdateObjectInput): Promise<DataResult<DataObject>> {
      const { data, error } = await supabase
        .from('objects')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as DataObject, error: null }
    },

    async delete(id: string, permanent = false): Promise<DataResult<void>> {
      if (permanent) {
        const { error } = await supabase
          .from('objects')
          .delete()
          .eq('id', id)

        if (error) {
          return { data: null, error: { message: error.message, code: error.code } }
        }
      } else {
        const { error } = await supabase
          .from('objects')
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (error) {
          return { data: null, error: { message: error.message, code: error.code } }
        }
      }

      return { data: null, error: null }
    },

    async restore(id: string): Promise<DataResult<DataObject>> {
      const { data, error } = await supabase
        .from('objects')
        .update({
          is_deleted: false,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as DataObject, error: null }
    },

    async search(query: string): Promise<DataListResult<DataObject>> {
      const { data, error } = await supabase
        .from('objects')
        .select('*')
        .ilike('title', `%${query}%`)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as DataObject[], error: null }
    },
  }
}

export function createSupabaseDataClient(supabase: SupabaseClient): DataClient {
  return {
    objects: createObjectsClient(supabase),
    isLocal: false,
  }
}
