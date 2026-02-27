import { useEffect, useMemo } from 'react'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CollaborationOptions } from '@/features/editor'
import { SupabaseYjsProvider } from '../lib/supabase-yjs-provider'
import { getUserColor } from '../lib/user-colors'

interface UseCollaborationOptions {
  spaceId: string
  documentId: string
  supabase: SupabaseClient
  userId: string
  userName: string
  avatarUrl?: string
  enabled: boolean
}

/**
 * Creates the Yjs collaboration infrastructure for a document.
 * Returns `CollaborationOptions` to pass to the `<Editor>` component,
 * or `undefined` when in solo mode.
 *
 * The Y.Doc is NOT pre-seeded here — the YjsPlugin's `init()` method
 * handles seeding from the editor's initial value.
 */
export function useCollaboration({
  spaceId,
  documentId,
  supabase,
  userId,
  userName,
  avatarUrl,
  enabled,
}: UseCollaborationOptions): CollaborationOptions | undefined {
  const collab = useMemo(() => {
    if (!enabled) return undefined

    const doc = new Y.Doc()
    const awareness = new Awareness(doc)
    const color = getUserColor(userId)

    // Set our awareness state with user info
    awareness.setLocalState({
      user: { name: userName, color, avatarUrl },
      joinedAt: Date.now(),
    })

    const provider = new SupabaseYjsProvider({
      supabase,
      spaceId,
      documentId,
      doc,
      awareness,
    })

    return {
      provider,
      doc,
      awareness,
      cursorData: { name: userName, color, avatarUrl },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable: only recreate on doc/user/enabled
  }, [spaceId, documentId, userId, enabled])

  // Auto-connect provider on creation, disconnect on cleanup.
  // Uses disconnect() (not destroy()) so React Strict Mode re-mount works.
  useEffect(() => {
    if (!collab) return
    collab.provider.connect()
    return () => {
      collab.provider.disconnect()
    }
  }, [collab])

  return collab
}
