-- ============================================================
-- Migration 004 — Consultation N2 : élargissement des options
-- d'équipe de rattachement (bureau/commission IC + autre)
-- ============================================================

alter table consultation_n2_responses
  drop constraint if exists consultation_n2_responses_team_check;

alter table consultation_n2_responses
  add constraint consultation_n2_responses_team_check
  check (team in ('n2', 'n3', 'bureau', 'autre'));
