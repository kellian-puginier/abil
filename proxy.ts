import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Protège /admin/* (auth Supabase) et /consultation-n2/* (code d'accès partagé)
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Consultation N2 : code d'accès partagé + anti double-réponse ──────────
  if (pathname.startsWith('/consultation-n2')) {
    // Déjà répondu (cookie posé après soumission) → direction la page de remerciement
    const submitted = request.cookies.get('consultation_n2_submitted')
    if (submitted && pathname !== '/consultation-n2/merci') {
      return NextResponse.redirect(new URL('/consultation-n2/merci', request.url))
    }

    // Porte d'entrée et remerciement : accessibles sans cookie d'accès
    if (pathname === '/consultation-n2' || pathname === '/consultation-n2/merci') {
      return NextResponse.next()
    }

    // Étapes du parcours : nécessitent le cookie posé après saisie du bon code
    const access = request.cookies.get('consultation_n2_access')
    if (!access || access.value !== process.env.CONSULTATION_N2_ACCESS_CODE) {
      return NextResponse.redirect(new URL('/consultation-n2', request.url))
    }

    return NextResponse.next()
  }

  // ── Admin : protège toutes les routes /admin/* sauf /admin/login ──────────
  if (!pathname.startsWith('/admin') || pathname === '/admin/login') {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/consultation-n2/:path*'],
}
