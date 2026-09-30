-- TrendPost Production pg_cron Scheduling
-- Note: Asia/Kolkata is UTC+5:30.
-- Standard UTC equivalents:
-- 07:00 AM IST = 01:30 AM UTC
-- 07:30 AM IST = 02:00 AM UTC
-- Every 2 hours starting 00:00 UTC

-- Enable pg_cron extension if on Supabase self-hosted or cloud with pg_cron enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Daily Pipeline at exactly 07:00 AM IST (01:30 AM UTC)
-- Invokes the daily-pipeline Edge function / internal API
SELECT cron.schedule(
    'trendpost-daily-pipeline-0700-ist',
    '30 1 * * *', -- 01:30 UTC = 07:00 IST
    $$
    SELECT
      net.http_post(
          url:='https://YOUR_PROJECT_REF.functions.supabase.co/daily-pipeline',
          headers:=jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body:=jsonb_build_object('trigger', 'cron_daily', 'timezone', 'Asia/Kolkata')
      ) as request_id;
    $$
);

-- 2. Daily Telegram Delivery at exactly 07:30 AM IST (02:00 AM UTC)
-- Sends top 5 content ideas with inline buttons to Person A & Person B
SELECT cron.schedule(
    'trendpost-deliver-telegram-0730-ist',
    '0 2 * * *', -- 02:00 UTC = 07:30 IST
    $$
    SELECT
      net.http_post(
          url:='https://YOUR_PROJECT_REF.functions.supabase.co/deliver-telegram',
          headers:=jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body:=jsonb_build_object('trigger', 'cron_delivery', 'limit', 5)
      ) as request_id;
    $$
);

-- 3. Two-Hour Spike Detection (Every 2 hours at minute 0)
-- Compares fresh trend data against previous runs to detect rapid velocity jumps
SELECT cron.schedule(
    'trendpost-detect-spikes-2h',
    '0 */2 * * *',
    $$
    SELECT
      net.http_post(
          url:='https://YOUR_PROJECT_REF.functions.supabase.co/detect-spikes',
          headers:=jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body:=jsonb_build_object('trigger', 'cron_spike_scan')
      ) as request_id;
    $$
);
