import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KPIMetric {
  id: string;
  metric_name: string;
  metric_category: string;
  current_value: number;
  previous_value?: number;
  target_value?: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  period_start: string;
  period_end: string;
  calculated_at: string;
  metadata?: any;
}

export function useKPIMetrics() {
  const [metrics, setMetrics] = useState<KPIMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchKPIMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('kpi_metrics')
        .select('*')
        .order('calculated_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching KPI metrics:', error);
        throw error;
      }

      setMetrics((data || []).map(metric => ({
        ...metric,
        trend: metric.trend as 'up' | 'down' | 'stable' | undefined,
        metadata: metric.metadata || undefined
      })));
    } catch (err: any) {
      console.error('Failed to fetch KPI metrics:', err);
      setError(err.message);
      toast({
        title: "Error Loading KPI Metrics",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-kpis');

      if (error) {
        console.error('Error calculating KPIs:', error);
        throw error;
      }

      if (data?.success) {
        await fetchKPIMetrics(); // Refresh the metrics
        toast({
          title: "KPIs Updated",
          description: "KPI metrics have been recalculated successfully.",
        });
      } else {
        throw new Error(data?.error || 'Failed to calculate KPIs');
      }
    } catch (err: any) {
      console.error('Failed to calculate KPIs:', err);
      toast({
        title: "Calculation Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchKPIMetrics();
  }, []);

  return {
    metrics,
    loading,
    error,
    fetchKPIMetrics,
    calculateKPIs,
    refresh: fetchKPIMetrics
  };
}