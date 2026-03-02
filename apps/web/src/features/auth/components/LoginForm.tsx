"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/shared/lib/supabase/client"
import { Button } from "@/shared/components/ui/Button"
import { Input } from "@/shared/components/ui/Input"
import { PasswordInput } from "@/shared/components/ui/PasswordInput"
import { Label } from "@/shared/components/ui/Label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/Card"
import { OAuthButtons } from "./OAuthButtons"
import { Separator } from "@/shared/components/ui/Separator"

const URL_ERROR_MESSAGES: Record<string, string> = {
  link_expired: "That link has expired. Please try again.",
  oauth_denied: "Sign-in was cancelled. Please try again.",
  oauth_error: "Something went wrong during sign-in. Please try again.",
}

function getCooldownSeconds(attempts: number): number {
  if (attempts >= 10) return 60
  if (attempts >= 5) return 30
  return 0
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [bannerMessage, setBannerMessage] = useState<string | null>(() => {
    // Check URL search params for error/expired messages
    const expired = searchParams.get("expired")
    const urlError = searchParams.get("error")
    if (expired === "true") return "Your session has expired. Please sign in again."
    if (urlError && URL_ERROR_MESSAGES[urlError]) return URL_ERROR_MESSAGES[urlError]

    // Check for OAuth error fragments in the URL hash
    if (typeof window !== "undefined" && window.location.hash) {
      const params = new URLSearchParams(window.location.hash.slice(1))
      const hashError = params.get("error_description") ?? params.get("error")
      if (hashError) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search)
        return decodeURIComponent(hashError)
      }
    }

    return null
  })

  useEffect(() => {
    if (cooldownRemaining <= 0) return

    const timer = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          setLockoutUntil(null)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownRemaining])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (lockoutUntil && Date.now() < lockoutUntil) return

    setError(null)
    setBannerMessage(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const newAttempts = failedAttempts + 1
        setFailedAttempts(newAttempts)
        const cooldown = getCooldownSeconds(newAttempts)
        if (cooldown > 0) {
          setLockoutUntil(Date.now() + cooldown * 1000)
          setCooldownRemaining(cooldown)
        }
        setError(error.message)
        setIsLoading(false)
        return
      }

      // Clear guest cookie on successful login
      document.cookie = "swashbuckler-guest=; path=/; max-age=0"
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Unable to connect. Please check your internet connection and try again.")
      setIsLoading(false)
    }
  }

  const isLockedOut = cooldownRemaining > 0

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bannerMessage && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200" role="alert">
            {bannerMessage}
          </p>
        )}
        <OAuthButtons />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          {isLockedOut && (
            <p className="text-sm text-amber-600 dark:text-amber-400" role="status">
              Too many failed attempts. Please wait {cooldownRemaining} seconds before trying again.
            </p>
          )}
          {error && !isLockedOut && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading || isLockedOut}>
            {isLoading
              ? "Signing in..."
              : isLockedOut
                ? `Try again in ${cooldownRemaining}s`
                : "Sign in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
