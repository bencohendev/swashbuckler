'use client'

import dynamic from 'next/dynamic'

export const LazyObjectEditorModal = dynamic(
  () => import('./ObjectEditorModal').then(mod => ({ default: mod.ObjectEditorModal })),
  { ssr: false }
)
