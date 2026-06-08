-- ============================================================
-- Migration 003 — Consultation N2 2026-2027
-- Branche indépendante : avis libres des joueuses/joueurs
-- concerné·e·s par l'avenir de l'équipe N2 (maintien ou N3)
-- ============================================================

create table if not exists consultation_n2_responses (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  -- Identité (facultative si anonymat coché)
  is_anonymous    boolean not null default false,
  respondent_name text,
  team            text not null check (team in ('n2', 'n3')),

  -- Écran 3 : ressenti
  feeling_text text,

  -- Écran 4 : avis sur la direction (lean optionnel + justification ouverte)
  preferred_direction   text check (preferred_direction in ('n2', 'neutre', 'n3')),
  direction_reason_text text,

  -- Écran 5 : ce qui compte + pistes
  priorities               text[],
  priorities_other_text    text,
  rebuild_involvement_text text,
  recruitment_opinion_text text,

  -- Écran 6 : arguments libres
  other_arguments_text       text,
  availability_ambition_text text
);

-- ============================================================
-- RLS
-- ============================================================

alter table consultation_n2_responses enable row level security;

-- Le contrôle d'accès se fait en amont (code d'accès applicatif partagé) :
-- l'insertion reste ouverte côté RLS, comme pour `responses`.
create policy "consultation_n2_insert_public"
  on consultation_n2_responses for insert
  with check (true);

-- Lecture/écriture réservées au bureau (admin authentifié) — confidentialité
-- garantie au niveau base de données, pas seulement applicatif.
create policy "consultation_n2_admin_all"
  on consultation_n2_responses for all
  to authenticated
  using (true)
  with check (true);
