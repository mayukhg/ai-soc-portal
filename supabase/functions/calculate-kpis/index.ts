import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Calculating KPI metrics...');

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate alert metrics
    const { count: alertsLast24h } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24h.toISOString());

    const { count: alertsLast7d } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last7d.toISOString());

    const { count: criticalAlerts } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .gte('created_at', last24h.toISOString());

    const { count: resolvedAlerts } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved')
      .gte('created_at', last24h.toISOString());

    // Calculate incident metrics
    const { count: incidentsLast24h } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24h.toISOString());

    const { count: openIncidents } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'investigating']);

    // Calculate mean time to resolution (simplified)
    const { data: resolvedIncidents } = await supabase
      .from('incidents')
      .select('created_at, updated_at')
      .eq('status', 'resolved')
      .gte('created_at', last30d.toISOString());

    let avgResolutionTime = 0;
    if (resolvedIncidents && resolvedIncidents.length > 0) {
      const totalTime = resolvedIncidents.reduce((acc, incident) => {
        const created = new Date(incident.created_at);
        const resolved = new Date(incident.updated_at);
        return acc + (resolved.getTime() - created.getTime());
      }, 0);
      avgResolutionTime = totalTime / resolvedIncidents.length / (1000 * 60 * 60); // Convert to hours
    }

    // Calculate threat intelligence metrics
    const { count: activeThreatIndicators } = await supabase
      .from('threat_intelligence')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: newThreats } = await supabase
      .from('threat_intelligence')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24h.toISOString());

    const metrics = [
      {
        metric_name: 'Alerts Last 24h',
        metric_category: 'alerts',
        current_value: alertsLast24h || 0,
        previous_value: (alertsLast7d || 0) / 7, // Daily average for last week
        target_value: 50,
        unit: 'count',
        trend: (alertsLast24h || 0) > ((alertsLast7d || 0) / 7) ? 'up' : 'down',
        period_start: last24h.toISOString(),
        period_end: now.toISOString()
      },
      {
        metric_name: 'Critical Alerts',
        metric_category: 'alerts',
        current_value: criticalAlerts || 0,
        target_value: 5,
        unit: 'count',
        period_start: last24h.toISOString(),
        period_end: now.toISOString()
      },
      {
        metric_name: 'Resolution Rate',
        metric_category: 'resolution',
        current_value: (resolvedAlerts || 0) / Math.max(alertsLast24h || 1, 1) * 100,
        target_value: 95,
        unit: 'percentage',
        period_start: last24h.toISOString(),
        period_end: now.toISOString()
      },
      {
        metric_name: 'Open Incidents',
        metric_category: 'incidents',
        current_value: openIncidents || 0,
        target_value: 10,
        unit: 'count',
        period_start: last24h.toISOString(),
        period_end: now.toISOString()
      },
      {
        metric_name: 'Avg Resolution Time',
        metric_category: 'response_time',
        current_value: parseFloat(avgResolutionTime.toFixed(2)),
        target_value: 4,
        unit: 'hours',
        period_start: last30d.toISOString(),
        period_end: now.toISOString()
      },
      {
        metric_name: 'Active Threat Indicators',
        metric_category: 'threats',
        current_value: activeThreatIndicators || 0,
        unit: 'count',
        period_start: last24h.toISOString(),
        period_end: now.toISOString()
      },
      {
        metric_name: 'New Threats Detected',
        metric_category: 'threats',
        current_value: newThreats || 0,
        unit: 'count',
        period_start: last24h.toISOString(),
        period_end: now.toISOString()
      }
    ];

    // Clear old metrics and insert new ones
    await supabase
      .from('kpi_metrics')
      .delete()
      .gte('calculated_at', last24h.toISOString());

    const { error: insertError } = await supabase
      .from('kpi_metrics')
      .insert(metrics);

    if (insertError) {
      console.error('Error inserting KPI metrics:', insertError);
      throw insertError;
    }

    console.log(`Successfully calculated and stored ${metrics.length} KPI metrics`);

    return new Response(JSON.stringify({
      success: true,
      metrics,
      calculated_at: now.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-kpis function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});