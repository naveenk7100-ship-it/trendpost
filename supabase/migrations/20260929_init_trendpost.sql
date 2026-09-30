-- TrendPost Production Database Schema & Migrations
-- Generated for Supabase PostgreSQL with RLS, atomic claim locking, and audit logs

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table (Person A & Person B + system roles)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    telegram_chat_id TEXT,
    telegram_enabled BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. API Keys & Integration Settings Table (Encrypted/Masked secrets)
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    provider TEXT NOT NULL CHECK (provider IN ('claude', 'openrouter', 'youtube', 'reddit', 'x', 'telegram', 'google_trends')),
    encrypted_key TEXT NOT NULL,
    key_hint TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'untested' CHECK (status IN ('active', 'failed', 'untested')),
    last_tested_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_api_keys_provider UNIQUE(provider)
);

-- 3. Trend Runs Table (Tracks scheduled & manual trend extraction jobs)
CREATE TABLE IF NOT EXISTS public.trend_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('scheduled_daily', 'manual_refresh', 'spike_scan')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
    topics_found INTEGER NOT NULL DEFAULT 0,
    providers_succeeded TEXT[] NOT NULL DEFAULT '{}',
    providers_failed TEXT[] NOT NULL DEFAULT '{}',
    error_summary TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 4. Topics Table (Normalized trends across Google, YouTube, Reddit, X)
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL CHECK (source IN ('google_trends', 'youtube', 'reddit', 'x', 'multi_source')),
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    category TEXT DEFAULT 'General',
    volume NUMERIC DEFAULT 0,
    velocity NUMERIC DEFAULT 0,
    source_timestamp TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    freshness_score NUMERIC NOT NULL DEFAULT 0 CHECK (freshness_score >= 0 AND freshness_score <= 100),
    volume_score NUMERIC NOT NULL DEFAULT 0 CHECK (volume_score >= 0 AND volume_score <= 100),
    velocity_score NUMERIC NOT NULL DEFAULT 0 CHECK (velocity_score >= 0 AND velocity_score <= 100),
    instagram_fit_score NUMERIC NOT NULL DEFAULT 0 CHECK (instagram_fit_score >= 0 AND instagram_fit_score <= 100),
    cross_platform_score NUMERIC NOT NULL DEFAULT 0 CHECK (cross_platform_score >= 0 AND cross_platform_score <= 100),
    virality_score NUMERIC NOT NULL DEFAULT 0 CHECK (virality_score >= 0 AND virality_score <= 100),
    is_top_10 BOOLEAN NOT NULL DEFAULT false,
    run_id UUID REFERENCES public.trend_runs(id) ON DELETE SET NULL,
    raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    region TEXT NOT NULL DEFAULT 'IN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Content Ideas Table (AI Generated Content: Reel script, captions, hashtags, carousels)
CREATE TABLE IF NOT EXISTS public.content_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    reel_script JSONB NOT NULL,
    hook TEXT NOT NULL,
    captions JSONB NOT NULL,
    hashtags JSONB NOT NULL,
    carousel_outline JSONB NOT NULL,
    recommended_post_time TIMESTAMPTZ NOT NULL,
    post_time_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    content_angle TEXT NOT NULL,
    generation_status TEXT NOT NULL DEFAULT 'completed' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
    delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed')),
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Idea Claims Table (Transactional Claiming: Person A vs Person B concurrency lock)
CREATE TABLE IF NOT EXISTS public.idea_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.content_ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    released_at TIMESTAMPTZ
);

-- STRICT CONCURRENCY CONSTRAINT:
-- Only ONE active claim per idea (where released_at IS NULL).
-- This completely prevents race conditions at the database level!
CREATE UNIQUE INDEX IF NOT EXISTS idx_idea_claims_single_active 
ON public.idea_claims(idea_id) 
WHERE (released_at IS NULL);

-- 7. Deliveries Table (Telegram Message logs & inline button actions)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.content_ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    telegram_message_id TEXT,
    telegram_chat_id TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed')),
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    action TEXT CHECK (action IN ('approved', 'rejected', 'claimed', 'unclaimed')),
    action_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Spike Events Table (2-Hour Velocity & Virality Spike detection)
CREATE TABLE IF NOT EXISTS public.spike_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    previous_score NUMERIC NOT NULL DEFAULT 0,
    current_score NUMERIC NOT NULL DEFAULT 0,
    score_change NUMERIC NOT NULL DEFAULT 0,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    alerted BOOLEAN NOT NULL DEFAULT false,
    severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('medium', 'high', 'critical')),
    raw_context JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 9. System Logs Table (Structured Observability for all services)
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
    service TEXT NOT NULL,
    event TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. System Settings Table (Cron schedules, thresholds, timeouts)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- INDEXES FOR HIGH PERFORMANCE QUERYING
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_topics_virality ON public.topics(virality_score DESC);
CREATE INDEX IF NOT EXISTS idx_topics_run_id ON public.topics(run_id);
CREATE INDEX IF NOT EXISTS idx_topics_normalized_title ON public.topics(normalized_title);
CREATE INDEX IF NOT EXISTS idx_topics_is_top_10 ON public.topics(is_top_10);
CREATE INDEX IF NOT EXISTS idx_content_ideas_topic ON public.content_ideas(topic_id);
CREATE INDEX IF NOT EXISTS idx_content_ideas_post_time ON public.content_ideas(recommended_post_time);
CREATE INDEX IF NOT EXISTS idx_deliveries_user_idea ON public.deliveries(user_id, idea_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spike_events_detected ON public.spike_events(detected_at DESC);

-- =========================================================================
-- TRANSACTIONAL STORED PROCEDURES (Atomic Claim & Release)
-- =========================================================================

-- Function: Claim Idea with Row Locking
CREATE OR REPLACE FUNCTION public.claim_idea_transactional(
    p_idea_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_claim RECORD;
    v_claimer RECORD;
    v_new_claim_id UUID;
BEGIN
    -- Check for existing active claim with row locking
    SELECT ic.*, u.name as claimer_name, u.email as claimer_email
    INTO v_active_claim
    FROM public.idea_claims ic
    JOIN public.users u ON u.id = ic.user_id
    WHERE ic.idea_id = p_idea_id AND ic.released_at IS NULL
    FOR UPDATE;

    IF FOUND THEN
        IF v_active_claim.user_id = p_user_id THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_claimed_by_you', true,
                'claim_id', v_active_claim.id,
                'message', 'You already have an active claim on this idea.'
            );
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'claimed_by_other', true,
                'claimer_id', v_active_claim.user_id,
                'claimer_name', v_active_claim.claimer_name,
                'message', format('Idea is already claimed by %s.', v_active_claim.claimer_name)
            );
        END IF;
    END IF;

    -- Verify user exists
    SELECT * INTO v_claimer FROM public.users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User does not exist.'
        );
    END IF;

    -- Insert atomic claim
    INSERT INTO public.idea_claims (idea_id, user_id, claimed_at)
    VALUES (p_idea_id, p_user_id, timezone('utc'::text, now()))
    RETURNING id INTO v_new_claim_id;

    RETURN jsonb_build_object(
        'success', true,
        'claim_id', v_new_claim_id,
        'claimer_name', v_claimer.name,
        'message', 'Idea successfully claimed!'
    );
END;
$$;

-- Function: Release Idea
CREATE OR REPLACE FUNCTION public.release_idea_transactional(
    p_idea_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE public.idea_claims
    SET released_at = timezone('utc'::text, now())
    WHERE idea_id = p_idea_id 
      AND user_id = p_user_id 
      AND released_at IS NULL;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated > 0 THEN
        RETURN jsonb_build_object('success', true, 'message', 'Idea released successfully.');
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'No active claim found for this user and idea.');
    END IF;
END;
$$;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spike_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated users
CREATE POLICY "Allow authenticated read on users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read on topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read on content_ideas" ON public.content_ideas FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read on idea_claims" ON public.idea_claims FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read on trend_runs" ON public.trend_runs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read on spike_events" ON public.spike_events FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read on deliveries" ON public.deliveries FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read on system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read on system_logs" ON public.system_logs FOR SELECT USING (true);

-- API Keys: Only admins or service role can select/modify secrets
CREATE POLICY "Allow admins read api_keys" ON public.api_keys FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') OR auth.role() = 'service_role'
);
CREATE POLICY "Allow admins insert/update api_keys" ON public.api_keys FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') OR auth.role() = 'service_role'
);

-- Service Role / Server API full access policies
CREATE POLICY "Service role full access users" ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access topics" ON public.topics FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access content_ideas" ON public.content_ideas FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access idea_claims" ON public.idea_claims FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access deliveries" ON public.deliveries FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access trend_runs" ON public.trend_runs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access spike_events" ON public.spike_events FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access system_logs" ON public.system_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access system_settings" ON public.system_settings FOR ALL TO service_role USING (true);

-- Authenticated claim actions
CREATE POLICY "Allow users to create their own claims" ON public.idea_claims 
FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Allow users to release their own claims" ON public.idea_claims 
FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- =========================================================================
-- SEED INITIAL DATA (Person A, Person B, Default Settings)
-- =========================================================================

INSERT INTO public.users (id, email, name, role, telegram_chat_id, telegram_enabled)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'person.a@trendpost.local', 'Person A', 'admin', '123456781', true),
    ('b0000000-0000-0000-0000-000000000002', 'person.b@trendpost.local', 'Person B', 'member', '123456782', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.system_settings (key, value)
VALUES
    ('timezone', '"Asia/Kolkata"'::jsonb),
    ('trend_scan_time', '"07:00"'::jsonb),
    ('telegram_delivery_time', '"07:30"'::jsonb),
    ('spike_detection_interval_hours', '2'::jsonb),
    ('spike_score_change_threshold', '20'::jsonb),
    ('spike_velocity_threshold', '40'::jsonb),
    ('minimum_significance', '60'::jsonb),
    ('ai_model', '"claude-3-5-sonnet-latest"'::jsonb),
    ('daily_generation_limit', '10'::jsonb),
    ('refresh_cooldown_seconds', '300'::jsonb)
ON CONFLICT (key) DO NOTHING;
