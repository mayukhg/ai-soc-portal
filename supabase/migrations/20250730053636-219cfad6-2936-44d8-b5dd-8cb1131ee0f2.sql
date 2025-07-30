-- Create comprehensive backend for SOC Dashboard

-- Create user profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'analyst_tier1' CHECK (role IN ('analyst_tier1', 'analyst_tier2', 'analyst_tier3', 'management', 'admin')),
  department TEXT DEFAULT 'security',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create alerts table
CREATE TABLE public.alerts (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536)
);

-- Enable RLS on alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for alerts
CREATE POLICY "Users can view all alerts" 
ON public.alerts 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create alerts" 
ON public.alerts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update alerts" 
ON public.alerts 
FOR UPDATE 
USING (true);

-- Create comments table for collaboration
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'note' CHECK (comment_type IN ('note', 'escalation', 'resolution', 'question')),
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT comment_target_check CHECK (
    (incident_id IS NOT NULL AND alert_id IS NULL) OR 
    (incident_id IS NULL AND alert_id IS NOT NULL)
  )
);

-- Enable RLS on comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
CREATE POLICY "Users can view all comments" 
ON public.comments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.comments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create threat intelligence table
CREATE TABLE public.threat_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_value TEXT NOT NULL,
  indicator_type TEXT NOT NULL CHECK (indicator_type IN ('ip', 'domain', 'url', 'hash', 'email', 'file')),
  threat_type TEXT NOT NULL,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  country_code TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  source TEXT NOT NULL,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on threat intelligence
ALTER TABLE public.threat_intelligence ENABLE ROW LEVEL SECURITY;

-- Create policies for threat intelligence
CREATE POLICY "Users can view threat intelligence" 
ON public.threat_intelligence 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage threat intelligence" 
ON public.threat_intelligence 
FOR ALL 
USING (true);

-- Create KPI metrics table
CREATE TABLE public.kpi_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL CHECK (metric_category IN ('alerts', 'incidents', 'response_time', 'resolution', 'threats', 'performance')),
  current_value DECIMAL NOT NULL,
  previous_value DECIMAL,
  target_value DECIMAL,
  unit TEXT DEFAULT 'count',
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on KPI metrics
ALTER TABLE public.kpi_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for KPI metrics
CREATE POLICY "Users can view KPI metrics" 
ON public.kpi_metrics 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage KPI metrics" 
ON public.kpi_metrics 
FOR ALL 
USING (true);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('incident_summary', 'threat_analysis', 'performance_metrics', 'compliance', 'executive_summary', 'custom')),
  template_id TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID NOT NULL REFERENCES public.profiles(user_id),
  generated_for TEXT[], -- roles or specific users
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- cron-like pattern for recurring reports
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policies for reports
CREATE POLICY "Users can view reports based on role" 
ON public.reports 
FOR SELECT 
USING (
  generated_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (role = ANY(generated_for) OR 'all' = ANY(generated_for))
  )
);

CREATE POLICY "Users can create reports" 
ON public.reports 
FOR INSERT 
WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Users can update their own reports" 
ON public.reports 
FOR UPDATE 
USING (auth.uid() = generated_by);

-- Create AI interactions table for conversation history
CREATE TABLE public.ai_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context_type TEXT CHECK (context_type IN ('general', 'incident', 'alert', 'threat_hunting')),
  context_id UUID, -- can reference incidents, alerts, etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on AI interactions
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for AI interactions
CREATE POLICY "Users can view their own AI interactions" 
ON public.ai_interactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create AI interactions" 
ON public.ai_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_alerts_severity ON public.alerts(severity);
CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX idx_alerts_embedding ON public.alerts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_incidents_severity ON public.incidents(severity);
CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_incidents_created_at ON public.incidents(created_at DESC);

CREATE INDEX idx_comments_incident_id ON public.comments(incident_id);
CREATE INDEX idx_comments_alert_id ON public.comments(alert_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at DESC);

CREATE INDEX idx_threat_intelligence_type ON public.threat_intelligence(indicator_type);
CREATE INDEX idx_threat_intelligence_active ON public.threat_intelligence(is_active);
CREATE INDEX idx_threat_intelligence_country ON public.threat_intelligence(country_code);

CREATE INDEX idx_ai_interactions_user_session ON public.ai_interactions(user_id, session_id);
CREATE INDEX idx_ai_interactions_created_at ON public.ai_interactions(created_at DESC);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_threat_intelligence_updated_at
  BEFORE UPDATE ON public.threat_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();