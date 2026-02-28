import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/dashboard"

  // Validate redirect target: must be a relative path, no protocol-relative URLs
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard"

  // Detect origin — honour reverse-proxy headers in production
  const forwardedHost = request.headers.get("x-forwarded-host")
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https"
  const { origin: fallbackOrigin } = new URL(request.url)
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : fallbackOrigin

  if (code) {
    // Create the redirect response BEFORE the Supabase client so setAll can
    // write auth cookies directly onto the response that the browser follows.
    const response = NextResponse.redirect(`${origin}${next}`)

    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
