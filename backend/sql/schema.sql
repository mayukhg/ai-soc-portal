CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'analyst_tier1' CHECK (role IN ('analyst_tier1', 'analyst_tier2', 'analyst_tier3', 'management', 'admin')),
  department TEXT DEFAULT 'security',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  assignee TEXT,
  alert_count INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  embedding vector(1536)
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'investigating', 'resolved', 'false_positive')),
  source TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  source_ip INET,
  destination_ip INET,
  affected_systems TEXT[],
  indicators TEXT[],
  assigned_to UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'note' CHECK (comment_type IN ('note', 'escalation', 'resolution', 'question')),
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comment_target_check CHECK (
    (incident_id IS NOT NULL AND alert_id IS NULL) OR
    (incident_id IS NULL AND alert_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.threat_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_value TEXT NOT NULL,
  indicator_type TEXT NOT NULL CHECK (indicator_type IN ('ip', 'domain', 'url', 'hash', 'email', 'file')),
  threat_type TEXT NOT NULL,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  country_code TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  source TEXT NOT NULL,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kpi_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL CHECK (metric_category IN ('alerts', 'incidents', 'response_time', 'resolution', 'threats', 'performance')),
  current_value DECIMAL NOT NULL,
  previous_value DECIMAL,
  target_value DECIMAL,
  unit TEXT DEFAULT 'count',
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('incident_summary', 'threat_analysis', 'performance_metrics', 'compliance', 'executive_summary', 'custom')),
  template_id TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID NOT NULL REFERENCES public.profiles(user_id),
  generated_for TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'failed')),
  scheduled_for TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context_type TEXT CHECK (context_type IN ('general', 'incident', 'alert', 'threat_hunting')),
  context_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidents_updated_at ON public.incidents;
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_alerts_updated_at ON public.alerts;
CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_threat_intelligence_updated_at ON public.threat_intelligence;
CREATE TRIGGER update_threat_intelligence_updated_at
  BEFORE UPDATE ON public.threat_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES public.incidents(id);

CREATE INDEX IF NOT EXISTS idx_alerts_incident_id ON public.alerts(incident_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_incident_id ON public.comments(incident_id);
CREATE INDEX IF NOT EXISTS idx_comments_alert_id ON public.comments(alert_id);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_type ON public.threat_intelligence(indicator_type);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_active ON public.threat_intelligence(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_session ON public.ai_interactions(user_id, session_id);

-- Token overlap over title, description, and tags. A hit scores at least 0.72
-- so the dashboard threshold of 0.7 returns keyword matches. Embeddings stay
-- on the incidents.embedding column for a later model-backed scorer.
CREATE OR REPLACE FUNCTION public.search_incidents_text(
  query_text text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  severity text,
  status text,
  assignee text,
  alert_count integer,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  WITH tokens AS (
    SELECT tok
    FROM unnest(regexp_split_to_array(lower(coalesce(query_text, '')), '\s+')) AS tok
    WHERE char_length(tok) > 2
  ),
  scored AS (
    SELECT
      i.id,
      i.title,
      i.description,
      i.severity,
      i.status,
      i.assignee,
      i.alert_count,
      i.tags,
      i.created_at,
      i.updated_at,
      CASE
        WHEN (SELECT count(*) FROM tokens) = 0 THEN 0
        ELSE (
          SELECT count(*)::float FROM tokens t
          WHERE lower(i.title) LIKE '%%' || t.tok || '%%'
             OR lower(coalesce(i.description, '')) LIKE '%%' || t.tok || '%%'
             OR EXISTS (
               SELECT 1
               FROM unnest(coalesce(i.tags, ARRAY[]::text[])) AS tag
               WHERE lower(tag) LIKE '%%' || t.tok || '%%'
             )
        ) / (SELECT count(*) FROM tokens)
      END AS hit_ratio
    FROM public.incidents i
  )
  SELECT
    scored.id,
    scored.title,
    scored.description,
    scored.severity,
    scored.status,
    scored.assignee,
    scored.alert_count,
    scored.tags,
    scored.created_at,
    scored.updated_at,
    CASE
      WHEN scored.hit_ratio > 0 THEN LEAST(0.99, 0.72 + 0.27 * scored.hit_ratio)
      ELSE 0
    END AS similarity
  FROM scored
  WHERE (
    CASE
      WHEN scored.hit_ratio > 0 THEN LEAST(0.99, 0.72 + 0.27 * scored.hit_ratio)
      ELSE 0
    END
  ) >= match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
