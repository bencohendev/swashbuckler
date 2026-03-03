import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  // Check for OAuth error params (e.g. user denied consent)
  const oauthError = searchParams.get("error")
  if (oauthError) {
    const errorDescription =
      searchParams.get("error_description") ?? oauthError
    console.error(
      "[auth/google/callback] OAuth error:",
      oauthError,
      errorDescription,
    )
    return NextResponse.redirect(`${origin}/login?error=oauth_denied`)
  }

  // Verify CSRF state
  const storedState = request.cookies.get("google_oauth_state")?.value
  if (!state || !storedState || state !== storedState) {
    console.error("[auth/google/callback] State mismatch")
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  if (!code) {
    console.error("[auth/google/callback] Missing authorization code")
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!clientId || !clientSecret || !supabaseUrl || !supabaseAnonKey) {
    console.error("[auth/google/callback] Missing env vars")
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  // Exchange authorization code for tokens with Google
  const redirectUri = `${origin}/auth/google/callback`
  let idToken: string

  try {
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      },
    )

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      console.error(
        "[auth/google/callback] Token exchange failed:",
        tokenResponse.status,
        errorBody,
      )
      return NextResponse.redirect(`${origin}/login?error=oauth_error`)
    }

    const tokens: { id_token?: string } = await tokenResponse.json()
    if (!tokens.id_token) {
      console.error("[auth/google/callback] No id_token in response")
      return NextResponse.redirect(`${origin}/login?error=oauth_error`)
    }

    idToken = tokens.id_token
  } catch (err) {
    console.error("[auth/google/callback] Token exchange error:", err)
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  // Sign in with Supabase using the Google ID token
  const response = NextResponse.redirect(`${origin}/dashboard`)

  // Clear the state cookie
  response.cookies.set("google_oauth_state", "", {
    path: "/",
    maxAge: 0,
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, { ...options, sameSite: "lax" }),
        )
      },
    },
  })

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  })

  if (error) {
    console.error(
      "[auth/google/callback] signInWithIdToken failed:",
      error.message,
    )
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  return response
}
