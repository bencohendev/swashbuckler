'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/client'
import { Button } from '@/shared/components/ui/Button'
import { PasswordInput } from '@/shared/components/ui/PasswordInput'
import { PasswordStrengthMeter } from '@/features/auth/components/PasswordStrengthMeter'

export function PasswordSection({ user }: { user: User }) {
  const hasEmailIdentity = user.identities?.some(i => i.provider === 'email')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!hasEmailIdentity) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Password</h2>
        <p className="text-sm text-muted-foreground">
          Your account uses OAuth sign-in. To set a password, use the password reset flow from the login page.
        </p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSaving(true)
    const supabase = createClient()

    // Verify current password by signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (signInError) {
      setError('Current password is incorrect.')
      setIsSaving(false)
      return
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setIsSaving(false)
  }

  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="current-password" className="mb-1 block text-sm font-medium">
            Current password
          </label>
          <PasswordInput
            id="current-password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            aria-describedby={error ? "password-error" : undefined}
            required
          />
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
            New password
          </label>
          <PasswordInput
            id="new-password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          <div className="mt-2">
            <PasswordStrengthMeter password={newPassword} />
          </div>
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium">
            Confirm new password
          </label>
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error && <p id="password-error" role="alert" className="text-sm text-destructive">{error}</p>}
        {success && <p role="status" className="text-sm text-green-600">Password updated.</p>}
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Change password'}
        </Button>
      </form>
    </div>
  )
}
