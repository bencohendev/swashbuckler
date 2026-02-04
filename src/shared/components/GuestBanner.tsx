'use client'

import Link from 'next/link'
import { XIcon } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/shared/lib/data'
import { Button } from './ui/Button'

export function GuestBanner() {
  const { isGuest, isLoading } = useAuth()
  const [isDismissed, setIsDismissed] = useState(false)

  if (isLoading || !isGuest || isDismissed) {
    return null
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-amber-800">
          <strong>Guest mode:</strong> Your data is stored locally and will be lost when you close the browser.{' '}
          <Link href="/signup" className="font-medium underline hover:no-underline">
            Sign up
          </Link>{' '}
          to save your work.
        </p>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => setIsDismissed(true)}
          className="text-amber-800 hover:bg-amber-100"
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  )
}
