'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/client'
import { Button } from '@/shared/components/ui/Button'
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/components/ui/Avatar'

export function ProfileSection({ user }: { user: User }) {
  const metadata = user.user_metadata ?? {}
  const [displayName, setDisplayName] = useState(metadata.display_name ?? metadata.full_name ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const avatarUrl: string | undefined = metadata.avatar_url ?? metadata.picture
  const email = user.email ?? ''
  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
    }
    setIsSaving(false)
  }

  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Profile</h2>
      <div className="mb-6 flex items-center gap-4">
        <Avatar size="lg">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName || email} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{displayName || email}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="display-name" className="mb-1 block text-sm font-medium">
            Display name
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">Profile updated.</p>}
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </div>
  )
}
