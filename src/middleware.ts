import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Public routes — always accessible regardless of session
  const publicRoutes = ['/', '/login', '/register', '/auth/callback', '/auth/error', '/pay']
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/api/')

  if (isPublicRoute) {
    // If user is already logged in and tries to visit /login or /register,
    // redirect them to their dashboard instead of showing auth screens again
    if (user && (pathname === '/login' || pathname === '/register')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = (profile as { role: string } | null)?.role
      const destination = role === 'admin' ? '/admin' : role === 'responsable' ? '/responsable' : '/dashboard'
      return NextResponse.redirect(new URL(destination, request.url))
    }
    return response
  }

  // Protected routes — require authentication
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based protection
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = (profile as { role: string } | null)?.role || 'client'

  // Client trying to access admin — redirect to their dashboard
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    return NextResponse.redirect(new URL(userRole === 'responsable' ? '/responsable' : '/dashboard', request.url))
  }

  // Client trying to access responsable — redirect to their dashboard
  if (pathname.startsWith('/responsable') && userRole !== 'responsable' && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin trying to access client dashboard — redirect to admin
  if (pathname.startsWith('/dashboard') && userRole === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Responsable trying to access client dashboard — redirect to responsable
  if (pathname.startsWith('/dashboard') && userRole === 'responsable') {
    return NextResponse.redirect(new URL('/responsable', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
