import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  DataClient,
  ObjectsClient,
  ObjectTypesClient,
  TemplatesClient,
  RelationsClient,
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
  ListTemplatesOptions,
  DataResult,
  DataListResult,
} from './types'

function createObjectTypesClient(supabase: SupabaseClient): ObjectTypesClient {
  return {
    async list(): Promise<DataListResult<ObjectType>> {
      const { data: { user } } = await supabase.auth.getUser()

      let query = supabase
        .from('object_types')
        .select('*')
        .order('sort_order', { ascending: true })

      if (user) {
        query = query.or(`is_built_in.eq.true,owner_id.eq.${user.id}`)
      } else {
        query = query.eq('is_built_in', true)
      }

      const { data, error } = await query

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as ObjectType[], error: null }
    },

    async get(id: string): Promise<DataResult<ObjectType>> {
      const { data, error } = await supabase
        .from('object_types')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as ObjectType, error: null }
    },

    async create(input: CreateObjectTypeInput): Promise<DataResult<ObjectType>> {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: { message: 'Must be logged in to create types' } }
      }

      const now = new Date().toISOString()
      const typeData = {
        ...input,
        fields: input.fields ?? [],
        is_built_in: false,
        owner_id: user.id,
        created_at: now,
        updated_at: now,
      }

      const { data, error } = await supabase
        .from('object_types')
        .insert(typeData)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as ObjectType, error: null }
    },

    async update(id: string, input: UpdateObjectTypeInput): Promise<DataResult<ObjectType>> {
      const { data, error } = await supabase
        .from('object_types')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as ObjectType, error: null }
    },

    async delete(id: string): Promise<DataResult<void>> {
      const { error } = await supabase
        .from('object_types')
        .delete()
        .eq('id', id)

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: null, error: null }
    },
  }
}

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

      if (options.typeId) {
        query = query.eq('type_id', options.typeId)
      }

      if (options.isDeleted !== undefined) {
        query = query.eq('is_deleted', options.isDeleted)
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: { message: 'Must be logged in to create objects' } }
      }

      const now = new Date().toISOString()
      const objectData = {
        ...input,
        properties: input.properties || {},
        is_deleted: input.is_deleted ?? false,
        owner_id: user.id,
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

function createTemplatesClient(supabase: SupabaseClient): TemplatesClient {
  return {
    async list(options: ListTemplatesOptions = {}): Promise<DataListResult<Template>> {
      let query = supabase
        .from('templates')
        .select('*')
        .order('updated_at', { ascending: false })

      if (options.typeId) {
        query = query.eq('type_id', options.typeId)
      }

      const { data, error } = await query

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as Template[], error: null }
    },

    async get(id: string): Promise<DataResult<Template>> {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as Template, error: null }
    },

    async create(input: CreateTemplateInput): Promise<DataResult<Template>> {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: { message: 'Must be logged in to create templates' } }
      }

      const now = new Date().toISOString()
      const templateData = {
        ...input,
        properties: input.properties || {},
        owner_id: user.id,
        created_at: now,
        updated_at: now,
      }

      const { data, error } = await supabase
        .from('templates')
        .insert(templateData)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as Template, error: null }
    },

    async update(id: string, input: UpdateTemplateInput): Promise<DataResult<Template>> {
      const { data, error } = await supabase
        .from('templates')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as Template, error: null }
    },

    async delete(id: string): Promise<DataResult<void>> {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id)

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: null, error: null }
    },
  }
}

function createRelationsClient(supabase: SupabaseClient): RelationsClient {
  return {
    async list(options: ListRelationsOptions): Promise<DataListResult<ObjectRelation>> {
      let query = supabase
        .from('object_relations')
        .select('*')
        .or(`source_id.eq.${options.objectId},target_id.eq.${options.objectId}`)
        .order('created_at', { ascending: false })

      if (options.relationType) {
        query = query.eq('relation_type', options.relationType)
      }

      const { data, error } = await query

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as ObjectRelation[], error: null }
    },

    async create(input: CreateObjectRelationInput): Promise<DataResult<ObjectRelation>> {
      if (input.source_id === input.target_id) {
        return { data: null, error: { message: 'Cannot create self-referencing relation' } }
      }

      const relationData = {
        source_id: input.source_id,
        target_id: input.target_id,
        relation_type: input.relation_type ?? 'link',
        source_property: input.source_property ?? null,
        context: input.context ?? null,
      }

      const { data, error } = await supabase
        .from('object_relations')
        .upsert(relationData, { onConflict: 'source_id,target_id,relation_type,source_property' })
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as ObjectRelation, error: null }
    },

    async delete(id: string): Promise<DataResult<void>> {
      const { error } = await supabase
        .from('object_relations')
        .delete()
        .eq('id', id)

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: null, error: null }
    },

    async deleteBySourceAndTarget(sourceId: string, targetId: string, relationType?: string): Promise<DataResult<void>> {
      let query = supabase
        .from('object_relations')
        .delete()
        .eq('source_id', sourceId)
        .eq('target_id', targetId)

      if (relationType) {
        query = query.eq('relation_type', relationType)
      }

      const { error } = await query

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: null, error: null }
    },

    async syncMentions(sourceId: string, mentionTargetIds: string[]): Promise<DataResult<void>> {
      // Fetch existing mention relations for this source
      const { data: existing, error: fetchError } = await supabase
        .from('object_relations')
        .select('*')
        .eq('source_id', sourceId)
        .eq('relation_type', 'mention')

      if (fetchError) {
        return { data: null, error: { message: fetchError.message, code: fetchError.code } }
      }

      const existingTargetIds = new Set((existing ?? []).map((r: ObjectRelation) => r.target_id))
      const desiredTargetIds = new Set(mentionTargetIds.filter(id => id !== sourceId))

      // Delete removed mentions
      const toDelete = (existing ?? []).filter((r: ObjectRelation) => !desiredTargetIds.has(r.target_id))
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('object_relations')
          .delete()
          .in('id', toDelete.map((r: ObjectRelation) => r.id))

        if (deleteError) {
          return { data: null, error: { message: deleteError.message, code: deleteError.code } }
        }
      }

      // Add new mentions
      const toAdd = [...desiredTargetIds]
        .filter(id => !existingTargetIds.has(id))
        .map(targetId => ({
          source_id: sourceId,
          target_id: targetId,
          relation_type: 'mention',
          source_property: null,
          context: null,
        }))

      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('object_relations')
          .insert(toAdd)

        if (insertError) {
          return { data: null, error: { message: insertError.message, code: insertError.code } }
        }
      }

      return { data: null, error: null }
    },
  }
}

export function createSupabaseDataClient(supabase: SupabaseClient): DataClient {
  return {
    objects: createObjectsClient(supabase),
    objectTypes: createObjectTypesClient(supabase),
    templates: createTemplatesClient(supabase),
    relations: createRelationsClient(supabase),
    isLocal: false,
  }
}
