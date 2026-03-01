import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/dashboard"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard"

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
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
    }
  }

  // If this was a password reset attempt, send them back to forgot-password
  // with an error so they can request a new link
  if (rawNext === "/reset-password") {
    return NextResponse.redirect(`${origin}/forgot-password?error=link_expired`)
  }

  return NextResponse.redirect(`${origin}/login`)
}
