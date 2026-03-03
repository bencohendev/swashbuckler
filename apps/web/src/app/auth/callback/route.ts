import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/dashboard"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard"

  // Check for OAuth error params (e.g. user denied consent)
  const oauthError = searchParams.get("error")
  if (oauthError) {
    const errorDescription = searchParams.get("error_description") ?? oauthError
    console.error("[auth/callback] OAuth error:", oauthError, errorDescription)

    if (next === "/settings/account") {
      return NextResponse.redirect(`${origin}/settings/account?error=link_failed`)
    }
    return NextResponse.redirect(`${origin}/login?error=oauth_denied`)
  }

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[auth/callback] Missing Supabase env vars")
      return NextResponse.redirect(`${origin}/login?error=oauth_error`)
    }

    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, sameSite: "lax" })
          )
        },
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response
    }

    console.error("[auth/callback] Code exchange failed:", error.message)
  }

  // If this was a password reset attempt, send them back to forgot-password
  // with an error so they can request a new link
  if (rawNext === "/reset-password") {
    return NextResponse.redirect(`${origin}/forgot-password?error=link_expired`)
  }

  // Account linking failure
  if (next === "/settings/account") {
    return NextResponse.redirect(`${origin}/settings/account?error=link_failed`)
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`)
}
