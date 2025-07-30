import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ThreatIntelligence {
  id: string;
  indicator_value: string;
  indicator_type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'file';
  threat_type: string;
  confidence_score: number;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  source: string;
  first_seen: string;
  last_seen: string;
  is_active: boolean;
  tags?: string[];
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export function useThreatIntelligence() {
  const [threatIntel, setThreatIntel] = useState<ThreatIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchThreatIntelligence = async (filters: any = {}) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('threat_intelligence')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.indicatorType) {
        query = query.eq('indicator_type', filters.indicatorType);
      }
      
      if (filters.threatType) {
        query = query.eq('threat_type', filters.threatType);
      }

      if (filters.country) {
        query = query.eq('country_code', filters.country);
      }

      if (filters.minConfidence) {
        query = query.gte('confidence_score', filters.minConfidence);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error('Error fetching threat intelligence:', error);
        throw error;
      }

      setThreatIntel((data || []).map(threat => ({
        ...threat,
        indicator_type: threat.indicator_type as 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'file',
        tags: threat.tags || undefined,
        metadata: threat.metadata || undefined
      })));
    } catch (err: any) {
      console.error('Failed to fetch threat intelligence:', err);
      setError(err.message);
      toast({
        title: "Error Loading Threat Intelligence",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addThreatIndicator = async (indicator: {
    indicator_value: string;
    indicator_type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'file';
    threat_type: string;
    source: string;
    confidence_score?: number;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    tags?: string[];
    metadata?: any;
  }) => {
    try {
      const { error } = await supabase
        .from('threat_intelligence')
        .insert([indicator]);

      if (error) {
        console.error('Error adding threat indicator:', error);
        throw error;
      }

      await fetchThreatIntelligence();
      
      toast({
        title: "Threat Indicator Added",
        description: "New threat indicator has been added successfully.",
      });
    } catch (err: any) {
      console.error('Failed to add threat indicator:', err);
      toast({
        title: "Add Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Group threats by country for mapping
  const getThreatsByCountry = () => {
    const countryGroups = threatIntel.reduce((acc, threat) => {
      if (!threat.country_code) return acc;
      
      if (!acc[threat.country_code]) {
        acc[threat.country_code] = {
          country: threat.country_code,
          count: 0,
          types: new Set(),
          latestActivity: threat.created_at,
          indicators: []
        };
      }
      
      acc[threat.country_code].count++;
      acc[threat.country_code].types.add(threat.threat_type);
      acc[threat.country_code].indicators.push(threat);
      
      if (new Date(threat.created_at) > new Date(acc[threat.country_code].latestActivity)) {
        acc[threat.country_code].latestActivity = threat.created_at;
      }
      
      return acc;
    }, {} as any);

    return Object.values(countryGroups).map((group: any) => ({
      ...group,
      types: Array.from(group.types)
    }));
  };

  useEffect(() => {
    fetchThreatIntelligence();
  }, []);

  return {
    threatIntel,
    loading,
    error,
    fetchThreatIntelligence,
    addThreatIndicator,
    getThreatsByCountry,
    refresh: fetchThreatIntelligence
  };
}