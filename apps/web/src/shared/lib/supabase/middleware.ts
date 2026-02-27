import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let user = null

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session if expired
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  const pathname = request.nextUrl.pathname
  const hasGuestCookie = request.cookies.has("swashbuckler-guest")

  // Root redirect: authenticated or returning guest → dashboard, else → landing
  if (pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = user || hasGuestCookie ? "/dashboard" : "/landing"
    return NextResponse.redirect(url)
  }

  // Authenticated users should not see the landing page
  if (pathname === "/landing" && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // Auth pages that should redirect authenticated users away
  const isAuthPage = pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth")

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // Guest mode: allow unauthenticated users to access the app
  // They will use local storage (IndexedDB) instead of Supabase

  return supabaseResponse
}
