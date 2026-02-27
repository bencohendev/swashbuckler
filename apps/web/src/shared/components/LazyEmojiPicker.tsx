'use client'

import dynamic from 'next/dynamic'

export const EmojiPicker = dynamic(
  () => import('./EmojiPicker').then(mod => ({ default: mod.EmojiPicker })),
  { ssr: false }
)
