'use client'

import { type ReactNode, useState } from 'react'
import EmojiPickerReact, { Theme } from 'emoji-picker-react'
import { Popover } from 'radix-ui'
import { useTheme } from 'next-themes'

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
  children: ReactNode
}

export function EmojiPicker({ value, onChange, children }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const { resolvedTheme } = useTheme()

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          className="z-50"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <EmojiPickerReact
            theme={resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
            onEmojiClick={(emojiData) => {
              onChange(emojiData.emoji)
              setOpen(false)
            }}
            skinTonesDisabled
            width={320}
            height={400}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
