# Sondage Interclubs ABIL 2025-2026

Application web mobile-first pour recueillir les projections des joueurs de l'Association Bad In Lez (ABIL) pour la saison interclubs.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + shadcn/ui
- **Supabase** (Postgres + Auth + RLS)
- **Zustand** (état du questionnaire)
- **Framer Motion** + canvas-confetti (animations)
- **dnd-kit** (drag & drop classement tableaux)
- **papaparse** (import/export CSV)
- **Vercel** (déploiement)

---

## Setup local

### 1. Cloner et installer

```bash
git clone <repo-url>
cd abil-survey
npm install
```

### 2. Configurer Supabase

Créer un projet sur [supabase.com](https://supabase.com), puis copier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
```

Ces valeurs se trouvent dans **Project Settings → API**.

### 3. Exécuter la migration SQL

Dans le **SQL Editor** de Supabase, exécuter le contenu de `supabase/migrations/001_init.sql`.

Ce script crée toutes les tables, active le RLS, et insère les 11 équipes.

### 4. Lancer en développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

---

## Créer le premier compte admin

### Via le dashboard Supabase (recommandé)

1. Aller dans **Authentication → Users → Invite user**
2. Saisir l'email admin (ex. `interclubs@abil-badminton.fr`)
3. L'utilisateur reçoit un mail pour définir son mot de passe

### Via SQL

```sql
select auth.create_user(
  '{"email": "admin@abil-badminton.fr", "password": "MotDePasseSecurise123!"}'::jsonb
);
```

---

## Import CSV des joueurs

Format (`examples/players.csv`) :

| Colonne | Obligatoire |
|---------|-------------|
| `first_name` | ✅ |
| `last_name` | ✅ |
| `email` | ✅ (clé unique) |
| `gender` | ✅ (`H` ou `F`) |
| `ranking_simple` | — |
| `ranking_double` | — |
| `ranking_mixte` | — |
| `previous_team` | — (code équipe IC saison préc.) |

L'import est un **upsert sur l'email** — relancer sans risque.

## Import CSV des stats saison

Format (`examples/stats.csv`) :

| Colonne | Description |
|---------|-------------|
| `email` | Email du joueur (doit déjà exister) |
| `matches_simple` | Nombre de matchs simple |
| `matches_double` | Nombre de matchs double |
| `matches_mixte` | Nombre de matchs mixte |
| `partners` | Partenaires séparés par `;` |
| `notes` | Notes libres |

---

## Déploiement Vercel

1. Pousser le projet sur GitHub
2. Sur [vercel.com](https://vercel.com) : **Add New → Project → Import**
3. Dans **Settings → Environment Variables**, ajouter :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Cliquer **Deploy**

---

## Structure du projet

```
app/
  (player)/           # Parcours joueur
    page.tsx          # Écran d'accueil
    flow/[step]/      # Flow dynamique (13 écrans)
    merci/            # Écran de remerciement
  admin/              # Panel admin (auth requise)
    login/
    page.tsx          # Dashboard KPIs
    players/          # Import + liste joueurs
    stats/            # Import stats saison
    ic-dates/         # CRUD dates IC
    responses/        # Tableau réponses + export CSV
    bm-stats/         # Placeholder V1.1
components/
  player/             # PlayerCard, TeamBadge, PlayerSearch
  flow/               # FlowContainer, ProgressBar, SaveButton, steps/
lib/
  supabase/           # client.ts, server.ts, types.ts
  eligibility.ts      # Règles d'éligibilité (fonctions pures)
  lineup-rules.ts     # Stubs BM V1.1
  flow-config.ts      # Définition du flow
  flow-save.ts        # Payload upsert DB
stores/
  questionnaire.ts    # Zustand store global
supabase/
  migrations/001_init.sql
examples/
  players.csv / stats.csv
docs/
  badminton-manager.md  # Spec V1.1
```

---

## Architecture V1.1 — Badminton Manager

Voir [`docs/badminton-manager.md`](docs/badminton-manager.md).

Pour activer BM en V1.1, trois fichiers à modifier — **aucun changement de routing ni de DB** :
1. `components/flow/steps/BadmintonManagerStep.tsx` — remplacer le placeholder
2. `lib/lineup-rules.ts` — implémenter les fonctions stubées
3. `app/admin/bm-stats/page.tsx` — implémenter les stats
