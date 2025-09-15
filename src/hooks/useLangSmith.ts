/**
 * React Hook for LangSmith Integration
 * Provides easy access to LangSmith tracing and monitoring capabilities
 * 
 * This hook enables:
 * - Automatic tracing of React component interactions
 * - Performance monitoring of AI operations
 * - Error tracking and debugging
 * - Custom metrics collection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LangSmithService, 
  LangSmithConfig, 
  TraceMetadata, 
  PerformanceMetrics,
  EvaluationResult,
  SOCWorkflowTrace 
} from '../lib/langsmith/langsmith-service';

export interface UseLangSmithReturn {
  // Service state
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Active traces
  activeTraces: SOCWorkflowTrace[];
  currentTraceId: string | null;
  
  // Service actions
  startWorkflowTrace: (workflowType: SOCWorkflowTrace['workflowType'], metadata?: TraceMetadata) => Promise<string>;
  startPhaseTrace: (phaseName: string, agentType?: string) => Promise<void>;
  completePhaseTrace: (phaseName: string, metrics?: any) => Promise<void>;
  completeWorkflowTrace: (status?: 'completed' | 'failed' | 'cancelled', finalMetrics?: Partial<PerformanceMetrics>) => Promise<void>;
  
  // Custom events and metrics
  logCustomEvent: (eventName: string, data: Record<string, any>, level?: 'info' | 'warn' | 'error') => Promise<void>;
  
  // Evaluations and analytics
  runEvaluations: (evaluationTypes: Array<'accuracy' | 'latency' | 'cost' | 'security_relevance'>) => Promise<EvaluationResult[]>;
  getPerformanceAnalytics: (startDate: Date, endDate: Date, workflowType?: string) => Promise<any>;
  
  // Configuration
  updateConfig: (config: Partial<LangSmithConfig>) => void;
  getServiceStatus: () => any;
  
  // Utility functions
  exportTraces: (format: 'json' | 'csv') => Promise<string>;
}

export const useLangSmith = (initialConfig?: Partial<LangSmithConfig>): UseLangSmithReturn => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTraces, setActiveTraces] = useState<SOCWorkflowTrace[]>([]);
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
  
  const langSmithServiceRef = useRef<LangSmithService | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize LangSmith service
  useEffect(() => {
    const initializeService = async () => {
      try {
        // Default configuration
        const defaultConfig: LangSmithConfig = {
          apiKey: process.env.REACT_APP_LANGSMITH_API_KEY || '',
          projectName: process.env.REACT_APP_LANGSMITH_PROJECT || 'ai-soc-portal',
          environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
          enableTracing: true,
          enableEvaluations: true,
          enableCustomMetrics: true,
          samplingRate: 1.0,
          retentionDays: 30,
          enableErrorTracking: true,
          enablePerformanceMonitoring: true,
        };

        const config = { ...defaultConfig, ...initialConfig };
        
        if (!config.apiKey) {
          setError('LangSmith API key is required');
          return;
        }

        langSmithServiceRef.current = new LangSmithService(config);
        setIsEnabled(true);
        
        // Start periodic updates for active traces
        intervalRef.current = setInterval(() => {
          if (langSmithServiceRef.current) {
            const traces = langSmithServiceRef.current.getActiveTraces();
            setActiveTraces(traces);
          }
        }, 1000); // Update every second
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize LangSmith service');
        setIsEnabled(false);
      }
    };

    initializeService();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [initialConfig]);

  // Start workflow trace
  const startWorkflowTrace = useCallback(async (
    workflowType: SOCWorkflowTrace['workflowType'],
    metadata: TraceMetadata = {}
  ): Promise<string> => {
    if (!langSmithServiceRef.current) {
      throw new Error('LangSmith service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const traceId = await langSmithServiceRef.current.startWorkflowTrace(workflowType, metadata);
      setCurrentTraceId(traceId);
      
      // Update active traces
      const traces = langSmithServiceRef.current.getActiveTraces();
      setActiveTraces(traces);
      
      return traceId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start workflow trace';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start phase trace
  const startPhaseTrace = useCallback(async (
    phaseName: string,
    agentType?: string
  ): Promise<void> => {
    if (!langSmithServiceRef.current || !currentTraceId) {
      throw new Error('LangSmith service not initialized or no active trace');
    }

    try {
      await langSmithServiceRef.current.startPhaseTrace(currentTraceId, phaseName, agentType);
      
      // Update active traces
      const traces = langSmithServiceRef.current.getActiveTraces();
      setActiveTraces(traces);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start phase trace';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentTraceId]);

  // Complete phase trace
  const completePhaseTrace = useCallback(async (
    phaseName: string,
    metrics: {
      inputTokens?: number;
      outputTokens?: number;
      latencyMs?: number;
      error?: string;
    } = {}
  ): Promise<void> => {
    if (!langSmithServiceRef.current || !currentTraceId) {
      throw new Error('LangSmith service not initialized or no active trace');
    }

    try {
      await langSmithServiceRef.current.completePhaseTrace(currentTraceId, phaseName, metrics);
      
      // Update active traces
      const traces = langSmithServiceRef.current.getActiveTraces();
      setActiveTraces(traces);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete phase trace';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentTraceId]);

  // Complete workflow trace
  const completeWorkflowTrace = useCallback(async (
    status: 'completed' | 'failed' | 'cancelled' = 'completed',
    finalMetrics?: Partial<PerformanceMetrics>
  ): Promise<void> => {
    if (!langSmithServiceRef.current || !currentTraceId) {
      throw new Error('LangSmith service not initialized or no active trace');
    }

    setIsLoading(true);
    setError(null);

    try {
      await langSmithServiceRef.current.completeWorkflowTrace(currentTraceId, status, finalMetrics);
      setCurrentTraceId(null);
      
      // Update active traces
      const traces = langSmithServiceRef.current.getActiveTraces();
      setActiveTraces(traces);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete workflow trace';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentTraceId]);

  // Log custom event
  const logCustomEvent = useCallback(async (
    eventName: string,
    data: Record<string, any>,
    level: 'info' | 'warn' | 'error' = 'info'
  ): Promise<void> => {
    if (!langSmithServiceRef.current || !currentTraceId) {
      throw new Error('LangSmith service not initialized or no active trace');
    }

    try {
      await langSmithServiceRef.current.logCustomEvent(currentTraceId, eventName, data, level);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log custom event';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentTraceId]);

  // Run evaluations
  const runEvaluations = useCallback(async (
    evaluationTypes: Array<'accuracy' | 'latency' | 'cost' | 'security_relevance'>
  ): Promise<EvaluationResult[]> => {
    if (!langSmithServiceRef.current) {
      throw new Error('LangSmith service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const traceIds = activeTraces.map(trace => trace.traceId);
      const results = await langSmithServiceRef.current.runEvaluations(traceIds, evaluationTypes);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run evaluations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [activeTraces]);

  // Get performance analytics
  const getPerformanceAnalytics = useCallback(async (
    startDate: Date,
    endDate: Date,
    workflowType?: string
  ): Promise<any> => {
    if (!langSmithServiceRef.current) {
      throw new Error('LangSmith service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const analytics = await langSmithServiceRef.current.getPerformanceAnalytics(
        startDate,
        endDate,
        workflowType
      );
      return analytics;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get performance analytics';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update configuration
  const updateConfig = useCallback((config: Partial<LangSmithConfig>) => {
    if (!langSmithServiceRef.current) {
      setError('LangSmith service not initialized');
      return;
    }

    try {
      langSmithServiceRef.current.updateConfig(config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration';
      setError(errorMessage);
    }
  }, []);

  // Get service status
  const getServiceStatus = useCallback(() => {
    if (!langSmithServiceRef.current) {
      return null;
    }

    return langSmithServiceRef.current.getServiceStatus();
  }, []);

  // Export traces
  const exportTraces = useCallback(async (format: 'json' | 'csv'): Promise<string> => {
    if (!langSmithServiceRef.current) {
      throw new Error('LangSmith service not initialized');
    }

    try {
      const traceIds = activeTraces.map(trace => trace.traceId);
      const exportedData = await langSmithServiceRef.current.exportTraces(traceIds, format);
      return exportedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export traces';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [activeTraces]);

  return {
    // Service state
    isEnabled,
    isLoading,
    error,
    
    // Active traces
    activeTraces,
    currentTraceId,
    
    // Service actions
    startWorkflowTrace,
    startPhaseTrace,
    completePhaseTrace,
    completeWorkflowTrace,
    
    // Custom events and metrics
    logCustomEvent,
    
    // Evaluations and analytics
    runEvaluations,
    getPerformanceAnalytics,
    
    // Configuration
    updateConfig,
    getServiceStatus,
    
    // Utility functions
    exportTraces,
  };
};
