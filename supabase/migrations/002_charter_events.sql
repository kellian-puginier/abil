-- ============================================================
-- Migration 002 — Charte joueur, événements IC, nouveaux champs
-- ============================================================

-- Articles de la Charte du joueur IC (gérés par l'admin)
create table if not exists charter_articles (
  id        uuid primary key default gen_random_uuid(),
  order_num int not null default 0,
  title     text not null,
  content   text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function update_charter_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists charter_updated on charter_articles;
create trigger charter_updated before update on charter_articles
  for each row execute function update_charter_updated_at();

alter table charter_articles enable row level security;
create policy "charter_select_public" on charter_articles for select using (true);
create policy "charter_admin_all"     on charter_articles for all to authenticated using (true) with check (true);

-- Événements IC — stages, week-ends, etc.
-- Différents des ic_dates (rencontres) : ici pour stages et événements ponctuels
create table if not exists ic_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date not null,
  team_codes  text[] not null,  -- équipes concernées
  description text,
  created_at  timestamptz default now()
);

alter table ic_events enable row level security;
create policy "ic_events_select_public" on ic_events for select using (true);
create policy "ic_events_admin_all"     on ic_events for all to authenticated using (true) with check (true);

-- Nouveaux champs dans responses
alter table responses
  add column if not exists charter_consent    boolean,
  add column if not exists wants_captain      text,    -- 'yes' | 'no' | 'if_needed'
  add column if not exists ic_role            text,    -- 'titulaire' | 'remplacant' | 'peu_importe'
  add column if not exists tshirt_has         text[],  -- ['bleu'] | ['jaune'] | ['les_deux'] | ['none']
  add column if not exists tshirt_model       text,    -- 'homme' | 'femme'
  add column if not exists tshirt_size        text,    -- 'XS'..'3XL'
  add column if not exists formations_interest text[], -- ['table','arbitrage','ja','jamais']
  add column if not exists stage_availability jsonb,   -- { "<event_id>": "yes"|"no"|"uncertain" }
  add column if not exists cohesion_text      text,
  add column if not exists cohesion_date      text;
