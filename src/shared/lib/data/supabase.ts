import type { SupabaseClient } from '@supabase/supabase-js'
import { extractTextFromContent } from '@/features/search/lib/extractText'
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
  SpaceSharePermission,
  ListObjectsOptions,
  ListRelationsOptions,
  ListAllRelationsOptions,
  ListTemplatesOptions,
  SearchOptions,
  DataResult,
  DataListResult,
} from './types'

function createObjectTypesClient(supabase: SupabaseClient, spaceId?: string): ObjectTypesClient {
  return {
    async list(): Promise<DataListResult<ObjectType>> {
      let query = supabase
        .from('object_types')
        .select('*')
        .order('sort_order', { ascending: true })

      if (spaceId) {
        // Return built-in types (space_id is null) plus space-specific types
        query = query.or(`is_built_in.eq.true,space_id.eq.${spaceId}`)
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

function createObjectsClient(supabase: SupabaseClient, spaceId?: string): ObjectsClient {
  return {
    async list(options: ListObjectsOptions = {}): Promise<DataListResult<DataObject>> {
      let query = supabase
        .from('objects')
        .select('*')
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
      if (!spaceId) {
        return { data: null, error: { message: 'No space selected' } }
      }

      const now = new Date().toISOString()
      const objectData = {
        ...input,
        properties: input.properties || {},
        is_deleted: input.is_deleted ?? false,
        owner_id: user.id,
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

    async search(query: string, options?: SearchOptions): Promise<DataListResult<DataObject>> {
      // Fetch recent non-deleted objects to search across title + content
      let searchQuery = supabase
        .from('objects')
        .select('*')
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .limit(200)

      if (spaceId) {
        searchQuery = searchQuery.eq('space_id', spaceId)
      }

      if (options?.typeIds && options.typeIds.length > 0) {
        searchQuery = searchQuery.in('type_id', options.typeIds)
      }

      const { data, error } = await searchQuery

      if (error) {
        return { data: [], error: { message: error.message, code: error.code } }
      }

      // Filter client-side for both title and content matches
      const lowerQuery = query.toLowerCase()
      const results = (data ?? []).filter((obj: DataObject) => {
        if (obj.title.toLowerCase().includes(lowerQuery)) return true
        const contentText = extractTextFromContent(obj.content)
        return contentText.toLowerCase().includes(lowerQuery)
      })

      return { data: results.slice(0, 50) as DataObject[], error: null }
    },
  }
}

function createTemplatesClient(supabase: SupabaseClient, spaceId?: string): TemplatesClient {
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: { message: 'Must be logged in to create templates' } }
      }
      if (!spaceId) {
        return { data: null, error: { message: 'No space selected' } }
      }

      const now = new Date().toISOString()
      const templateData = {
        ...input,
        properties: input.properties || {},
        owner_id: user.id,
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

function createRelationsClient(supabase: SupabaseClient, spaceId?: string): RelationsClient {
  return {
    async listAll(options: ListAllRelationsOptions = {}): Promise<DataListResult<ObjectRelation>> {
      // First get the set of non-deleted object IDs in the current space
      let objectsQuery = supabase
        .from('objects')
        .select('id')
        .eq('is_deleted', false)

      if (spaceId) {
        objectsQuery = objectsQuery.eq('space_id', spaceId)
      }

      const { data: objectRows, error: objectsError } = await objectsQuery

      if (objectsError) {
        return { data: [], error: { message: objectsError.message, code: objectsError.code } }
      }

      const objectIds = new Set((objectRows ?? []).map((r: { id: string }) => r.id))

      if (objectIds.size === 0) {
        return { data: [], error: null }
      }

      // Fetch all relations
      let relationsQuery = supabase
        .from('object_relations')
        .select('*')
        .order('created_at', { ascending: false })

      if (options.relationType) {
        relationsQuery = relationsQuery.eq('relation_type', options.relationType)
      }

      const { data: relations, error: relationsError } = await relationsQuery

      if (relationsError) {
        return { data: [], error: { message: relationsError.message, code: relationsError.code } }
      }

      // Filter to relations where both endpoints are in the space
      const filtered = (relations ?? []).filter(
        (r: ObjectRelation) => objectIds.has(r.source_id) && objectIds.has(r.target_id)
      )

      return { data: filtered, error: null }
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

function createSpacesClient(supabase: SupabaseClient): SpacesClient {
  return {
    async list(): Promise<DataListResult<Space>> {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .order('created_at', { ascending: true })

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: { message: 'Must be logged in to create spaces' } }
      }

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('spaces')
        .insert({
          name: input.name,
          icon: input.icon ?? '📁',
          owner_id: user.id,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) {
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
  }
}

function createSharingClient(supabase: SupabaseClient): SharingClient {
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
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

      if (targetUser.id === user.id) {
        return { data: null, error: { message: 'Cannot share a space with yourself' } }
      }

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('space_shares')
        .insert({
          space_id: input.space_id,
          owner_id: user.id,
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: [], error: { message: 'Not authenticated' } }
      }

      // Get shares where the current user is the recipient
      const { data: shares, error: sharesError } = await supabase
        .from('space_shares')
        .select('space_id, permission')
        .eq('shared_with_id', user.id)

      if (sharesError || !shares || shares.length === 0) {
        return { data: [], error: sharesError ? { message: sharesError.message, code: sharesError.code } : null }
      }

      // Fetch the actual space data separately
      const spaceIds = shares.map(s => s.space_id)
      const { data: spacesData, error: spacesError } = await supabase
        .from('spaces')
        .select('*')
        .in('id', spaceIds)

      if (spacesError || !spacesData) {
        return { data: [], error: spacesError ? { message: spacesError.message, code: spacesError.code } : null }
      }

      // Merge space data with permission
      const permissionBySpaceId = new Map(shares.map(s => [s.space_id, s.permission]))
      const sharedSpaces: SharedSpace[] = spacesData.map(space => ({
        ...space,
        permission: (permissionBySpaceId.get(space.id) ?? 'view') as SpaceSharePermission,
      }))

      return { data: sharedSpaces, error: null }
    },
  }
}

export function createSupabaseDataClient(supabase: SupabaseClient, spaceId?: string): DataClient {
  return {
    objects: createObjectsClient(supabase, spaceId),
    objectTypes: createObjectTypesClient(supabase, spaceId),
    templates: createTemplatesClient(supabase, spaceId),
    relations: createRelationsClient(supabase, spaceId),
    spaces: createSpacesClient(supabase),
    sharing: createSharingClient(supabase),
    isLocal: false,
  }
}
