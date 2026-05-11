-- ============================================================
-- ABIL Sondage Interclubs 2025-2026 — Migration initiale
-- ============================================================

-- Joueurs importés par l'admin (ou créés lors de l'identification)
create table if not exists players (
  id             uuid primary key default gen_random_uuid(),
  first_name     text not null,
  last_name      text not null,
  email          text unique not null,
  gender         text check (gender in ('H', 'F')) not null,
  ranking_simple text,
  ranking_double text,
  ranking_mixte  text,
  previous_team  text,       -- équipe IC saison précédente, null si absent des IC
  is_new         boolean default false, -- true si auto-créé lors de l'identification
  created_at     timestamptz default now()
);

-- Stats de la saison passée (importées par l'admin via CSV)
create table if not exists player_stats (
  player_id        uuid references players(id) on delete cascade primary key,
  matches_simple   int default 0,
  matches_double   int default 0,
  matches_mixte    int default 0,
  partners         text[] default '{}', -- noms libres (pas d'UUIDs — données historiques)
  notes            text
);

-- Équipes du club pour la saison cible
create table if not exists teams (
  code        text primary key,
  label       text not null,
  level_order int not null,  -- 1 = plus haute division
  play_days   text[] not null -- ex: '{saturday}', '{sunday}', '{saturday,sunday}'
);

-- Dates de rencontres IC (utilisées pour le calendrier écran 11)
create table if not exists ic_dates (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  team_codes text[] not null,
  label      text
);

-- Réponses au questionnaire (une par joueur)
create table if not exists responses (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid references players(id) on delete cascade unique,
  client_token   text,  -- UUID stocké en localStorage pour reprise auto sans re-saisie email

  -- Étape 2 : bilan saison
  season_feedback text,

  -- Étape 3 : licence
  staying_licensed    boolean,
  reason_leaving_club text,

  -- Étape 4 : interclubs
  doing_interclubs boolean,
  reason_no_ic     text,

  -- Étape 5-9 : préférences IC
  tableau_ranking      text[],          -- ['simple','double','mixte'] ordonnés
  availability         text[],          -- ['weekday','saturday','sunday','anytime']
  matches_per_encounter text,           -- '1','2','any'
  matches_per_day       text,           -- '1','2','3','4','any'
  double_partners       uuid[],         -- player IDs (max 3)
  mixte_partners        uuid[],         -- player IDs (max 3)
  preferred_teams       text[],         -- team codes ou ['any']
  unavailable_dates     uuid[],         -- ic_dates IDs
  date_comments         jsonb,          -- { "<ic_date_id>": "commentaire" }

  -- Badminton Manager (préparé pour V1.1, non rempli en V1)
  did_bm         boolean default false,
  bm_assignments jsonb,

  -- Métadonnées
  completed        boolean default false,
  current_step     int default 0,
  last_resumed_at  timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Trigger updated_at automatique sur responses
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists responses_updated on responses;
create trigger responses_updated
  before update on responses
  for each row execute function update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table players      enable row level security;
alter table player_stats enable row level security;
alter table teams        enable row level security;
alter table ic_dates     enable row level security;
alter table responses    enable row level security;

-- Lecture publique anonyme sur les tables de référence
create policy "players_select_public"      on players      for select using (true);
create policy "player_stats_select_public" on player_stats for select using (true);
create policy "teams_select_public"        on teams        for select using (true);
create policy "ic_dates_select_public"     on ic_dates     for select using (true);

-- Insertion publique uniquement pour les nouveaux joueurs (is_new = true)
create policy "players_insert_new"
  on players for insert
  with check (is_new = true);

-- Réponses : lecture/écriture anonyme (resserrée en V1.1 avec auth token)
create policy "responses_select_public" on responses for select using (true);
create policy "responses_insert_public" on responses for insert with check (true);
create policy "responses_update_public" on responses for update using (true);

-- ============================================================
-- SEED : équipes
-- ============================================================

-- Créneaux réels ABIL : samedi=N2, dimanche=PN/R1/R2, soirée semaine=PR/D1-D6
insert into teams (code, label, level_order, play_days) values
  ('N2', 'Nationale 2',       1,  '{saturday}'),
  ('PN', 'Pré-Nationale',     2,  '{sunday}'),
  ('R1', 'Régionale 1',       3,  '{sunday}'),
  ('R2', 'Régionale 2',       4,  '{sunday}'),
  ('PR', 'Pré-Régionale',     5,  '{weekday}'),
  ('D1', 'Départementale 1',  6,  '{weekday}'),
  ('D2', 'Départementale 2',  7,  '{weekday}'),
  ('D3', 'Départementale 3',  8,  '{weekday}'),
  ('D4', 'Départementale 4',  9,  '{weekday}'),
  ('D5', 'Départementale 5',  10, '{weekday}'),
  ('D6', 'Départementale 6',  11, '{weekday}')
on conflict (code) do nothing;
