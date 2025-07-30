-- Enable the vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create incidents table with vector embeddings support
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  assignee TEXT,
  alert_count INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Vector embedding for semantic search (1536 dimensions for OpenAI embeddings)
  embedding vector(1536)
);

-- Enable Row Level Security
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Create policies for incidents (public access for demo purposes)
CREATE POLICY "Anyone can view incidents" 
ON public.incidents 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create incidents" 
ON public.incidents 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update incidents" 
ON public.incidents 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete incidents" 
ON public.incidents 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for vector similarity search
CREATE INDEX ON public.incidents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function for semantic search using vector similarity
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
LANGUAGE sql STABLE
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