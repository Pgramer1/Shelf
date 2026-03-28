-- One-time data correction for inflated activity units caused by forced ADD 0->1 logs.
-- Safe scope: only adjusts ADD rows that have corroborating PROGRESS rows from 0 to >0
-- for the same user_media, indicating duplicate contribution.
--
-- Run in a maintenance window and take a backup first.
-- Usage (psql example):
--   psql "$DATABASE_URL" -f backend/scripts/fix_consumption_logs_2026_03.sql

BEGIN;

-- 1) Preview candidate rows before update.
SELECT COUNT(*) AS candidate_rows
FROM consumption_logs add_log
WHERE add_log.event_type = 'ADD'
  AND add_log.progress_from = 0
  AND add_log.progress_to = 1
  AND add_log.units_consumed = 1
  AND EXISTS (
      SELECT 1
      FROM consumption_logs prog
      WHERE prog.user_id = add_log.user_id
        AND prog.user_media_id = add_log.user_media_id
        AND prog.event_type = 'PROGRESS'
        AND prog.progress_from = 0
        AND prog.progress_to > 0
  );

-- 2) Convert those ADD logs to non-consuming add events.
UPDATE consumption_logs add_log
SET progress_to = 0,
    units_consumed = 0
WHERE add_log.event_type = 'ADD'
  AND add_log.progress_from = 0
  AND add_log.progress_to = 1
  AND add_log.units_consumed = 1
  AND EXISTS (
      SELECT 1
      FROM consumption_logs prog
      WHERE prog.user_id = add_log.user_id
        AND prog.user_media_id = add_log.user_media_id
        AND prog.event_type = 'PROGRESS'
        AND prog.progress_from = 0
        AND prog.progress_to > 0
  );

-- 3) Report updated rows count.
SELECT COUNT(*) AS corrected_rows
FROM consumption_logs add_log
WHERE add_log.event_type = 'ADD'
  AND add_log.progress_from = 0
  AND add_log.progress_to = 0
  AND add_log.units_consumed = 0;

COMMIT;
