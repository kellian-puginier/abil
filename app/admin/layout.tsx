import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // La page login gère sa propre logique — on ne redirect pas depuis le layout
  const navLinks = [
    { href: '/admin',          label: 'Dashboard' },
    { href: '/admin/players',  label: 'Joueurs' },
    { href: '/admin/stats',    label: 'Stats saison' },
    { href: '/admin/charter',  label: 'Charte IC' },
    { href: '/admin/ic-dates', label: 'Dates IC' },
    { href: '/admin/ic-events', label: 'Événements' },
    { href: '/admin/responses', label: 'Réponses' },
    { href: '/admin/bm-stats', label: 'BM Stats' },
  ]

  return (
    <div className="flex min-h-svh flex-col">
      {user && (
        <header className="border-b bg-background px-4 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-6">
              <Image
                src="/logo-abil-noir.png"
                alt="ABIL"
                width={72}
                height={72}
                className="h-9 w-auto"
              />
              <nav className="hidden gap-4 md:flex">
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
            <form action="/api/admin/logout" method="POST">
              <button type="submit" className="text-xs text-muted-foreground underline">
                Déconnexion
              </button>
            </form>
          </div>
        </header>
      )}
      <main className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
