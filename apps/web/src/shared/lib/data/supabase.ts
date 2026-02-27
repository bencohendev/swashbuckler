import type { SupabaseClient } from '@supabase/supabase-js'
import { extractTextFromContent } from '@/features/search/lib/extractText'
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
  SavedViewsClient,
  Pin,
  SavedView,
  Tag,
  ObjectTag,
  Space,
  DataObject,
  DataObjectSummary,
  ObjectType,
  ObjectRelation,
  Template,
  SpaceShare,
  ShareExclusion,
  SharedSpace,
  CreateObjectInput,
  UpdateObjectInput,
  CreateObjectTypeInput,
  UpdateObjectTypeInput,
  CreateObjectRelationInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateShareExclusionInput,
  CreateTagInput,
  UpdateTagInput,
  CreateSavedViewInput,
  UpdateSavedViewInput,
  SpaceSharePermission,
  ListObjectsOptions,
  ListObjectTypesOptions,
  ListSpacesOptions,
  ListRelationsOptions,
  ListAllRelationsOptions,
  ListTemplatesOptions,
  SearchOptions,
  DataResult,
  DataListResult,
} from './types'

const OBJECT_SUMMARY_COLUMNS = 'id, title, type_id, owner_id, space_id, parent_id, icon, cover_image, properties, sort_order, is_deleted, deleted_at, is_archived, archived_at, created_at, updated_at'

async function resolveUserId(supabase: SupabaseClient, userId?: string): Promise<string | null> {
  if (userId) return userId
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

function createObjectTypesClient(supabase: SupabaseClient, spaceId?: string, userId?: string): ObjectTypesClient {
  return {
    async list(options: ListObjectTypesOptions = {}): Promise<DataListResult<ObjectType>> {
      let query = supabase
        .from('object_types')
        .select('*')
        .order('sort_order', { ascending: true })

      if (spaceId) {
        query = query.eq('space_id', spaceId)
      } else {
        // No space selected — return empty
        return { data: [], error: null }
      }

      if (options.isArchived !== undefined) {
        query = query.eq('is_archived', options.isArchived)
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
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) {
        return { data: null, error: { message: 'Must be logged in to create types' } }
      }

      const now = new Date().toISOString()
      const typeData = {
        ...input,
        fields: input.fields ?? [],
        owner_id: resolvedUserId,
        space_id: spaceId ?? null,
        created_at: now,
        updated_at: now,
      }

      const { data, error } = await supabase
        .from('object_types')
        .insert(typeData)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          const { data: archived } = await supabase
            .from('object_types')
            .select('id')
            .ilike('slug', input.slug)
            .eq('space_id', spaceId ?? '')
            .eq('is_archived', true)
            .limit(1)
          const msg = archived && archived.length > 0
            ? 'A type with this slug already exists in this space. An archived type is using this name — unarchive or delete it first.'
            : 'A type with this slug already exists in this space'
          return { data: null, error: { message: msg, code: 'DUPLICATE' } }
        }
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
        if (error.code === '23505' && input.slug) {
          const { data: archived } = await supabase
            .from('object_types')
            .select('id')
            .ilike('slug', input.slug)
            .eq('space_id', spaceId ?? '')
            .eq('is_archived', true)
            .neq('id', id)
            .limit(1)
          const msg = archived && archived.length > 0
            ? 'A type with this slug already exists in this space. An archived type is using this name — unarchive or delete it first.'
            : 'A type with this slug already exists in this space'
          return { data: null, error: { message: msg, code: 'DUPLICATE' } }
        }
        if (error.code === '23505') {
          return { data: null, error: { message: 'A type with this slug already exists in this space', code: 'DUPLICATE' } }
        }
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as ObjectType, error: null }
    },

    async delete(id: string): Promise<DataResult<void>> {
      const { data, error } = await supabase
        .from('object_types')
        .delete()
        .eq('id', id)
        .select('id')

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      if (!data || data.length === 0) {
        return { data: null, error: { message: 'Type not found or could not be deleted', code: 'NOT_FOUND' } }
      }

      return { data: null, error: null }
    },

    async archive(id: string): Promise<DataResult<ObjectType>> {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('object_types')
        .update({ is_archived: true, archived_at: now, updated_at: now })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as ObjectType, error: null }
    },

    async unarchive(id: string): Promise<DataResult<ObjectType>> {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('object_types')
        .update({ is_archived: false, archived_at: null, updated_at: now })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as ObjectType, error: null }
    },
  }
}

function createGlobalObjectTypesClient(supabase: SupabaseClient, userId?: string): GlobalObjectTypesClient {
  return {
    async list(): Promise<DataListResult<ObjectType>> {
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) {
        return { data: [], error: { message: 'Not authenticated' } }
      }

      const { data, error } = await supabase
        .from('object_types')
        .select('*')
        .eq('owner_id', resolvedUserId)
        .is('space_id', null)
        .order('sort_order', { ascending: true })

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
        .is('space_id', null)
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as ObjectType, error: null }
    },

    async create(input: CreateObjectTypeInput): Promise<DataResult<ObjectType>> {
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) {
        return { data: null, error: { message: 'Must be logged in to create global types' } }
      }

      const now = new Date().toISOString()
      const typeData = {
        ...input,
        fields: input.fields ?? [],
        owner_id: resolvedUserId,
        space_id: null,
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
        .is('space_id', null)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as ObjectType, error: null }
    },

    async delete(id: string): Promise<DataResult<void>> {
      const { data, error } = await supabase
        .from('object_types')
        .delete()
        .eq('id', id)
        .is('space_id', null)
        .select('id')

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      if (!data || data.length === 0) {
        return { data: null, error: { message: 'Global type not found or could not be deleted', code: 'NOT_FOUND' } }
      }

      return { data: null, error: null }
    },

    async importToSpace(id: string, targetSpaceId: string): Promise<DataResult<ObjectType>> {
      // Fetch the global type
      const { data: globalType, error: fetchError } = await supabase
        .from('object_types')
        .select('*')
        .eq('id', id)
        .is('space_id', null)
        .single()

      if (fetchError || !globalType) {
        return { data: null, error: { message: fetchError?.message ?? 'Global type not found', code: 'NOT_FOUND' } }
      }

      // Check for slug conflict in target space
      const { data: existing } = await supabase
        .from('object_types')
        .select('id')
        .eq('space_id', targetSpaceId)
        .eq('slug', globalType.slug)
        .maybeSingle()

      if (existing) {
        return { data: null, error: { message: `A type with slug "${globalType.slug}" already exists in this space`, code: 'DUPLICATE' } }
      }

      // Copy with new field UUIDs
      const now = new Date().toISOString()
      const newFields = (globalType.fields ?? []).map((field: Record<string, unknown>) => ({
        ...field,
        id: crypto.randomUUID(),
      }))

      const { data: newType, error: insertError } = await supabase
        .from('object_types')
        .insert({
          name: globalType.name,
          plural_name: globalType.plural_name,
          slug: globalType.slug,
          icon: globalType.icon,
          color: globalType.color,
          fields: newFields,
          owner_id: globalType.owner_id,
          space_id: targetSpaceId,
          sort_order: globalType.sort_order,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (insertError) {
        return { data: null, error: { message: insertError.message, code: insertError.code } }
      }

      return { data: newType as ObjectType, error: null }
    },
  }
}

function createObjectsClient(supabase: SupabaseClient, spaceId?: string, userId?: string): ObjectsClient {
  return {
    async list(options: ListObjectsOptions = {}): Promise<DataListResult<DataObjectSummary>> {
      let query = supabase
        .from('objects')
        .select(OBJECT_SUMMARY_COLUMNS)
        .order('sort_order', { ascending: true })
        .order('updated_at', { ascending: false })

      if (spaceId) {
        query = query.eq('space_id', spaceId)
      }

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

      if (options.isArchived !== undefined) {
        query = query.eq('is_archived', options.isArchived)
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

      return { data: data as DataObjectSummary[], error: null }
    },

    async listContent(options: ListObjectsOptions = {}): Promise<DataListResult<{ id: string; content: unknown }>> {
      let query = supabase
        .from('objects')
        .select('id, content')
        .order('updated_at', { ascending: false })

      if (spaceId) {
        query = query.eq('space_id', spaceId)
      }

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

      if (options.isArchived !== undefined) {
        query = query.eq('is_archived', options.isArchived)
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

      return { data: data as { id: string; content: unknown }[], error: null }
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
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) {
        return { data: null, error: { message: 'Must be logged in to create objects' } }
      }
      if (!spaceId) {
        return { data: null, error: { message: 'No space selected' } }
      }

      const now = new Date().toISOString()
      const objectData = {
        ...input,
        properties: input.properties || {},
        is_deleted: input.is_deleted ?? false,
        owner_id: resolvedUserId,
        space_id: spaceId,
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

    async archive(id: string): Promise<DataResult<DataObject>> {
      // Fail if already deleted
      const { data: existing, error: getError } = await supabase
        .from('objects')
        .select('is_deleted')
        .eq('id', id)
        .single()

      if (getError) {
        return { data: null, error: { message: getError.message, code: getError.code } }
      }

      if (existing?.is_deleted) {
        return { data: null, error: { message: 'Cannot archive a deleted item', code: 'CONFLICT' } }
      }

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('objects')
        .update({ is_archived: true, archived_at: now, updated_at: now })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as DataObject, error: null }
    },

    async unarchive(id: string): Promise<DataResult<DataObject>> {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('objects')
        .update({ is_archived: false, archived_at: null, updated_at: now })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as DataObject, error: null }
    },

    async purgeExpired(): Promise<DataResult<number>> {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('objects')
        .delete()
        .eq('is_deleted', true)
        .lt('deleted_at', thirtyDaysAgo)
        .select('id')

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data?.length ?? 0, error: null }
    },

    async search(query: string, options?: SearchOptions): Promise<DataListResult<DataObject>> {
      const MAX_RESULTS = 50

      // Pass 1: Server-side title search using GIN trigram index
      let titleQuery = supabase
        .from('objects')
        .select('*')
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .ilike('title', `%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(MAX_RESULTS)

      if (spaceId) {
        titleQuery = titleQuery.eq('space_id', spaceId)
      }

      if (options?.typeIds && options.typeIds.length > 0) {
        titleQuery = titleQuery.in('type_id', options.typeIds)
      }

      const { data: titleHits, error: titleError } = await titleQuery

      if (titleError) {
        return { data: [], error: { message: titleError.message, code: titleError.code } }
      }

      const titleResults = (titleHits ?? []) as DataObject[]

      // If title search filled the quota, skip expensive content search
      if (titleResults.length >= MAX_RESULTS) {
        return { data: titleResults, error: null }
      }

      // Pass 2: Content search on remaining capacity
      let contentQuery = supabase
        .from('objects')
        .select('*')
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(200)

      if (spaceId) {
        contentQuery = contentQuery.eq('space_id', spaceId)
      }

      if (options?.typeIds && options.typeIds.length > 0) {
        contentQuery = contentQuery.in('type_id', options.typeIds)
      }

      const { data: contentCandidates, error: contentError } = await contentQuery

      if (contentError) {
        // Return title results even if content search fails
        return { data: titleResults, error: null }
      }

      const titleMatchIds = new Set(titleResults.map(o => o.id))
      const lowerQuery = query.toLowerCase()
      const remaining = MAX_RESULTS - titleResults.length

      const contentMatches = (contentCandidates ?? [])
        .filter((obj: DataObject) => {
          if (titleMatchIds.has(obj.id)) return false
          const contentText = extractTextFromContent(obj.content)
          return contentText.toLowerCase().includes(lowerQuery)
        })
        .slice(0, remaining) as DataObject[]

      return { data: [...titleResults, ...contentMatches], error: null }
    },

    async batchGetSummary(ids: string[]): Promise<DataListResult<Pick<DataObject, 'id' | 'title' | 'icon' | 'type_id'>>> {
      if (ids.length === 0) return { data: [], error: null }

      const { data, error } = await supabase
        .from('objects')
        .select('id, title, icon, type_id')
        .in('id', ids)

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as Pick<DataObject, 'id' | 'title' | 'icon' | 'type_id'>[], error: null }
    },
  }
}

function createTemplatesClient(supabase: SupabaseClient, spaceId?: string, userId?: string): TemplatesClient {
  return {
    async list(options: ListTemplatesOptions = {}): Promise<DataListResult<Template>> {
      let query = supabase
        .from('templates')
        .select('*')
        .order('updated_at', { ascending: false })

      if (spaceId) {
        query = query.eq('space_id', spaceId)
      }

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
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) {
        return { data: null, error: { message: 'Must be logged in to create templates' } }
      }
      if (!spaceId) {
        return { data: null, error: { message: 'No space selected' } }
      }

      const now = new Date().toISOString()
      const templateData = {
        ...input,
        properties: input.properties || {},
        owner_id: resolvedUserId,
        space_id: spaceId,
        created_at: now,
        updated_at: now,
      }

      const { data, error } = await supabase
        .from('templates')
        .insert(templateData)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return { data: null, error: { message: 'A template with this name already exists for this type', code: 'DUPLICATE' } }
        }
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
        if (error.code === '23505') {
          return { data: null, error: { message: 'A template with this name already exists for this type', code: 'DUPLICATE' } }
        }
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

function createRelationsClient(supabase: SupabaseClient, spaceId?: string): RelationsClient {
  return {
    async listAll(options: ListAllRelationsOptions = {}): Promise<DataListResult<ObjectRelation>> {
      // N3 fix: Use inner joins via Supabase foreign key relationships
      // to fetch only relations where both source and target are non-deleted
      // objects in the current space, in a single query.
      let query = supabase
        .from('object_relations')
        .select('id, source_id, target_id, relation_type, source_property, context, created_at, source:objects!object_relations_source_id_fkey!inner(id), target:objects!object_relations_target_id_fkey!inner(id)')
        .order('created_at', { ascending: false })

      if (spaceId) {
        query = query
          .eq('source.space_id' as string, spaceId)
          .eq('source.is_deleted' as string, false)
          .eq('target.space_id' as string, spaceId)
          .eq('target.is_deleted' as string, false)
      } else {
        query = query
          .eq('source.is_deleted' as string, false)
          .eq('target.is_deleted' as string, false)
      }

      if (options.relationType) {
        query = query.eq('relation_type', options.relationType)
      }

      const { data, error } = await query

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      // Map to ObjectRelation shape (strip the joined objects)
      const relations: ObjectRelation[] = (data ?? []).map((r) => ({
        id: r.id,
        source_id: r.source_id,
        target_id: r.target_id,
        relation_type: r.relation_type,
        source_property: r.source_property,
        context: r.context,
        created_at: r.created_at,
      }))

      return { data: relations, error: null }
    },

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

function createSpacesClient(supabase: SupabaseClient, userId?: string): SpacesClient {
  return {
    async list(options: ListSpacesOptions = {}): Promise<DataListResult<Space>> {
      let query = supabase
        .from('spaces')
        .select('*')
        .order('created_at', { ascending: true })

      if (options.isArchived !== undefined) {
        query = query.eq('is_archived', options.isArchived)
      }

      const { data, error } = await query

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as Space[], error: null }
    },

    async get(id: string): Promise<DataResult<Space>> {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as Space, error: null }
    },

    async create(input: { name: string; icon?: string }): Promise<DataResult<Space>> {
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) {
        return { data: null, error: { message: 'Must be logged in to create spaces' } }
      }

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('spaces')
        .insert({
          name: input.name,
          icon: input.icon ?? '📁',
          owner_id: resolvedUserId,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          const { data: archived } = await supabase
            .from('spaces')
            .select('id')
            .ilike('name', input.name)
            .eq('owner_id', resolvedUserId)
            .eq('is_archived', true)
            .limit(1)
          const msg = archived && archived.length > 0
            ? 'A space with this name already exists. An archived space is using this name — unarchive or delete it first.'
            : 'A space with this name already exists'
          return { data: null, error: { message: msg, code: 'DUPLICATE' } }
        }
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as Space, error: null }
    },

    async update(id: string, input: { name?: string; icon?: string }): Promise<DataResult<Space>> {
      const { data, error } = await supabase
        .from('spaces')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === '23505' && input.name) {
          const { data: archived } = await supabase
            .from('spaces')
            .select('id')
            .ilike('name', input.name)
            .eq('is_archived', true)
            .neq('id', id)
            .limit(1)
          const msg = archived && archived.length > 0
            ? 'A space with this name already exists. An archived space is using this name — unarchive or delete it first.'
            : 'A space with this name already exists'
          return { data: null, error: { message: msg, code: 'DUPLICATE' } }
        }
        if (error.code === '23505') {
          return { data: null, error: { message: 'A space with this name already exists', code: 'DUPLICATE' } }
        }
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as Space, error: null }
    },

    async delete(id: string): Promise<DataResult<void>> {
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', id)

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: null, error: null }
    },

    async archive(id: string): Promise<DataResult<Space>> {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('spaces')
        .update({ is_archived: true, archived_at: now, updated_at: now })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as Space, error: null }
    },

    async unarchive(id: string): Promise<DataResult<Space>> {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('spaces')
        .update({ is_archived: false, archived_at: null, updated_at: now })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as Space, error: null }
    },
  }
}

function createSharingClient(supabase: SupabaseClient, userId?: string): SharingClient {
  return {
    async listShares(spaceId: string): Promise<DataListResult<SpaceShare>> {
      const { data, error } = await supabase
        .from('space_shares')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: true })

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as SpaceShare[], error: null }
    },

    async getShare(id: string): Promise<DataResult<SpaceShare>> {
      const { data, error } = await supabase
        .from('space_shares')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as SpaceShare, error: null }
    },

    async createShare(input: { space_id: string; shared_with_email: string; permission: SpaceSharePermission }): Promise<DataResult<SpaceShare>> {
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) {
        return { data: null, error: { message: 'Must be logged in to share spaces' } }
      }

      // Look up the target user by email
      const { data: targetUsers, error: lookupError } = await supabase
        .rpc('find_user_by_email', { p_email: input.shared_with_email })

      if (lookupError) {
        return { data: null, error: { message: lookupError.message, code: lookupError.code } }
      }

      if (!targetUsers || targetUsers.length === 0) {
        return { data: null, error: { message: 'User not found with that email', code: 'NOT_FOUND' } }
      }

      const targetUser = targetUsers[0]

      if (targetUser.id === resolvedUserId) {
        return { data: null, error: { message: 'Cannot share a space with yourself' } }
      }

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('space_shares')
        .insert({
          space_id: input.space_id,
          owner_id: resolvedUserId,
          shared_with_id: targetUser.id,
          shared_with_email: input.shared_with_email,
          permission: input.permission,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return { data: null, error: { message: 'Space is already shared with this user', code: 'DUPLICATE' } }
        }
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as SpaceShare, error: null }
    },

    async updateShare(id: string, input: { permission: SpaceSharePermission }): Promise<DataResult<SpaceShare>> {
      const { data, error } = await supabase
        .from('space_shares')
        .update({ permission: input.permission, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as SpaceShare, error: null }
    },

    async deleteShare(id: string): Promise<DataResult<void>> {
      const { error } = await supabase
        .from('space_shares')
        .delete()
        .eq('id', id)

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: null, error: null }
    },

    async listExclusions(shareId: string): Promise<DataListResult<ShareExclusion>> {
      const { data, error } = await supabase
        .from('share_exclusions')
        .select('*')
        .eq('space_share_id', shareId)
        .order('created_at', { ascending: true })

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as ShareExclusion[], error: null }
    },

    async addExclusion(shareId: string, input: CreateShareExclusionInput): Promise<DataResult<ShareExclusion>> {
      const exclusionData = {
        space_share_id: shareId,
        excluded_type_id: 'excluded_type_id' in input ? input.excluded_type_id : null,
        excluded_object_id: 'excluded_object_id' in input ? input.excluded_object_id : null,
        excluded_field: 'excluded_field' in input ? input.excluded_field : null,
      }

      const { data, error } = await supabase
        .from('share_exclusions')
        .insert(exclusionData)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as ShareExclusion, error: null }
    },

    async removeExclusion(id: string): Promise<DataResult<void>> {
      const { error } = await supabase
        .from('share_exclusions')
        .delete()
        .eq('id', id)

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: null, error: null }
    },

    async listSpaceExclusions(spaceId: string): Promise<DataListResult<ShareExclusion>> {
      const { data, error } = await supabase
        .from('share_exclusions')
        .select('*')
        .eq('space_id', spaceId)
        .is('space_share_id', null)
        .order('created_at', { ascending: true })

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as ShareExclusion[], error: null }
    },

    async addSpaceExclusion(spaceId: string, input: CreateShareExclusionInput): Promise<DataResult<ShareExclusion>> {
      const exclusionData = {
        space_id: spaceId,
        space_share_id: null,
        excluded_type_id: 'excluded_type_id' in input ? input.excluded_type_id : null,
        excluded_object_id: 'excluded_object_id' in input ? input.excluded_object_id : null,
        excluded_field: 'excluded_field' in input ? input.excluded_field : null,
      }

      const { data, error } = await supabase
        .from('share_exclusions')
        .insert(exclusionData)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as ShareExclusion, error: null }
    },

    async findUserByEmail(email: string): Promise<DataResult<{ id: string; email: string }>> {
      const { data, error } = await supabase
        .rpc('find_user_by_email', { p_email: email })

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      if (!data || data.length === 0) {
        return { data: null, error: { message: 'User not found', code: 'NOT_FOUND' } }
      }

      return { data: data[0], error: null }
    },

    async getSharedSpaces(): Promise<DataListResult<SharedSpace>> {
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) {
        return { data: [], error: { message: 'Not authenticated' } }
      }

      // N6 fix: Single JOIN query instead of two-query waterfall
      const { data, error } = await supabase
        .from('space_shares')
        .select('id, permission, spaces(*)')
        .eq('shared_with_id', resolvedUserId)

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      if (!data || data.length === 0) {
        return { data: [], error: null }
      }

      const sharedSpaces: SharedSpace[] = data
        .filter((row) => row.spaces)
        .map((row) => {
          // Supabase returns joined to-one relations as an object (not array)
          const space = row.spaces as unknown as Space
          return {
            ...space,
            share_id: row.id,
            permission: (row.permission ?? 'view') as SpaceSharePermission,
          }
        })

      return { data: sharedSpaces, error: null }
    },
  }
}

function createTagsClient(supabase: SupabaseClient, spaceId?: string): TagsClient {
  return {
    async list(): Promise<DataListResult<Tag>> {
      if (!spaceId) return { data: [], error: null }

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('space_id', spaceId)
        .order('name', { ascending: true })

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as Tag[], error: null }
    },

    async get(id: string): Promise<DataResult<Tag>> {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as Tag, error: null }
    },

    async create(input: CreateTagInput): Promise<DataResult<Tag>> {
      if (!spaceId) {
        return { data: null, error: { message: 'No space selected' } }
      }

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('tags')
        .insert({
          space_id: spaceId,
          name: input.name,
          color: input.color ?? null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return { data: null, error: { message: 'A tag with this name already exists', code: 'DUPLICATE' } }
        }
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as Tag, error: null }
    },

    async update(id: string, input: UpdateTagInput): Promise<DataResult<Tag>> {
      const { data, error } = await supabase
        .from('tags')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return { data: null, error: { message: 'A tag with this name already exists', code: 'DUPLICATE' } }
        }
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as Tag, error: null }
    },

    async delete(id: string): Promise<DataResult<void>> {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: null, error: null }
    },

    async getObjectTags(objectId: string): Promise<DataListResult<Tag>> {
      const { data, error } = await supabase
        .from('object_tags')
        .select('tag_id, tags(*)')
        .eq('object_id', objectId)

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      const tags = (data ?? []).map((row: Record<string, unknown>) => row.tags as Tag)
      return { data: tags, error: null }
    },

    async getObjectTagsBatch(objectIds: string[]): Promise<DataListResult<{ object_id: string; tags: Tag[] }>> {
      if (objectIds.length === 0) return { data: [], error: null }

      const { data, error } = await supabase
        .from('object_tags')
        .select('object_id, tag_id, tags(*)')
        .in('object_id', objectIds)

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      const grouped = new Map<string, Tag[]>()
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        const objectId = row.object_id as string
        const tag = row.tags as Tag
        const existing = grouped.get(objectId)
        if (existing) {
          existing.push(tag)
        } else {
          grouped.set(objectId, [tag])
        }
      }

      const result = objectIds.map(id => ({
        object_id: id,
        tags: grouped.get(id) ?? [],
      }))

      return { data: result, error: null }
    },

    async addTagToObject(objectId: string, tagId: string): Promise<DataResult<ObjectTag>> {
      const { data, error } = await supabase
        .from('object_tags')
        .upsert({ object_id: objectId, tag_id: tagId }, { onConflict: 'object_id,tag_id' })
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as ObjectTag, error: null }
    },

    async removeTagFromObject(objectId: string, tagId: string): Promise<DataResult<void>> {
      const { error } = await supabase
        .from('object_tags')
        .delete()
        .eq('object_id', objectId)
        .eq('tag_id', tagId)

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: null, error: null }
    },

    async getObjectsByTag(tagId: string): Promise<DataListResult<DataObjectSummary>> {
      const { data, error } = await supabase
        .from('objects')
        .select(`${OBJECT_SUMMARY_COLUMNS}, object_tags!inner(tag_id)`)
        .eq('object_tags.tag_id', tagId)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      // Strip the joined object_tags from results
      const results = (data ?? []).map(({ object_tags: _joined, ...rest }: Record<string, unknown>) => {
        void _joined
        return rest
      }) as DataObjectSummary[]
      return { data: results, error: null }
    },

    async countObjectsByTag(tagId: string): Promise<DataResult<number>> {
      const { count, error } = await supabase
        .from('object_tags')
        .select('id, objects!inner(id)', { count: 'exact', head: true })
        .eq('tag_id', tagId)
        .eq('objects.is_deleted', false)

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: count ?? 0, error: null }
    },

    async countObjectsByTags(tagIds: string[]): Promise<DataResult<Map<string, number>>> {
      if (tagIds.length === 0) {
        return { data: new Map(), error: null }
      }

      // Single query: fetch all object_tags for the given tags, joined with
      // non-deleted objects, then group client-side
      const { data, error } = await supabase
        .from('object_tags')
        .select('tag_id, objects!inner(id)')
        .in('tag_id', tagIds)
        .eq('objects.is_deleted' as string, false)

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      const counts = new Map<string, number>()
      for (const row of data ?? []) {
        counts.set(row.tag_id, (counts.get(row.tag_id) ?? 0) + 1)
      }
      return { data: counts, error: null }
    },
  }
}

function createPinsClient(supabase: SupabaseClient, userId?: string): PinsClient {
  return {
    async list(): Promise<DataListResult<Pin>> {
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) {
        return { data: [], error: { message: 'Not authenticated' } }
      }

      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('user_id', resolvedUserId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as Pin[], error: null }
    },

    async pin(objectId: string): Promise<DataResult<Pin>> {
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) {
        return { data: null, error: { message: 'Not authenticated' } }
      }

      const { data, error } = await supabase
        .from('pins')
        .upsert({ user_id: resolvedUserId, object_id: objectId }, { onConflict: 'user_id,object_id' })
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as Pin, error: null }
    },

    async unpin(objectId: string): Promise<DataResult<void>> {
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) {
        return { data: null, error: { message: 'Not authenticated' } }
      }

      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('user_id', resolvedUserId)
        .eq('object_id', objectId)

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: null, error: null }
    },

    async isPinned(objectId: string): Promise<boolean> {
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) return false

      const { data } = await supabase
        .from('pins')
        .select('id')
        .eq('user_id', resolvedUserId)
        .eq('object_id', objectId)
        .maybeSingle()

      return !!data
    },
  }
}

function createSavedViewsClient(supabase: SupabaseClient, spaceId?: string, userId?: string): SavedViewsClient {
  return {
    async list(typeId: string): Promise<DataListResult<SavedView>> {
      const { data, error } = await supabase
        .from('saved_views')
        .select('*')
        .eq('type_id', typeId)
        .order('created_at')

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      return { data: data as SavedView[], error: null }
    },

    async create(input: CreateSavedViewInput): Promise<DataResult<SavedView>> {
      const resolvedUserId = await resolveUserId(supabase, userId)
      if (!resolvedUserId) {
        return { data: null, error: { message: 'Not authenticated' } }
      }

      // If setting as default, unset existing default for this type first
      if (input.is_default) {
        await supabase
          .from('saved_views')
          .update({ is_default: false })
          .eq('type_id', input.type_id)
          .eq('owner_id', resolvedUserId)
          .eq('is_default', true)
      }

      const { data, error } = await supabase
        .from('saved_views')
        .insert({
          ...input,
          space_id: spaceId,
          owner_id: resolvedUserId,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as SavedView, error: null }
    },

    async update(id: string, input: UpdateSavedViewInput): Promise<DataResult<SavedView>> {
      // If setting as default, unset existing default for this type first
      if (input.is_default) {
        const resolvedUserId = await resolveUserId(supabase, userId)
        if (resolvedUserId) {
          // Get the view to find its type_id
          const { data: existing } = await supabase
            .from('saved_views')
            .select('type_id')
            .eq('id', id)
            .single()

          if (existing) {
            await supabase
              .from('saved_views')
              .update({ is_default: false })
              .eq('type_id', existing.type_id)
              .eq('owner_id', resolvedUserId)
              .eq('is_default', true)
          }
        }
      }

      const { data, error } = await supabase
        .from('saved_views')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as SavedView, error: null }
    },

    async delete(id: string): Promise<DataResult<void>> {
      const { error } = await supabase
        .from('saved_views')
        .delete()
        .eq('id', id)

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: null, error: null }
    },
  }
}

export function createSupabaseDataClient(supabase: SupabaseClient, spaceId?: string, userId?: string): DataClient {
  return {
    objects: createObjectsClient(supabase, spaceId, userId),
    objectTypes: createObjectTypesClient(supabase, spaceId, userId),
    globalObjectTypes: createGlobalObjectTypesClient(supabase, userId),
    templates: createTemplatesClient(supabase, spaceId, userId),
    relations: createRelationsClient(supabase, spaceId),
    spaces: createSpacesClient(supabase, userId),
    sharing: createSharingClient(supabase, userId),
    tags: createTagsClient(supabase, spaceId),
    pins: createPinsClient(supabase, userId),
    savedViews: createSavedViewsClient(supabase, spaceId, userId),
    isLocal: false,
  }
}
