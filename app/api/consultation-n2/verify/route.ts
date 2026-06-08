import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Vérifie le code d'accès partagé de la consultation N2 et pose un cookie
// httpOnly de session si le code est correct. Le code de référence reste
// côté serveur (variable d'env sans préfixe NEXT_PUBLIC_) — jamais exposé au navigateur.
export async function POST(request: NextRequest) {
  const { code } = await request.json().catch(() => ({ code: '' }))
  const expected = process.env.CONSULTATION_N2_ACCESS_CODE

  if (!expected || typeof code !== 'string' || code.trim() !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('consultation_n2_access', expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 60, // 60 jours
    path: '/',
  })
  return response
}
