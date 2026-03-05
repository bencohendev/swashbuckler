import type { SupabaseClient } from '@supabase/supabase-js'
import type { PreferencesClient, UserPreferences, DataResult } from './types'

export function createSupabasePreferencesClient(
  supabase: SupabaseClient,
  userId: string,
): PreferencesClient {
  return {
    async get(): Promise<DataResult<UserPreferences | null>> {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as UserPreferences | null, error: null }
    },

    async upsert(input): Promise<DataResult<UserPreferences>> {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: userId, ...input, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
        .select()
        .single()

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } }
      }

      return { data: data as UserPreferences, error: null }
    },
  }
}
