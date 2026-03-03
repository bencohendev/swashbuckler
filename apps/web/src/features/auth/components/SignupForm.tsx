"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail } from "lucide-react"
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
import { PasswordStrengthMeter } from "./PasswordStrengthMeter"
import { Separator } from "@/shared/components/ui/Separator"

export function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      setConfirmationSent(true)
    } catch {
      setError("Unable to connect. Please check your internet connection and try again.")
      setIsLoading(false)
    }
  }

  async function handleResend() {
    setIsResending(true)
    setResendMessage(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      })

      if (error) {
        setResendMessage(error.message)
      } else {
        setResendMessage("Confirmation email resent. Check your inbox.")
      }
    } catch {
      setResendMessage("Unable to resend. Please check your internet connection.")
    }

    setIsResending(false)
  }

  if (confirmationSent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
            Click the link to activate your account, then come back here to
            sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? "Resending..." : "Resend confirmation email"}
          </Button>
          {resendMessage && (
            <p className="mt-2 text-sm text-muted-foreground" role="status">
              {resendMessage}
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button variant="outline">Go to sign in</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>Get started with Swashbuckler</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <PasswordStrengthMeter password={password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
