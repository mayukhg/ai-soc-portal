/**
 * React Hook for Evaluation Service
 * Integration with frontend components for AI model evaluation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EvaluationService, EvaluationReport, BenchmarkResult } from '../lib/evaluation/evaluation-service';

export interface UseEvaluationServiceReturn {
  // Service state
  isRunning: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Reports
  reports: EvaluationReport[];
  latestReport: EvaluationReport | null;
  
  // Benchmarks
  benchmarks: BenchmarkResult[];
  latestBenchmarks: BenchmarkResult[];
  
  // Service actions
  startService: () => Promise<void>;
  stopService: () => Promise<void>;
  runEvaluation: () => Promise<void>;
  generateReport: () => Promise<void>;
  runBenchmarking: () => Promise<void>;
  
  // Utility functions
  exportReport: (reportId: string, format: 'json' | 'html') => Promise<string>;
  getServiceStatus: () => any;
  
  // Configuration
  updateConfig: (config: any) => void;
  getConfig: () => any;
}

export const useEvaluationService = (): UseEvaluationServiceReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<EvaluationReport[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);
  
  const evaluationServiceRef = useRef<EvaluationService | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize evaluation service
  useEffect(() => {
    try {
      evaluationServiceRef.current = new EvaluationService({
        evaluation: {
          enableAccuracyTesting: true,
          enableLatencyTesting: true,
          enableHallucinationDetection: true,
          testDatasetSize: 50, // Smaller for frontend
          maxConcurrentTests: 3,
          timeoutMs: 15000,
          retryAttempts: 2,
        },
        monitoring: {
          enableRealTimeMonitoring: true,
          enablePerformanceAlerts: true,
          enableTrendAnalysis: true,
          monitoringIntervalMs: 30000, // 30 seconds for frontend
          alertThresholds: {
            minAccuracy: 0.8,
            maxLatencyMs: 5000,
            maxHallucinationRate: 0.1,
            minConfidenceScore: 0.7,
            maxErrorRate: 0.05,
          },
          retentionDays: 3,
          enableMetricsExport: true,
        },
        enableContinuousEvaluation: true,
        enableAutomatedReporting: true,
        reportIntervalHours: 1, // 1 hour for frontend
        enableBenchmarking: true,
        benchmarkModels: ['gpt-4', 'gpt-3.5-turbo'],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize evaluation service');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Start service
  const startService = useCallback(async () => {
    if (!evaluationServiceRef.current) {
      setError('Evaluation service not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await evaluationServiceRef.current.startService();
      setIsRunning(true);
      
      // Start periodic updates
      intervalRef.current = setInterval(async () => {
        try {
          const serviceStatus = evaluationServiceRef.current?.getServiceStatus();
          if (serviceStatus) {
            setReports(serviceStatus.reportsCount > 0 ? evaluationServiceRef.current!.getReports() : []);
            setBenchmarks(serviceStatus.benchmarksCount > 0 ? evaluationServiceRef.current!.getBenchmarks() : []);
          }
        } catch (err) {
          console.error('Failed to update service status:', err);
        }
      }, 5000); // Update every 5 seconds
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start service');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stop service
  const stopService = useCallback(async () => {
    if (!evaluationServiceRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await evaluationServiceRef.current.stopService();
      setIsRunning(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop service');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run evaluation
  const runEvaluation = useCallback(async () => {
    if (!evaluationServiceRef.current) {
      setError('Evaluation service not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await evaluationServiceRef.current.runEvaluation();
      
      // Update reports after evaluation
      const updatedReports = evaluationServiceRef.current.getReports();
      setReports(updatedReports);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate report
  const generateReport = useCallback(async () => {
    if (!evaluationServiceRef.current) {
      setError('Evaluation service not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const report = await evaluationServiceRef.current.generateReport();
      
      // Update reports
      const updatedReports = evaluationServiceRef.current.getReports();
      setReports(updatedReports);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run benchmarking
  const runBenchmarking = useCallback(async () => {
    if (!evaluationServiceRef.current) {
      setError('Evaluation service not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const benchmarkResults = await evaluationServiceRef.current.runBenchmarking();
      
      // Update benchmarks
      const updatedBenchmarks = evaluationServiceRef.current.getBenchmarks();
      setBenchmarks(updatedBenchmarks);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benchmarking failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Export report
  const exportReport = useCallback(async (reportId: string, format: 'json' | 'html'): Promise<string> => {
    if (!evaluationServiceRef.current) {
      throw new Error('Evaluation service not initialized');
    }

    return await evaluationServiceRef.current.exportReport(reportId, format);
  }, []);

  // Get service status
  const getServiceStatus = useCallback(() => {
    if (!evaluationServiceRef.current) {
      return null;
    }

    return evaluationServiceRef.current.getServiceStatus();
  }, []);

  // Update configuration
  const updateConfig = useCallback((config: any) => {
    if (!evaluationServiceRef.current) {
      setError('Evaluation service not initialized');
      return;
    }

    try {
      evaluationServiceRef.current.updateConfig(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    }
  }, []);

  // Get configuration
  const getConfig = useCallback(() => {
    if (!evaluationServiceRef.current) {
      return null;
    }

    return evaluationServiceRef.current.getConfig();
  }, []);

  // Get latest report
  const latestReport = reports.length > 0 ? reports[0] : null;

  // Get latest benchmarks
  const latestBenchmarks = evaluationServiceRef.current?.getLatestBenchmarks() || [];

  return {
    // Service state
    isRunning,
    isLoading,
    error,
    
    // Reports
    reports,
    latestReport,
    
    // Benchmarks
    benchmarks,
    latestBenchmarks,
    
    // Service actions
    startService,
    stopService,
    runEvaluation,
    generateReport,
    runBenchmarking,
    
    // Utility functions
    exportReport,
    getServiceStatus,
    
    // Configuration
    updateConfig,
    getConfig,
  };
};
