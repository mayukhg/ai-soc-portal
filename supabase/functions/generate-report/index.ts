import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
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
    const { 
      reportType, 
      templateId, 
      customSections = [], 
      title, 
      description, 
      generatedBy,
      generatedFor = ['all'],
      timeRange = '7d'
    } = await req.json();

    if (!reportType || !generatedBy) {
      throw new Error('Report type and generated_by are required');
    }

    console.log('Generating report:', { reportType, title, timeRange });

    // Create report record
    const { data: reportRecord, error: reportError } = await supabase
      .from('reports')
      .insert({
        title: title || `${reportType} Report`,
        report_type: reportType,
        template_id: templateId,
        generated_by: generatedBy,
        generated_for: generatedFor,
        status: 'generating',
        content: { sections: customSections, timeRange }
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating report record:', reportError);
      throw reportError;
    }

    // Gather data based on report type and time range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '24h':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    // Fetch relevant data
    const [
      { data: incidents },
      { data: alerts },
      { data: kpiMetrics },
      { data: threatIntel }
    ] = await Promise.all([
      supabase
        .from('incidents')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      supabase
        .from('alerts')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      supabase
        .from('kpi_metrics')
        .select('*')
        .gte('period_start', startDate.toISOString())
        .order('calculated_at', { ascending: false }),
      
      supabase
        .from('threat_intelligence')
        .select('*')
        .eq('is_active', true)
        .gte('created_at', startDate.toISOString())
    ]);

    // Generate report content based on type
    let reportContent = '';
    const reportData = {
      incidents: incidents || [],
      alerts: alerts || [],
      kpiMetrics: kpiMetrics || [],
      threatIntel: threatIntel || [],
      timeRange,
      generatedAt: new Date().toISOString()
    };

    if (reportType === 'executive_summary') {
      reportContent = await generateExecutiveSummary(reportData);
    } else if (reportType === 'incident_summary') {
      reportContent = await generateIncidentSummary(reportData);
    } else if (reportType === 'threat_analysis') {
      reportContent = await generateThreatAnalysis(reportData);
    } else if (reportType === 'performance_metrics') {
      reportContent = await generatePerformanceReport(reportData);
    } else if (reportType === 'custom') {
      reportContent = await generateCustomReport(reportData, customSections);
    } else {
      throw new Error(`Unsupported report type: ${reportType}`);
    }

    // Update report with generated content
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'completed',
        content: {
          ...reportRecord.content,
          report_content: reportContent,
          data_summary: {
            incidents_count: reportData.incidents.length,
            alerts_count: reportData.alerts.length,
            threat_indicators: reportData.threatIntel.length
          }
        }
      })
      .eq('id', reportRecord.id);

    if (updateError) {
      console.error('Error updating report:', updateError);
      throw updateError;
    }

    console.log('Report generated successfully:', reportRecord.id);

    return new Response(JSON.stringify({
      success: true,
      reportId: reportRecord.id,
      content: reportContent,
      summary: {
        incidents: reportData.incidents.length,
        alerts: reportData.alerts.length,
        threatIndicators: reportData.threatIntel.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-report function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateExecutiveSummary(data: any): Promise<string> {
  const criticalIncidents = data.incidents.filter((i: any) => i.severity === 'critical').length;
  const criticalAlerts = data.alerts.filter((a: any) => a.severity === 'critical').length;
  const resolutionRate = data.alerts.filter((a: any) => a.status === 'resolved').length / Math.max(data.alerts.length, 1) * 100;

  const prompt = `Generate an executive summary for a security report with the following data:
  - Time Range: ${data.timeRange}
  - Total Incidents: ${data.incidents.length} (Critical: ${criticalIncidents})
  - Total Alerts: ${data.alerts.length} (Critical: ${criticalAlerts})
  - Resolution Rate: ${resolutionRate.toFixed(1)}%
  - Active Threat Indicators: ${data.threatIntel.length}
  
  Focus on business impact, risk assessment, and high-level recommendations for executive audience.`;

  return await generateWithAI(prompt);
}

async function generateIncidentSummary(data: any): Promise<string> {
  const incidentsByStatus = data.incidents.reduce((acc: any, inc: any) => {
    acc[inc.status] = (acc[inc.status] || 0) + 1;
    return acc;
  }, {});

  const prompt = `Generate a detailed incident summary report with the following data:
  - Total Incidents: ${data.incidents.length}
  - Status Breakdown: ${JSON.stringify(incidentsByStatus)}
  - Time Range: ${data.timeRange}
  
  Include incident analysis, patterns, response effectiveness, and technical recommendations.`;

  return await generateWithAI(prompt);
}

async function generateThreatAnalysis(data: any): Promise<string> {
  const threatTypes = data.threatIntel.reduce((acc: any, threat: any) => {
    acc[threat.threat_type] = (acc[threat.threat_type] || 0) + 1;
    return acc;
  }, {});

  const prompt = `Generate a threat intelligence analysis report with the following data:
  - Active Threat Indicators: ${data.threatIntel.length}
  - Threat Types: ${JSON.stringify(threatTypes)}
  - Time Range: ${data.timeRange}
  
  Focus on threat landscape, emerging threats, and strategic security recommendations.`;

  return await generateWithAI(prompt);
}

async function generatePerformanceReport(data: any): Promise<string> {
  const avgResponseTime = data.kpiMetrics.find((m: any) => m.metric_name.includes('Response'))?.current_value || 0;
  const detectionTime = data.kpiMetrics.find((m: any) => m.metric_name.includes('Detection'))?.current_value || 0;

  const prompt = `Generate a SOC performance metrics report with the following data:
  - Mean Time to Response: ${avgResponseTime} minutes
  - Mean Time to Detection: ${detectionTime} minutes
  - Total KPI Metrics: ${data.kpiMetrics.length}
  - Time Range: ${data.timeRange}
  
  Focus on operational efficiency, team performance, and improvement recommendations.`;

  return await generateWithAI(prompt);
}

async function generateCustomReport(data: any, sections: string[]): Promise<string> {
  const prompt = `Generate a custom security report with the following sections: ${sections.join(', ')}
  
  Data summary:
  - Incidents: ${data.incidents.length}
  - Alerts: ${data.alerts.length}
  - Threat Indicators: ${data.threatIntel.length}
  - Time Range: ${data.timeRange}
  
  Tailor the content to include each requested section with relevant analysis and recommendations.`;

  return await generateWithAI(prompt);
}

async function generateWithAI(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a cybersecurity expert generating professional security reports. Provide detailed, actionable analysis with proper formatting and structure.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI content:', error);
    return `Error generating report content: ${error.message}`;
  }
}