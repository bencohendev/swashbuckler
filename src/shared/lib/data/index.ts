export type {
  DataClient,
  ObjectsClient,
  DataObject,
  CreateObjectInput,
  UpdateObjectInput,
  ListObjectsOptions,
  DataResult,
  DataListResult,
  DataError,
  StorageMode,
} from './types'

export { objectSchema, createObjectSchema, updateObjectSchema } from './types'

export { createSupabaseDataClient } from './supabase'
export { createLocalDataClient, clearLocalData, exportLocalData } from './local'
export {
  DataProvider,
  useDataClient,
  useStorageMode,
  useAuth,
  useMigrateData,
} from './DataProvider'
