import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AIMessage {
  id: string;
  user_id: string;
  session_id: string;
  message_type: 'user' | 'assistant';
  content: string;
  context_type?: 'general' | 'incident' | 'alert' | 'threat_hunting' | 'vulnerability_analysis' | 'threat_intelligence' | 'forensic_analysis';
  context_id?: string;
  metadata?: {
    confidence_score?: number;
    threat_level?: 'low' | 'medium' | 'high' | 'critical';
    analysis_type?: string;
    iocs?: string[];
    recommendations?: string[];
    risk_factors?: string[];
  };
  created_at: string;
}

export function useAIAssistant() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setCurrentSessionId(crypto.randomUUID());
      loadMessageHistory();
    }
  }, [user]);

  const loadMessageHistory = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error loading message history:', error);
        throw error;
      }

      setMessages((data || []).map(msg => ({
        ...msg,
        message_type: msg.message_type as 'user' | 'assistant',
        context_type: msg.context_type as 'general' | 'incident' | 'alert' | 'threat_hunting' | undefined,
        context_id: msg.context_id || undefined,
        metadata: msg.metadata || undefined
      })));
    } catch (err: any) {
      console.error('Failed to load message history:', err);
      setError(err.message);
    }
  };

  const sendMessage = async (
    message: string, 
    contextType?: string, 
    contextId?: string
  ) => {
    if (!user || !message.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Add user message to local state immediately
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        user_id: user.id,
        session_id: currentSessionId,
        message_type: 'user',
        content: message.trim(),
        context_type: contextType as any,
        context_id: contextId,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);

      // Send to AI assistant
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: message.trim(),
          sessionId: currentSessionId,
          contextType,
          contextId,
          userId: user.id
        }
      });

      if (error) {
        console.error('AI assistant error:', error);
        throw error;
      }

      if (data?.success) {
        // Add AI response to local state
        const aiMessage: AIMessage = {
          id: crypto.randomUUID(),
          user_id: user.id,
          session_id: currentSessionId,
          message_type: 'assistant',
          content: data.message,
          context_type: contextType as any,
          context_id: contextId,
          created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data?.error || 'Failed to get AI response');
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message);
      toast({
        title: "AI Assistant Error",
        description: err.message,
        variant: "destructive",
      });

      // Remove the user message from local state if AI failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    setCurrentSessionId(crypto.randomUUID());
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearHistory,
    refresh: loadMessageHistory
  };
}