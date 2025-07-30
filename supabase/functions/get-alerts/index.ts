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
    const { filters = {}, limit = 50, offset = 0 } = await req.json();

    console.log('Fetching alerts with filters:', filters);

    let query = supabase
      .from('alerts')
      .select(`
        *,
        assigned_profile:assigned_to(username, full_name, role)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.severity && filters.severity !== 'all') {
      query = query.eq('severity', filters.severity);
    }
    
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.assignee && filters.assignee !== 'all') {
      query = query.eq('assigned_to', filters.assignee);
    }

    if (filters.source && filters.source !== 'all') {
      query = query.eq('source', filters.source);
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      if (start) query = query.gte('created_at', start);
      if (end) query = query.lte('created_at', end);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: alerts, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting alerts count:', countError);
      throw countError;
    }

    console.log(`Fetched ${alerts?.length || 0} alerts`);

    return new Response(JSON.stringify({
      success: true,
      data: alerts || [],
      total: count || 0,
      offset,
      limit
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-alerts function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});