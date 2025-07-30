import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SemanticSearchResult {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  assignee: string;
  alert_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  similarity: number;
}

export function useSemanticSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const { toast } = useToast();

  const performSemanticSearch = async (query: string, matchThreshold = 0.7, matchCount = 10) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // TODO: Move endpoint to environment variable
      const endpoint = process.env.REACT_APP_SEMANTIC_SEARCH_API || 'https://<API_GATEWAY_ID>.execute-api.<REGION>.amazonaws.com/prod/semantic-search';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, matchThreshold, matchCount }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Semantic search error:', data?.error);
        toast({
          title: "Search Error",
          description: data?.error || "Failed to perform semantic search. Please try again.",
          variant: "destructive",
        });
        setSearchResults([]);
        return;
      }

      setSearchResults(data.results || []);
      toast({
        title: "Search Complete",
        description: `Found ${data.results?.length || 0} semantic matches`,
      });
    } catch (err) {
      console.error('Search error:', err);
      toast({
        title: "Search Error",
        description: "Failed to perform semantic search. Please try again.",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const generateEmbedding = async (incidentId: string, text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: {
          incidentId,
          text
        }
      });

      if (error) {
        console.error('Embedding generation error:', error);
        toast({
          title: "Embedding Error",
          description: "Failed to generate embedding for incident.",
          variant: "destructive",
        });
        return false;
      }

      if (data?.success) {
        toast({
          title: "Embedding Generated",
          description: "Incident is now searchable via semantic search.",
        });
        return true;
      } else {
        console.error('Embedding generation failed:', data?.error);
        toast({
          title: "Embedding Failed",
          description: data?.error || "Unknown error occurred",
          variant: "destructive",
        });
        return false;
      }
    } catch (err) {
      console.error('Embedding error:', err);
      toast({
        title: "Embedding Error",
        description: "Failed to generate embedding. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    isSearching,
    searchResults,
    performSemanticSearch,
    generateEmbedding,
    clearResults: () => setSearchResults([])
  };
}