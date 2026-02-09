export type {
  DataClient,
  ObjectsClient,
  ObjectTypesClient,
  TemplatesClient,
  RelationsClient,
  DataObject,
  CreateObjectInput,
  UpdateObjectInput,
  ListObjectsOptions,
  ObjectType,
  FieldDefinition,
  FieldType,
  CreateObjectTypeInput,
  UpdateObjectTypeInput,
  ObjectRelation,
  CreateObjectRelationInput,
  ListRelationsOptions,
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  ListTemplatesOptions,
  DataResult,
  DataListResult,
  DataError,
  StorageMode,
} from './types'

export {
  BUILT_IN_TYPE_IDS,
  objectSchema,
  createObjectSchema,
  updateObjectSchema,
  objectTypeSchema,
  createObjectTypeSchema,
  updateObjectTypeSchema,
  objectRelationSchema,
  createObjectRelationSchema,
  templateSchema,
  createTemplateSchema,
  updateTemplateSchema,
  fieldDefinitionSchema,
  fieldTypeEnum,
} from './types'

export { createSupabaseDataClient } from './supabase'
export { createLocalDataClient, clearLocalData, exportLocalData } from './local'
export {
  DataProvider,
  useDataClient,
  useStorageMode,
  useAuth,
  useMigrateData,
} from './DataProvider'
