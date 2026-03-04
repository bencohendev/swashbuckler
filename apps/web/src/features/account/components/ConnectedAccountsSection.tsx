'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { User, UserIdentity } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/client'
import { Button } from '@/shared/components/ui/Button'
import { GoogleIcon, GithubIcon } from '@/features/auth/components/OAuthButtons'
import { CheckIcon, LinkIcon } from 'lucide-react'

const PROVIDERS = [
  { id: 'google', label: 'Google', Icon: GoogleIcon },
  { id: 'github', label: 'GitHub', Icon: GithubIcon },
] as const

export function ConnectedAccountsSection({ user }: { user: User }) {
  const searchParams = useSearchParams()
  const identities = user.identities ?? []
  const [isLinking, setIsLinking] = useState<string | null>(null)
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null)
  const urlError = searchParams.get("error")
  const [error, setError] = useState<string | null>(
    urlError === "link_failed" ? "Failed to link account. Please try again." : null
  )

  function getIdentity(provider: string): UserIdentity | undefined {
    return identities.find(i => i.provider === provider)
  }

  async function handleLink(provider: 'google' | 'github') {
    setIsLinking(provider)
    setError(null)

    try {
      const supabase = createClient()
      const { error: linkError } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/settings/account`,
        },
      })

      if (linkError) {
        setError(linkError.message)
        setIsLinking(null)
      }
      // If successful, the browser redirects to OAuth provider
    } catch {
      setError('Unable to connect. Please try again.')
      setIsLinking(null)
    }
  }

  async function handleUnlink(identity: UserIdentity) {
    if (identities.length <= 1) {
      setError('Cannot remove your only sign-in method.')
      return
    }

    setIsUnlinking(identity.provider)
    setError(null)

    try {
      const supabase = createClient()
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity)

      if (unlinkError) {
        setError(unlinkError.message)
      } else {
        // Refresh the session to trigger onAuthStateChange with updated identities
        await supabase.auth.refreshSession()
      }
    } catch {
      setError('Unable to connect. Please try again.')
    }
    setIsUnlinking(null)
  }

  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Connected accounts</h2>
      <div className="space-y-3">
        {PROVIDERS.map(({ id, label, Icon }) => {
          const identity = getIdentity(id)
          const isConnected = !!identity
          return (
            <div key={id} className="flex items-center justify-between rounded-md border px-4 py-3">
              <div className="flex items-center gap-3">
                <Icon className="size-5" />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  {isConnected && identity.identity_data?.email && (
                    <p className="text-xs text-muted-foreground">{identity.identity_data.email}</p>
                  )}
                </div>
              </div>
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckIcon className="size-3.5" />
                    Connected
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleUnlink(identity)}
                    disabled={isUnlinking === id || identities.length <= 1}
                  >
                    {isUnlinking === id ? 'Removing...' : 'Disconnect'}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLink(id)}
                  disabled={isLinking === id}
                >
                  <LinkIcon className="size-3.5" />
                  {isLinking === id ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>
          )
        })}
      </div>
      {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
}
