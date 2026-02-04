import { z } from 'zod'

// Base object schema for validation
export const objectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  type: z.enum(['page', 'note']),
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

// Schema for creating objects - defined explicitly for Zod 4 compatibility
export const createObjectSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(['page', 'note']),
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

// Schema for updating objects
export const updateObjectSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  type: z.enum(['page', 'note']).optional(),
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
  type?: 'page' | 'note'
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
