import { z } from 'zod'

// Well-known built-in type IDs
export const BUILT_IN_TYPE_IDS = {
  page: '00000000-0000-0000-0000-000000000001',
  note: '00000000-0000-0000-0000-000000000002',
} as const

// --- Space schemas ---

export const spaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  icon: z.string(),
  owner_id: z.string().uuid(),
  is_archived: z.boolean(),
  archived_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Space = z.infer<typeof spaceSchema>

// --- Object Type schemas ---

export const fieldTypeEnum = z.enum([
  'text',
  'number',
  'date',
  'checkbox',
  'select',
  'multi_select',
  'url',
])

export type FieldType = z.infer<typeof fieldTypeEnum>

export const fieldDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: fieldTypeEnum,
  required: z.boolean().optional(),
  default_value: z.any().optional(),
  options: z.array(z.string()).optional(), // for select/multi_select
  sort_order: z.number().int(),
})

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>

export const objectTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  plural_name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  icon: z.string(),
  color: z.string().nullable(),
  fields: z.array(fieldDefinitionSchema),
  is_built_in: z.boolean(),
  owner_id: z.string().uuid().nullable(),
  space_id: z.string().uuid().nullable(),
  sort_order: z.number().int(),
  is_archived: z.boolean(),
  archived_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type ObjectType = z.infer<typeof objectTypeSchema>

export const createObjectTypeSchema = z.object({
  name: z.string().min(1).max(100),
  plural_name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  icon: z.string(),
  color: z.string().nullable().optional(),
  fields: z.array(fieldDefinitionSchema).optional(),
  sort_order: z.number().int().optional(),
})

export type CreateObjectTypeInput = z.infer<typeof createObjectTypeSchema>

export const updateObjectTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  plural_name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  icon: z.string().optional(),
  color: z.string().nullable().optional(),
  fields: z.array(fieldDefinitionSchema).optional(),
  sort_order: z.number().int().optional(),
})

export type UpdateObjectTypeInput = z.infer<typeof updateObjectTypeSchema>

export interface ListObjectTypesOptions {
  isArchived?: boolean
}

export interface ObjectTypesClient {
  list(options?: ListObjectTypesOptions): Promise<DataListResult<ObjectType>>
  get(id: string): Promise<DataResult<ObjectType>>
  create(input: CreateObjectTypeInput): Promise<DataResult<ObjectType>>
  update(id: string, input: UpdateObjectTypeInput): Promise<DataResult<ObjectType>>
  delete(id: string): Promise<DataResult<void>>
  archive(id: string): Promise<DataResult<ObjectType>>
  unarchive(id: string): Promise<DataResult<ObjectType>>
}

export interface GlobalObjectTypesClient {
  list(): Promise<DataListResult<ObjectType>>
  get(id: string): Promise<DataResult<ObjectType>>
  create(input: CreateObjectTypeInput): Promise<DataResult<ObjectType>>
  update(id: string, input: UpdateObjectTypeInput): Promise<DataResult<ObjectType>>
  delete(id: string): Promise<DataResult<void>>
  importToSpace(id: string, targetSpaceId: string): Promise<DataResult<ObjectType>>
}

// --- Data Object schemas ---

export const objectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  type_id: z.string().uuid(),
  owner_id: z.string().uuid().nullable(),
  space_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  icon: z.string().nullable(),
  cover_image: z.string().url().nullable(),
  properties: z.record(z.string(), z.any()),
  content: z.any().nullable(),
  is_deleted: z.boolean(),
  deleted_at: z.string().datetime().nullable(),
  is_archived: z.boolean(),
  archived_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type DataObject = z.infer<typeof objectSchema>

export type DataObjectSummary = Omit<DataObject, 'content'>

export const createObjectSchema = z.object({
  title: z.string().min(1).max(255),
  type_id: z.string().uuid(),
  owner_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  icon: z.string().nullable().optional(),
  cover_image: z.string().url().nullable().optional(),
  properties: z.record(z.string(), z.any()).optional(),
  content: z.any().nullable().optional(),
  is_deleted: z.boolean().optional(),
})

export type CreateObjectInput = z.infer<typeof createObjectSchema>

export const updateObjectSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  type_id: z.string().uuid().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  icon: z.string().nullable().optional(),
  cover_image: z.string().url().nullable().optional(),
  properties: z.record(z.string(), z.any()).optional(),
  content: z.any().nullable().optional(),
  is_deleted: z.boolean().optional(),
})

export type UpdateObjectInput = z.infer<typeof updateObjectSchema>

// Query options
export interface ListObjectsOptions {
  parentId?: string | null
  typeId?: string
  isDeleted?: boolean
  isArchived?: boolean
  limit?: number
  offset?: number
}

// --- Template schemas ---

export const templateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  type_id: z.string().uuid(),
  owner_id: z.string().uuid().nullable(),
  space_id: z.string().uuid(),
  icon: z.string().nullable(),
  cover_image: z.string().url().nullable(),
  properties: z.record(z.string(), z.any()),
  content: z.any().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Template = z.infer<typeof templateSchema>

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  type_id: z.string().uuid(),
  icon: z.string().nullable().optional(),
  cover_image: z.string().url().nullable().optional(),
  properties: z.record(z.string(), z.any()).optional(),
  content: z.any().nullable().optional(),
})

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type_id: z.string().uuid().optional(),
  icon: z.string().nullable().optional(),
  cover_image: z.string().url().nullable().optional(),
  properties: z.record(z.string(), z.any()).optional(),
  content: z.any().nullable().optional(),
})

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>

export interface ListTemplatesOptions {
  typeId?: string
}

export interface TemplatesClient {
  list(options?: ListTemplatesOptions): Promise<DataListResult<Template>>
  get(id: string): Promise<DataResult<Template>>
  create(input: CreateTemplateInput): Promise<DataResult<Template>>
  update(id: string, input: UpdateTemplateInput): Promise<DataResult<Template>>
  delete(id: string): Promise<DataResult<void>>
}

// Generic result types
export interface DataResult<T> {
  data: T | null
  error: DataError | null
}

export interface DataListResult<T> {
  data: T[]
  error: DataError | null
}

export interface DataError {
  message: string
  code?: string
}

export interface ListSpacesOptions {
  isArchived?: boolean
}

export interface SpacesClient {
  list(options?: ListSpacesOptions): Promise<DataListResult<Space>>
  get(id: string): Promise<DataResult<Space>>
  create(input: { name: string; icon?: string }): Promise<DataResult<Space>>
  update(id: string, input: { name?: string; icon?: string }): Promise<DataResult<Space>>
  delete(id: string): Promise<DataResult<void>>
  archive(id: string): Promise<DataResult<Space>>
  unarchive(id: string): Promise<DataResult<Space>>
}

export interface SearchOptions {
  typeIds?: string[]
}

export interface ObjectsClient {
  list(options?: ListObjectsOptions): Promise<DataListResult<DataObjectSummary>>
  get(id: string): Promise<DataResult<DataObject>>
  create(input: CreateObjectInput): Promise<DataResult<DataObject>>
  update(id: string, input: UpdateObjectInput): Promise<DataResult<DataObject>>
  delete(id: string, permanent?: boolean): Promise<DataResult<void>>
  restore(id: string): Promise<DataResult<DataObject>>
  archive(id: string): Promise<DataResult<DataObject>>
  unarchive(id: string): Promise<DataResult<DataObject>>
  search(query: string, options?: SearchOptions): Promise<DataListResult<DataObject>>
  batchGetSummary(ids: string[]): Promise<DataListResult<Pick<DataObject, 'id' | 'title' | 'icon' | 'type_id'>>>
  purgeExpired(): Promise<DataResult<number>>
}

// --- Object Relation schemas ---

export const objectRelationSchema = z.object({
  id: z.string().uuid(),
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  relation_type: z.string(),
  source_property: z.string().nullable(),
  context: z.any().nullable(),
  created_at: z.string().datetime(),
})

export type ObjectRelation = z.infer<typeof objectRelationSchema>

export const createObjectRelationSchema = z.object({
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  relation_type: z.string().optional(),
  source_property: z.string().nullable().optional(),
  context: z.any().nullable().optional(),
})

export type CreateObjectRelationInput = z.infer<typeof createObjectRelationSchema>

export interface ListRelationsOptions {
  objectId: string
  relationType?: string
}

export interface ListAllRelationsOptions {
  relationType?: string
}

export interface RelationsClient {
  list(options: ListRelationsOptions): Promise<DataListResult<ObjectRelation>>
  listAll(options?: ListAllRelationsOptions): Promise<DataListResult<ObjectRelation>>
  create(input: CreateObjectRelationInput): Promise<DataResult<ObjectRelation>>
  delete(id: string): Promise<DataResult<void>>
  deleteBySourceAndTarget(sourceId: string, targetId: string, relationType?: string): Promise<DataResult<void>>
  syncMentions(sourceId: string, mentionTargetIds: string[]): Promise<DataResult<void>>
}

// --- Tag schemas ---

export const tagSchema = z.object({
  id: z.string().uuid(),
  space_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Tag = z.infer<typeof tagSchema>

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().nullable().optional(),
})

export type CreateTagInput = z.infer<typeof createTagSchema>

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().nullable().optional(),
})

export type UpdateTagInput = z.infer<typeof updateTagSchema>

export const objectTagSchema = z.object({
  id: z.string().uuid(),
  object_id: z.string().uuid(),
  tag_id: z.string().uuid(),
  created_at: z.string().datetime(),
})

export type ObjectTag = z.infer<typeof objectTagSchema>

export interface TagsClient {
  list(): Promise<DataListResult<Tag>>
  get(id: string): Promise<DataResult<Tag>>
  create(input: CreateTagInput): Promise<DataResult<Tag>>
  update(id: string, input: UpdateTagInput): Promise<DataResult<Tag>>
  delete(id: string): Promise<DataResult<void>>
  getObjectTags(objectId: string): Promise<DataListResult<Tag>>
  getObjectTagsBatch(objectIds: string[]): Promise<DataListResult<{ object_id: string; tags: Tag[] }>>
  addTagToObject(objectId: string, tagId: string): Promise<DataResult<ObjectTag>>
  removeTagFromObject(objectId: string, tagId: string): Promise<DataResult<void>>
  getObjectsByTag(tagId: string): Promise<DataListResult<DataObjectSummary>>
  countObjectsByTag(tagId: string): Promise<DataResult<number>>
}

// --- Sharing schemas ---

export type SpaceSharePermission = 'view' | 'edit'
export type SpacePermission = 'owner' | 'edit' | 'view'

export const spaceShareSchema = z.object({
  id: z.string().uuid(),
  space_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  shared_with_id: z.string().uuid(),
  shared_with_email: z.string(),
  permission: z.enum(['view', 'edit']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type SpaceShare = z.infer<typeof spaceShareSchema>

export const shareExclusionSchema = z.object({
  id: z.string().uuid(),
  space_share_id: z.string().uuid().nullable(),
  space_id: z.string().uuid().nullable(),
  excluded_type_id: z.string().uuid().nullable(),
  excluded_object_id: z.string().uuid().nullable(),
  excluded_field: z.string().nullable(),
  created_at: z.string().datetime(),
})

export type ShareExclusion = z.infer<typeof shareExclusionSchema>

export type CreateShareExclusionInput =
  | { excluded_type_id: string }
  | { excluded_object_id: string }
  | { excluded_type_id: string; excluded_field: string }

export interface SharedSpace extends Space {
  share_id: string
  permission: SpaceSharePermission
}

export interface SharingClient {
  listShares(spaceId: string): Promise<DataListResult<SpaceShare>>
  getShare(id: string): Promise<DataResult<SpaceShare>>
  createShare(input: { space_id: string; shared_with_email: string; permission: SpaceSharePermission }): Promise<DataResult<SpaceShare>>
  updateShare(id: string, input: { permission: SpaceSharePermission }): Promise<DataResult<SpaceShare>>
  deleteShare(id: string): Promise<DataResult<void>>
  listExclusions(shareId: string): Promise<DataListResult<ShareExclusion>>
  addExclusion(shareId: string, input: CreateShareExclusionInput): Promise<DataResult<ShareExclusion>>
  removeExclusion(id: string): Promise<DataResult<void>>
  listSpaceExclusions(spaceId: string): Promise<DataListResult<ShareExclusion>>
  addSpaceExclusion(spaceId: string, input: CreateShareExclusionInput): Promise<DataResult<ShareExclusion>>
  findUserByEmail(email: string): Promise<DataResult<{ id: string; email: string }>>
  getSharedSpaces(): Promise<DataListResult<SharedSpace>>
}

// --- Pin schemas ---

export const pinSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  object_id: z.string().uuid(),
  created_at: z.string().datetime(),
})

export type Pin = z.infer<typeof pinSchema>

export interface PinsClient {
  list(): Promise<DataListResult<Pin>>
  pin(objectId: string): Promise<DataResult<Pin>>
  unpin(objectId: string): Promise<DataResult<void>>
  isPinned(objectId: string): Promise<boolean>
}

// --- Saved View schemas ---

export const savedViewSchema = z.object({
  id: z.string().uuid(),
  space_id: z.string().uuid(),
  type_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  filters: z.any(), // serialized TypePageFilters (JSON)
  sort: z.any(),     // SortConfig (JSON)
  view_mode: z.string(),
  board_group_field_id: z.string().uuid().nullable(),
  is_default: z.boolean(),
  owner_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type SavedView = z.infer<typeof savedViewSchema>

export const createSavedViewSchema = z.object({
  type_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  filters: z.any(),
  sort: z.any(),
  view_mode: z.string(),
  board_group_field_id: z.string().uuid().nullable().optional(),
  is_default: z.boolean().optional(),
})

export type CreateSavedViewInput = z.infer<typeof createSavedViewSchema>

export const updateSavedViewSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  filters: z.any().optional(),
  sort: z.any().optional(),
  view_mode: z.string().optional(),
  board_group_field_id: z.string().uuid().nullable().optional(),
  is_default: z.boolean().optional(),
})

export type UpdateSavedViewInput = z.infer<typeof updateSavedViewSchema>

export interface SavedViewsClient {
  list(typeId: string): Promise<DataListResult<SavedView>>
  create(input: CreateSavedViewInput): Promise<DataResult<SavedView>>
  update(id: string, input: UpdateSavedViewInput): Promise<DataResult<SavedView>>
  delete(id: string): Promise<DataResult<void>>
}

// Data client interface (with sharing)
export interface DataClient {
  objects: ObjectsClient
  objectTypes: ObjectTypesClient
  globalObjectTypes: GlobalObjectTypesClient
  templates: TemplatesClient
  relations: RelationsClient
  spaces: SpacesClient
  sharing: SharingClient
  tags: TagsClient
  pins: PinsClient
  savedViews: SavedViewsClient
  isLocal: boolean
}

// Storage mode
export type StorageMode = 'supabase' | 'local'
