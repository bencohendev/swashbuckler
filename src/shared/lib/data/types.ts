import { z } from 'zod'

// Well-known built-in type IDs
export const BUILT_IN_TYPE_IDS = {
  page: '00000000-0000-0000-0000-000000000001',
  note: '00000000-0000-0000-0000-000000000002',
} as const

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
  sort_order: z.number().int(),
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

export interface ObjectTypesClient {
  list(): Promise<DataListResult<ObjectType>>
  get(id: string): Promise<DataResult<ObjectType>>
  create(input: CreateObjectTypeInput): Promise<DataResult<ObjectType>>
  update(id: string, input: UpdateObjectTypeInput): Promise<DataResult<ObjectType>>
  delete(id: string): Promise<DataResult<void>>
}

// --- Data Object schemas ---

export const objectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  type_id: z.string().uuid(),
  owner_id: z.string().uuid().nullable(),
  parent_id: z.string().uuid().nullable(),
  icon: z.string().nullable(),
  cover_image: z.string().url().nullable(),
  properties: z.record(z.string(), z.any()),
  content: z.any().nullable(),
  is_template: z.boolean(),
  is_deleted: z.boolean(),
  deleted_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type DataObject = z.infer<typeof objectSchema>

export const createObjectSchema = z.object({
  title: z.string().min(1).max(255),
  type_id: z.string().uuid(),
  owner_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  icon: z.string().nullable().optional(),
  cover_image: z.string().url().nullable().optional(),
  properties: z.record(z.string(), z.any()).optional(),
  content: z.any().nullable().optional(),
  is_template: z.boolean().optional(),
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
  is_template: z.boolean().optional(),
  is_deleted: z.boolean().optional(),
})

export type UpdateObjectInput = z.infer<typeof updateObjectSchema>

// Query options
export interface ListObjectsOptions {
  parentId?: string | null
  typeId?: string
  isDeleted?: boolean
  isTemplate?: boolean
  limit?: number
  offset?: number
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

// Data client interface
export interface DataClient {
  objects: ObjectsClient
  objectTypes: ObjectTypesClient
  isLocal: boolean
}

export interface ObjectsClient {
  list(options?: ListObjectsOptions): Promise<DataListResult<DataObject>>
  get(id: string): Promise<DataResult<DataObject>>
  create(input: CreateObjectInput): Promise<DataResult<DataObject>>
  update(id: string, input: UpdateObjectInput): Promise<DataResult<DataObject>>
  delete(id: string, permanent?: boolean): Promise<DataResult<void>>
  restore(id: string): Promise<DataResult<DataObject>>
  search(query: string): Promise<DataListResult<DataObject>>
}

// Storage mode
export type StorageMode = 'supabase' | 'local'
