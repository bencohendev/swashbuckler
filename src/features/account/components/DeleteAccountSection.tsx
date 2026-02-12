'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/client'
import { Button } from '@/shared/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/Dialog'
import { AlertTriangleIcon } from 'lucide-react'

export function DeleteAccountSection({ user }: { user: User }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const email = user.email ?? ''

  async function handleDelete() {
    if (confirmEmail !== email) return

    setIsDeleting(true)
    setError(null)

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to delete account')
      }

      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setIsDeleting(false)
    }
  }

  return (
    <div className="rounded-lg border border-destructive/30 p-6">
      <h2 className="mb-2 text-lg font-semibold text-destructive">Danger zone</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>
      <Button variant="destructive" size="sm" onClick={() => setIsOpen(true)}>
        Delete account
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-destructive" />
              Delete account
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all spaces, objects, and data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              Type <span className="font-medium">{email}</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmEmail}
              onChange={e => setConfirmEmail(e.target.value)}
              placeholder={email}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              autoComplete="off"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmEmail !== email || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Permanently delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
