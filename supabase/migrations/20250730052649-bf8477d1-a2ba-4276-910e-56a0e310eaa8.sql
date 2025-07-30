-- Fix function search path security issues
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix search function security issue
CREATE OR REPLACE FUNCTION public.search_incidents_semantic(
  query_embedding vector(1536),
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
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    incidents.id,
    incidents.title,
    incidents.description,
    incidents.severity,
    incidents.status,
    incidents.assignee,
    incidents.alert_count,
    incidents.tags,
    incidents.created_at,
    incidents.updated_at,
    1 - (incidents.embedding <=> query_embedding) as similarity
  FROM public.incidents
  WHERE 1 - (incidents.embedding <=> query_embedding) > match_threshold
  ORDER BY incidents.embedding <=> query_embedding
  LIMIT match_count;
$$;