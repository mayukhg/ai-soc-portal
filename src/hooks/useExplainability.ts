/**
 * React Hook for Explainability Integration
 * Provides explainability functionality to React components
 */

import { useState, useEffect, useCallback } from 'react';
import { ExplainabilityIntegration, IntegratedMetrics, IntegratedAlert } from '../lib/explainability/explainability-integration';
import { EvaluationHarness } from '../lib/evaluation/evaluation-harness';
import { MonitoringScripts } from '../lib/evaluation/monitoring-scripts';

export interface UseExplainabilityConfig {
  enableRealTimeMonitoring: boolean;
  enableIntegratedAlerts: boolean;
  monitoringIntervalMs: number;
  explanationRetentionDays: number;
}

export interface ExplainabilityState {
  isMonitoring: boolean;
  integratedMetrics: IntegratedMetrics[];
  integratedAlerts: IntegratedAlert[];
  currentHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  isLoading: boolean;
  error: string | null;
}

export interface ExplainabilityActions {
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  explainModelPrediction: (
    modelId: string,
    input: Record<string, any>,
    model: (input: Record<string, any>) => Promise<number>
  ) => Promise<any>;
  generateIntegratedMetrics: () => Promise<IntegratedMetrics>;
  clearData: () => void;
  resetBaseline: () => void;
}

export function useExplainability(config?: Partial<UseExplainabilityConfig>): {
  state: ExplainabilityState;
  actions: ExplainabilityActions;
} {
  const [state, setState] = useState<ExplainabilityState>({
    isMonitoring: false,
    integratedMetrics: [],
    integratedAlerts: [],
    currentHealth: 'fair',
    isLoading: false,
    error: null,
  });

  const [explainabilityIntegration, setExplainabilityIntegration] = useState<ExplainabilityIntegration | null>(null);

  // Initialize explainability integration
  useEffect(() => {
    const initializeIntegration = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Initialize evaluation harness
        const evaluationHarness = new EvaluationHarness({
          enableAccuracyTesting: true,
          enableLatencyTesting: true,
          enableHallucinationDetection: true,
          testDatasetSize: 100,
          maxConcurrentTests: 5,
          timeoutMs: 30000,
          retryAttempts: 3,
        });

        // Initialize monitoring scripts
        const monitoringScripts = new MonitoringScripts(evaluationHarness, {
          enableRealTimeMonitoring: true,
          enablePerformanceAlerts: true,
          enableTrendAnalysis: true,
          monitoringIntervalMs: 60000,
          alertThresholds: {
            minAccuracy: 0.8,
            maxLatencyMs: 5000,
            maxHallucinationRate: 0.1,
            minConfidenceScore: 0.7,
            maxErrorRate: 0.05,
          },
          retentionDays: 7,
          enableMetricsExport: true,
        });

        // Initialize explainability integration
        const integration = new ExplainabilityIntegration(
          evaluationHarness,
          monitoringScripts,
          {
            explainabilityConfig: {
              enableLime: true,
              enableShap: true,
              monitoringIntervalMs: config?.monitoringIntervalMs || 300000,
              explanationRetentionDays: config?.explanationRetentionDays || 7,
              alertThresholds: {
                minConfidence: 0.7,
                maxFidelity: 0.8,
                minFeatureImportance: 0.1,
                maxExplanationTimeMs: 10000,
                minConsistencyScore: 0.6,
              },
            },
            enableIntegratedAlerts: config?.enableIntegratedAlerts ?? true,
            enableCrossValidation: true,
            enableTrendAnalysis: true,
            alertIntegrationThresholds: {
              minOverallScore: 0.8,
              maxExplanationDrift: 0.2,
              minModelStability: 0.7,
              maxPerformanceDegradation: 0.15,
            },
          }
        );

        setExplainabilityIntegration(integration);
        setState(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize explainability integration',
        }));
      }
    };

    initializeIntegration();
  }, [config]);

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    if (!explainabilityIntegration) {
      setState(prev => ({ ...prev, error: 'Explainability integration not initialized' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await explainabilityIntegration.startIntegratedMonitoring();
      setState(prev => ({ ...prev, isMonitoring: true, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start monitoring',
      }));
    }
  }, [explainabilityIntegration]);

  // Stop monitoring
  const stopMonitoring = useCallback(async () => {
    if (!explainabilityIntegration) {
      setState(prev => ({ ...prev, error: 'Explainability integration not initialized' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await explainabilityIntegration.stopIntegratedMonitoring();
      setState(prev => ({ ...prev, isMonitoring: false, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to stop monitoring',
      }));
    }
  }, [explainabilityIntegration]);

  // Explain model prediction
  const explainModelPrediction = useCallback(async (
    modelId: string,
    input: Record<string, any>,
    model: (input: Record<string, any>) => Promise<number>
  ) => {
    if (!explainabilityIntegration) {
      throw new Error('Explainability integration not initialized');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const explanation = await explainabilityIntegration.explainModelPredictionWithMonitoring(
        modelId,
        input,
        model
      );
      setState(prev => ({ ...prev, isLoading: false }));
      return explanation;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to explain model prediction',
      }));
      throw error;
    }
  }, [explainabilityIntegration]);

  // Generate integrated metrics
  const generateIntegratedMetrics = useCallback(async () => {
    if (!explainabilityIntegration) {
      throw new Error('Explainability integration not initialized');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const metrics = await explainabilityIntegration.generateIntegratedMetrics();
      
      // Update state with new metrics
      setState(prev => ({
        ...prev,
        integratedMetrics: [...prev.integratedMetrics, metrics],
        currentHealth: metrics.overallHealth,
        isLoading: false,
      }));
      
      return metrics;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to generate integrated metrics',
      }));
      throw error;
    }
  }, [explainabilityIntegration]);

  // Clear data
  const clearData = useCallback(() => {
    if (!explainabilityIntegration) {
      setState(prev => ({ ...prev, error: 'Explainability integration not initialized' }));
      return;
    }

    try {
      explainabilityIntegration.clearData();
      setState(prev => ({
        ...prev,
        integratedMetrics: [],
        integratedAlerts: [],
        currentHealth: 'fair',
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear data',
      }));
    }
  }, [explainabilityIntegration]);

  // Reset baseline
  const resetBaseline = useCallback(() => {
    if (!explainabilityIntegration) {
      setState(prev => ({ ...prev, error: 'Explainability integration not initialized' }));
      return;
    }

    try {
      explainabilityIntegration.resetBaselineMetrics();
      setState(prev => ({ ...prev, error: null }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to reset baseline',
      }));
    }
  }, [explainabilityIntegration]);

  // Update metrics and alerts periodically
  useEffect(() => {
    if (!explainabilityIntegration || !state.isMonitoring) return;

    const updateMetrics = async () => {
      try {
        const metrics = explainabilityIntegration.getIntegratedMetrics();
        const alerts = explainabilityIntegration.getIntegratedAlerts();
        
        setState(prev => ({
          ...prev,
          integratedMetrics: metrics,
          integratedAlerts: alerts,
          currentHealth: metrics.length > 0 ? metrics[metrics.length - 1].overallHealth : 'fair',
        }));
      } catch (error) {
        console.error('Error updating metrics:', error);
      }
    };

    const interval = setInterval(updateMetrics, config?.monitoringIntervalMs || 300000);
    return () => clearInterval(interval);
  }, [explainabilityIntegration, state.isMonitoring, config?.monitoringIntervalMs]);

  const actions: ExplainabilityActions = {
    startMonitoring,
    stopMonitoring,
    explainModelPrediction,
    generateIntegratedMetrics,
    clearData,
    resetBaseline,
  };

  return { state, actions };
}
