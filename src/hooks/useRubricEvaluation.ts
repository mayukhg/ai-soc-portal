/**
 * useRubricEvaluation Hook
 * React hook for integrating LLM Rubric Framework with frontend components
 * 
 * This hook provides:
 * - Easy integration with React components
 * - Real-time evaluation status and results
 * - Performance monitoring and alerts
 * - Comprehensive evaluation reporting
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RubricIntegrationService, ComprehensiveEvaluationResult, RubricBenchmarkResult } from '../lib/rubric/rubric-integration-service';
import { EvaluationService } from '../lib/evaluation/evaluation-service';
import { RAGASService } from '../lib/ragas/ragas-service';
import { LangSmithService } from '../lib/langsmith/langsmith-service';

export interface UseRubricEvaluationConfig {
  enableRealTimeEvaluation: boolean;
  enablePerformanceMonitoring: boolean;
  enableAlerts: boolean;
  evaluationIntervalMs: number;
  alertThresholds: {
    minOverallScore: number;
    minCategoryScore: number;
    maxEvaluationTimeMs: number;
  };
}

export interface UseRubricEvaluationReturn {
  // State
  isEvaluating: boolean;
  isLoading: boolean;
  error: string | null;
  evaluationResults: ComprehensiveEvaluationResult[];
  benchmarkResults: RubricBenchmarkResult[];
  currentEvaluation?: ComprehensiveEvaluationResult;
  
  // Actions
  evaluateResponse: (
    response: string,
    context: {
      inputType: 'threat_analysis' | 'incident_response' | 'risk_assessment' | 'correlation_analysis' | 'general_query';
      question?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      userId?: string;
      sessionId?: string;
      traceId?: string;
      metadata?: Record<string, any>;
    }
  ) => Promise<ComprehensiveEvaluationResult>;
  
  evaluateBatch: (
    responses: Array<{
      response: string;
      context: {
        inputType: 'threat_analysis' | 'incident_response' | 'risk_assessment' | 'correlation_analysis' | 'general_query';
        question?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        userId?: string;
        sessionId?: string;
        traceId?: string;
        metadata?: Record<string, any>;
      };
    }>
  ) => Promise<ComprehensiveEvaluationResult[]>;
  
  generateBenchmark: (
    timeRange: { start: Date; end: Date },
    modelName?: string
  ) => Promise<RubricBenchmarkResult>;
  
  generateReport: (
    timeRange: { start: Date; end: Date },
    includeRecommendations?: boolean
  ) => Promise<any>;
  
  clearResults: () => void;
  exportResults: (format: 'json' | 'csv') => string;
  
  // Status
  getServiceStatus: () => {
    isEnabled: boolean;
    evaluationCount: number;
    benchmarkCount: number;
    averageScore: number;
    lastEvaluationTime?: Date;
  };
  
  // Configuration
  updateConfig: (config: Partial<UseRubricEvaluationConfig>) => void;
  getConfig: () => UseRubricEvaluationConfig;
}

export function useRubricEvaluation(
  config?: Partial<UseRubricEvaluationConfig>,
  evaluationService?: EvaluationService,
  ragasService?: RAGASService,
  langSmithService?: LangSmithService
): UseRubricEvaluationReturn {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluationResults, setEvaluationResults] = useState<ComprehensiveEvaluationResult[]>([]);
  const [benchmarkResults, setBenchmarkResults] = useState<RubricBenchmarkResult[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<ComprehensiveEvaluationResult | undefined>();

  const rubricServiceRef = useRef<RubricIntegrationService | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize rubric service
  useEffect(() => {
    const initializeService = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const defaultConfig: UseRubricEvaluationConfig = {
          enableRealTimeEvaluation: true,
          enablePerformanceMonitoring: true,
          enableAlerts: true,
          evaluationIntervalMs: 300000, // 5 minutes
          alertThresholds: {
            minOverallScore: 0.7,
            minCategoryScore: 0.6,
            maxEvaluationTimeMs: 30000,
          },
        };

        const finalConfig = { ...defaultConfig, ...config };

        rubricServiceRef.current = new RubricIntegrationService(
          {
            enableRubricEvaluation: finalConfig.enableRealTimeEvaluation,
            enableRAGASIntegration: !!ragasService,
            enableLangSmithIntegration: !!langSmithService,
            enableAutomatedScoring: true,
            enablePerformanceComparison: true,
            evaluationIntervalMs: finalConfig.evaluationIntervalMs,
            reportGenerationIntervalMs: 3600000, // 1 hour
            enableRealTimeMonitoring: finalConfig.enablePerformanceMonitoring,
            alertThresholds: finalConfig.alertThresholds,
          },
          evaluationService,
          ragasService,
          langSmithService
        );

        // Set up periodic evaluation if enabled
        if (finalConfig.enableRealTimeEvaluation && finalConfig.evaluationIntervalMs > 0) {
          intervalRef.current = setInterval(() => {
            // Periodic evaluation logic would go here
            // For now, we'll just log that the interval is running
            console.log('Periodic evaluation interval triggered');
          }, finalConfig.evaluationIntervalMs);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize rubric evaluation service');
      } finally {
        setIsLoading(false);
      }
    };

    initializeService();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [config, evaluationService, ragasService, langSmithService]);

  // Evaluate a single response
  const evaluateResponse = useCallback(async (
    response: string,
    context: {
      inputType: 'threat_analysis' | 'incident_response' | 'risk_assessment' | 'correlation_analysis' | 'general_query';
      question?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      userId?: string;
      sessionId?: string;
      traceId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<ComprehensiveEvaluationResult> => {
    if (!rubricServiceRef.current) {
      throw new Error('Rubric evaluation service not initialized');
    }

    try {
      setIsEvaluating(true);
      setError(null);

      const result = await rubricServiceRef.current.evaluateLLMResponse(response, context);
      
      setCurrentEvaluation(result);
      setEvaluationResults(prev => [...prev, result]);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Evaluation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsEvaluating(false);
    }
  }, []);

  // Evaluate multiple responses in batch
  const evaluateBatch = useCallback(async (
    responses: Array<{
      response: string;
      context: {
        inputType: 'threat_analysis' | 'incident_response' | 'risk_assessment' | 'correlation_analysis' | 'general_query';
        question?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        userId?: string;
        sessionId?: string;
        traceId?: string;
        metadata?: Record<string, any>;
      };
    }>
  ): Promise<ComprehensiveEvaluationResult[]> => {
    if (!rubricServiceRef.current) {
      throw new Error('Rubric evaluation service not initialized');
    }

    try {
      setIsEvaluating(true);
      setError(null);

      const results = await rubricServiceRef.current.evaluateBatch(responses);
      
      setEvaluationResults(prev => [...prev, ...results]);

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch evaluation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsEvaluating(false);
    }
  }, []);

  // Generate performance benchmark
  const generateBenchmark = useCallback(async (
    timeRange: { start: Date; end: Date },
    modelName?: string
  ): Promise<RubricBenchmarkResult> => {
    if (!rubricServiceRef.current) {
      throw new Error('Rubric evaluation service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const benchmark = await rubricServiceRef.current.generateBenchmark(timeRange, modelName);
      
      setBenchmarkResults(prev => [...prev, benchmark]);

      return benchmark;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Benchmark generation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate comprehensive report
  const generateReport = useCallback(async (
    timeRange: { start: Date; end: Date },
    includeRecommendations: boolean = true
  ): Promise<any> => {
    if (!rubricServiceRef.current) {
      throw new Error('Rubric evaluation service not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const report = await rubricServiceRef.current.generateEvaluationReport(timeRange, includeRecommendations);

      return report;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Report generation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear all results
  const clearResults = useCallback(() => {
    if (rubricServiceRef.current) {
      rubricServiceRef.current.clearResults();
    }
    setEvaluationResults([]);
    setBenchmarkResults([]);
    setCurrentEvaluation(undefined);
    setError(null);
  }, []);

  // Export results
  const exportResults = useCallback((format: 'json' | 'csv'): string => {
    if (!rubricServiceRef.current) {
      throw new Error('Rubric evaluation service not initialized');
    }

    return rubricServiceRef.current.exportResults(format);
  }, []);

  // Get service status
  const getServiceStatus = useCallback(() => {
    if (!rubricServiceRef.current) {
      return {
        isEnabled: false,
        evaluationCount: 0,
        benchmarkCount: 0,
        averageScore: 0,
        lastEvaluationTime: undefined,
      };
    }

    return rubricServiceRef.current.getServiceStatus();
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<UseRubricEvaluationConfig>) => {
    if (rubricServiceRef.current) {
      rubricServiceRef.current.updateConfig({
        enableRubricEvaluation: newConfig.enableRealTimeEvaluation,
        enableRAGASIntegration: !!ragasService,
        enableLangSmithIntegration: !!langSmithService,
        enableAutomatedScoring: true,
        enablePerformanceComparison: true,
        evaluationIntervalMs: newConfig.evaluationIntervalMs,
        reportGenerationIntervalMs: 3600000,
        enableRealTimeMonitoring: newConfig.enablePerformanceMonitoring,
        alertThresholds: newConfig.alertThresholds,
      });
    }
  }, [ragasService, langSmithService]);

  // Get current configuration
  const getConfig = useCallback((): UseRubricEvaluationConfig => {
    return {
      enableRealTimeEvaluation: true,
      enablePerformanceMonitoring: true,
      enableAlerts: true,
      evaluationIntervalMs: 300000,
      alertThresholds: {
        minOverallScore: 0.7,
        minCategoryScore: 0.6,
        maxEvaluationTimeMs: 30000,
      },
    };
  }, []);

  return {
    // State
    isEvaluating,
    isLoading,
    error,
    evaluationResults,
    benchmarkResults,
    currentEvaluation,
    
    // Actions
    evaluateResponse,
    evaluateBatch,
    generateBenchmark,
    generateReport,
    clearResults,
    exportResults,
    
    // Status
    getServiceStatus,
    
    // Configuration
    updateConfig,
    getConfig,
  };
}

