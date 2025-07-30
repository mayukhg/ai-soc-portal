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
    const { message, sessionId, contextType, contextId, userId } = await req.json();

    if (!message || !userId) {
      throw new Error('Message and userId are required');
    }

    console.log('AI Assistant request:', { message: message.substring(0, 100), userId, contextType });

    // Store user message
    await supabase.from('ai_interactions').insert({
      user_id: userId,
      session_id: sessionId || crypto.randomUUID(),
      message_type: 'user',
      content: message,
      context_type: contextType,
      context_id: contextId
    });

    // Get context if available
    let contextData = '';
    if (contextType && contextId) {
      if (contextType === 'incident') {
        const { data } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', contextId)
          .single();
        if (data) {
          contextData = `\nContext - Incident: ${data.title}\nDescription: ${data.description}\nSeverity: ${data.severity}\nStatus: ${data.status}`;
        }
      } else if (contextType === 'alert') {
        const { data } = await supabase
          .from('alerts')
          .select('*')
          .eq('id', contextId)
          .single();
        if (data) {
          contextData = `\nContext - Alert: ${data.title}\nDescription: ${data.description}\nSeverity: ${data.severity}\nSource: ${data.source}`;
        }
      }
    }

    // Generate AI response
    const systemPrompt = `You are a cybersecurity AI assistant for a Security Operations Center (SOC). You help analysts with:
    - Threat analysis and investigation
    - Incident response guidance
    - Security best practices
    - Alert triage and prioritization
    - Forensic analysis
    - Risk assessment
    
    Be concise, professional, and provide actionable insights. Focus on practical security recommendations.${contextData}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Store AI response
    await supabase.from('ai_interactions').insert({
      user_id: userId,
      session_id: sessionId || crypto.randomUUID(),
      message_type: 'assistant',
      content: assistantMessage,
      context_type: contextType,
      context_id: contextId
    });

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({
      success: true,
      message: assistantMessage,
      sessionId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});