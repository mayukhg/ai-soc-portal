import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
  source: string;
  alert_type: string;
  source_ip?: string;
  destination_ip?: string;
  affected_systems?: string[];
  indicators?: string[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  metadata?: any;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAlerts = async (filters: any = {}) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('get-alerts', {
        body: { filters, limit: 50, offset: 0 }
      });

      if (error) {
        console.error('Error fetching alerts:', error);
        throw error;
      }

      if (data?.success) {
        setAlerts(data.data || []);
      } else {
        throw new Error(data?.error || 'Failed to fetch alerts');
      }
    } catch (err: any) {
      console.error('Failed to fetch alerts:', err);
      setError(err.message);
      toast({
        title: "Error Loading Alerts",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAlertStatus = async (alertId: string, status: string, assignedTo?: string) => {
    try {
      const updateData: any = { status };
      if (assignedTo) updateData.assigned_to = assignedTo;

      const { error } = await supabase
        .from('alerts')
        .update(updateData)
        .eq('id', alertId);

      if (error) {
        console.error('Error updating alert:', error);
        throw error;
      }

      // Refresh alerts
      await fetchAlerts();
      
      toast({
        title: "Alert Updated",
        description: "Alert status has been updated successfully.",
      });
    } catch (err: any) {
      console.error('Failed to update alert:', err);
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return {
    alerts,
    loading,
    error,
    fetchAlerts,
    updateAlertStatus,
    refresh: fetchAlerts
  };
}