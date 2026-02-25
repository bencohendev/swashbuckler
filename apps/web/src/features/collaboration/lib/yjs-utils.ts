import type { Value } from '@udecode/plate'
import { slateToDeterministicYjsState } from '@udecode/plate-yjs'
import * as Y from 'yjs'

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function fromBase64(str: string): Uint8Array {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Seed the Y.Doc with Plate JSON content using deterministic state generation.
 * Only applies if the doc is empty (no other peers have initialized it).
 */
export async function seedYDocFromContent(
  documentId: string,
  content: Value,
  doc: Y.Doc
): Promise<void> {
  // Check if doc already has content by looking at the shared type
  const sharedType = doc.get('content', Y.XmlText)
  if (sharedType.length > 0) return

  const state = await slateToDeterministicYjsState(documentId, content)
  Y.applyUpdate(doc, state)
}
