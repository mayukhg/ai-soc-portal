import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/mixpanel';

const AI_THREAT_TYPES = [
  'prompt_injection',
  'data_exfiltration',
  'model_poisoning',
  'adversarial_input',
  'unauthorized_access',
  'model_inversion',
  'supply_chain',
  'jailbreak',
  'pii_leakage',
] as const;

function mapThreatType(raw: string): (typeof AI_THREAT_TYPES)[number] {
  const normalized = raw.toLowerCase().replace(/\s+/g, '_');
  const match = AI_THREAT_TYPES.find((type) => normalized.includes(type) || type.includes(normalized));
  if (match) return match;
  if (normalized.includes('exfil')) return 'data_exfiltration';
  if (normalized.includes('inject') || normalized.includes('prompt')) return 'prompt_injection';
  if (normalized.includes('jail')) return 'jailbreak';
  if (normalized.includes('pii') || normalized.includes('leak')) return 'pii_leakage';
  return 'unauthorized_access';
}

function severityFromConfidence(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

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
  const ingestedOnce = useRef(false);

  const fetchThreatIntelligence = async (filters: any = {}) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('threat_intelligence')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

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

      const mapped = (data || []).map((threat) => ({
        ...threat,
        indicator_type: threat.indicator_type as 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'file',
        tags: threat.tags || undefined,
        metadata: threat.metadata || undefined,
      }));
      setThreatIntel(mapped);

      if (mapped.length > 0 && !ingestedOnce.current) {
        ingestedOnce.current = true;
        const threatTypes = [...new Set(mapped.map((t) => mapThreatType(t.threat_type)))];
        trackEvent('threat_intelligence_ingested', {
          feed_name: mapped[0]?.source || 'internal',
          indicator_count: mapped.length,
          threat_types: threatTypes,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch threat intelligence:', err);
      setError(err.message);
      toast({
        title: 'Error Loading Threat Intelligence',
        description: err.message,
        variant: 'destructive',
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
      const { data, error } = await supabase
        .from('threat_intelligence')
        .insert([indicator])
        .select('id, threat_type, confidence_score, source')
        .single();

      if (error) {
        console.error('Error adding threat indicator:', error);
        throw error;
      }

      const confidence = indicator.confidence_score ?? data?.confidence_score ?? 70;
      const threatType = mapThreatType(indicator.threat_type);
      const autoEscalated = confidence >= 85;

      trackEvent('threat_detected', {
        threat_id: data?.id || crypto.randomUUID(),
        threat_type: threatType,
        severity: severityFromConfidence(confidence),
        source: 'analyst_reported',
        asset_id: data?.id || crypto.randomUUID(),
        asset_type: indicator.indicator_type === 'hash' ? 'model' : 'api_endpoint',
        auto_escalated: autoEscalated,
        confidence_score: confidence,
      });

      await fetchThreatIntelligence();

      toast({
        title: 'Threat Indicator Added',
        description: 'New threat indicator has been added successfully.',
      });
    } catch (err: any) {
      console.error('Failed to add threat indicator:', err);
      toast({
        title: 'Add Failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const getThreatsByCountry = () => {
    const countryGroups = threatIntel.reduce((acc, threat) => {
      if (!threat.country_code) return acc;

      if (!acc[threat.country_code]) {
        acc[threat.country_code] = {
          country: threat.country_code,
          count: 0,
          types: new Set(),
          latestActivity: threat.created_at,
          indicators: [],
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
      types: Array.from(group.types),
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
    refresh: fetchThreatIntelligence,
  };
}
