import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: totalPlayers },
    { count: totalResponses },
    { count: completedResponses },
    { data: noRenewal },
    { data: yesIc },
  ] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('responses').select('*', { count: 'exact', head: true }),
    supabase.from('responses').select('*', { count: 'exact', head: true }).eq('completed', true),
    supabase.from('responses').select('id').eq('staying_licensed', false),
    supabase.from('responses').select('id').eq('doing_interclubs', true),
  ])

  const completed = completedResponses ?? 0
  const total = totalResponses ?? 0
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const kpis = [
    { label: 'Joueurs importés',    value: totalPlayers ?? 0,         color: 'bg-primary/10 text-primary' },
    { label: 'Réponses complètes',  value: completed,                  color: 'bg-green-100 text-green-700' },
    { label: 'En cours',            value: total - completed,          color: 'bg-yellow-100 text-yellow-700' },
    { label: 'Taux de complétion',  value: `${completionRate}%`,       color: 'bg-blue-100 text-blue-700' },
    { label: 'Non-renouvellements', value: noRenewal?.length ?? 0,     color: 'bg-red-100 text-red-700' },
    { label: 'Oui aux IC',          value: yesIc?.length ?? 0,        color: 'bg-primary/10 text-primary' },
  ]

  const actions = [
    { href: '/admin/players',  label: '📥 Importer joueurs' },
    { href: '/admin/stats',    label: '📊 Importer stats' },
    { href: '/admin/ic-dates', label: '📅 Gérer dates IC' },
    { href: '/admin/responses', label: '📋 Voir réponses' },
    { href: '/admin/responses?export=1', label: '⬇️ Exporter CSV' },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-2xl p-5 ${k.color}`}>
            <p className="text-3xl font-bold">{k.value}</p>
            <p className="mt-1 text-sm opacity-80">{k.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          {actions.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:border-primary/50 transition-colors"
            >
              {a.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
