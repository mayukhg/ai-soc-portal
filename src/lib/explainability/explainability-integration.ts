/**
 * Explainability Integration
 * Integrates explainability monitoring into existing monitoring pipelines
 */

import { Logger } from '../data-ingestion/utils/logger';
import { ExplainabilityMonitor, ExplainabilityConfig, ModelExplanation } from './explainability-monitor';
import { EvaluationHarness, EvaluationResult } from '../evaluation/evaluation-harness';
import { MonitoringScripts, PerformanceSnapshot } from '../evaluation/monitoring-scripts';

export interface IntegratedMonitoringConfig {
  explainabilityConfig: ExplainabilityConfig;
  enableIntegratedAlerts: boolean;
  enableCrossValidation: boolean;
  enableTrendAnalysis: boolean;
  alertIntegrationThresholds: IntegratedAlertThresholds;
}

export interface IntegratedAlertThresholds {
  minOverallScore: number;
  maxExplanationDrift: number;
  minModelStability: number;
  maxPerformanceDegradation: number;
}

export interface IntegratedMetrics {
  timestamp: Date;
  performanceMetrics: PerformanceSnapshot;
  explainabilityMetrics: {
    totalExplanations: number;
    avgConfidence: number;
    avgFidelity: number;
    explanationQuality: string;
  };
  integratedScore: number;
  modelStability: number;
  explanationDrift: number;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

export interface IntegratedAlert {
  id: string;
  type: 'performance_degradation' | 'explanation_drift' | 'model_instability' | 'integrated_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  performanceImpact: number;
  explainabilityImpact: number;
  recommendations: string[];
  resolved: boolean;
  resolvedAt?: Date;
}

export class ExplainabilityIntegration {
  private logger: Logger;
  private config: IntegratedMonitoringConfig;
  private explainabilityMonitor: ExplainabilityMonitor;
  private evaluationHarness: EvaluationHarness;
  private monitoringScripts: MonitoringScripts;
  private integratedMetrics: IntegratedMetrics[];
  private integratedAlerts: IntegratedAlert[];
  private baselineMetrics: IntegratedMetrics | null;

  constructor(
    evaluationHarness: EvaluationHarness,
    monitoringScripts: MonitoringScripts,
    config?: Partial<IntegratedMonitoringConfig>
  ) {
    this.logger = new Logger('ExplainabilityIntegration');
    this.evaluationHarness = evaluationHarness;
    this.monitoringScripts = monitoringScripts;
    this.config = {
      explainabilityConfig: {
        enableLime: true,
        enableShap: true,
        monitoringIntervalMs: 300000,
        explanationRetentionDays: 7,
        alertThresholds: {
          minConfidence: 0.7,
          maxFidelity: 0.8,
          minFeatureImportance: 0.1,
          maxExplanationTimeMs: 10000,
          minConsistencyScore: 0.6,
        },
      },
      enableIntegratedAlerts: true,
      enableCrossValidation: true,
      enableTrendAnalysis: true,
      alertIntegrationThresholds: {
        minOverallScore: 0.8,
        maxExplanationDrift: 0.2,
        minModelStability: 0.7,
        maxPerformanceDegradation: 0.15,
      },
    };
    this.integratedMetrics = [];
    this.integratedAlerts = [];
    this.baselineMetrics = null;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize explainability monitor
    this.explainabilityMonitor = new ExplainabilityMonitor(this.config.explainabilityConfig);
  }

  /**
   * Start integrated monitoring
   */
  async startIntegratedMonitoring(): Promise<void> {
    this.logger.info('Starting integrated explainability monitoring');
    
    // Start explainability monitoring
    await this.explainabilityMonitor.startMonitoring();
    
    // Start performance monitoring
    await this.monitoringScripts.startMonitoring();
    
    this.logger.info('Integrated monitoring started successfully');
  }

  /**
   * Stop integrated monitoring
   */
  async stopIntegratedMonitoring(): Promise<void> {
    this.logger.info('Stopping integrated explainability monitoring');
    
    // Stop explainability monitoring
    this.explainabilityMonitor.stopMonitoring();
    
    // Stop performance monitoring
    await this.monitoringScripts.stopMonitoring();
    
    this.logger.info('Integrated monitoring stopped successfully');
  }

  /**
   * Generate integrated metrics
   */
  async generateIntegratedMetrics(): Promise<IntegratedMetrics> {
    try {
      this.logger.info('Generating integrated metrics');
      
      // Get performance metrics
      const performanceSnapshots = this.monitoringScripts.getPerformanceSnapshots();
      const latestPerformance = performanceSnapshots[performanceSnapshots.length - 1];
      
      if (!latestPerformance) {
        throw new Error('No performance metrics available');
      }
      
      // Get explainability metrics
      const explainabilityMetrics = this.explainabilityMonitor.getMetrics();
      const latestExplainability = explainabilityMetrics[explainabilityMetrics.length - 1];
      
      if (!latestExplainability) {
        throw new Error('No explainability metrics available');
      }
      
      // Calculate integrated score
      const integratedScore = this.calculateIntegratedScore(latestPerformance, latestExplainability);
      
      // Calculate model stability
      const modelStability = this.calculateModelStability();
      
      // Calculate explanation drift
      const explanationDrift = this.calculateExplanationDrift();
      
      // Determine overall health
      const overallHealth = this.assessOverallHealth(integratedScore, modelStability, explanationDrift);
      
      const integratedMetric: IntegratedMetrics = {
        timestamp: new Date(),
        performanceMetrics: latestPerformance,
        explainabilityMetrics: {
          totalExplanations: latestExplainability.totalExplanations,
          avgConfidence: latestExplainability.avgConfidence,
          avgFidelity: latestExplainability.avgFidelity,
          explanationQuality: latestExplainability.explanationQuality,
        },
        integratedScore,
        modelStability,
        explanationDrift,
        overallHealth,
      };
      
      // Store metrics
      this.integratedMetrics.push(integratedMetric);
      
      // Set baseline if not set
      if (!this.baselineMetrics) {
        this.baselineMetrics = integratedMetric;
      }
      
      // Check for integrated alerts
      if (this.config.enableIntegratedAlerts) {
        await this.checkIntegratedAlerts(integratedMetric);
      }
      
      this.logger.info('Integrated metrics generated', {
        integratedScore,
        modelStability,
        explanationDrift,
        overallHealth,
      });
      
      return integratedMetric;
    } catch (error) {
      this.logger.error('Error generating integrated metrics', error);
      throw new Error(`Integrated metrics generation failed: ${error}`);
    }
  }

  /**
   * Explain model prediction with integrated monitoring
   */
  async explainModelPredictionWithMonitoring(
    modelId: string,
    input: Record<string, any>,
    model: (input: Record<string, any>) => Promise<number>
  ): Promise<ModelExplanation> {
    try {
      this.logger.info('Generating model explanation with integrated monitoring', { modelId });
      
      // Generate explanation
      const explanation = await this.explainabilityMonitor.explainModelPrediction(
        modelId,
        input,
        model
      );
      
      // Update integrated metrics
      await this.generateIntegratedMetrics();
      
      this.logger.info('Model explanation with monitoring completed', {
        modelId,
        explanationId: explanation.modelId,
        combinedConfidence: explanation.combinedConfidence,
        explanationConsistency: explanation.explanationConsistency,
      });
      
      return explanation;
    } catch (error) {
      this.logger.error('Error in model explanation with monitoring', error);
      throw new Error(`Model explanation with monitoring failed: ${error}`);
    }
  }

  /**
   * Calculate integrated score
   */
  private calculateIntegratedScore(
    performance: PerformanceSnapshot,
    explainability: any
  ): number {
    // Normalize performance metrics (0-1 scale)
    const performanceScore = this.normalizePerformanceScore(performance);
    
    // Normalize explainability metrics (0-1 scale)
    const explainabilityScore = this.normalizeExplainabilityScore(explainability);
    
    // Weighted combination (60% performance, 40% explainability)
    return (0.6 * performanceScore) + (0.4 * explainabilityScore);
  }

  /**
   * Normalize performance score
   */
  private normalizePerformanceScore(performance: PerformanceSnapshot): number {
    // Convert performance metrics to 0-1 scale
    const accuracyScore = Math.max(0, Math.min(1, performance.accuracy));
    const latencyScore = Math.max(0, Math.min(1, 1 - (performance.latencyMs / 10000))); // 10s max
    const hallucinationScore = Math.max(0, Math.min(1, 1 - performance.hallucinationRate));
    const confidenceScore = Math.max(0, Math.min(1, performance.confidenceScore));
    
    // Weighted average
    return (0.3 * accuracyScore) + (0.2 * latencyScore) + (0.3 * hallucinationScore) + (0.2 * confidenceScore);
  }

  /**
   * Normalize explainability score
   */
  private normalizeExplainabilityScore(explainability: any): number {
    const confidenceScore = explainability.avgConfidence;
    const fidelityScore = explainability.avgFidelity;
    const consistencyScore = explainability.consistencyScore;
    
    // Quality score mapping
    const qualityScores = { excellent: 1.0, good: 0.8, fair: 0.6, poor: 0.4 };
    const qualityScore = qualityScores[explainability.explanationQuality as keyof typeof qualityScores] || 0.4;
    
    // Weighted average
    return (0.4 * confidenceScore) + (0.3 * fidelityScore) + (0.2 * consistencyScore) + (0.1 * qualityScore);
  }

  /**
   * Calculate model stability
   */
  private calculateModelStability(): number {
    if (this.integratedMetrics.length < 2) return 1.0;
    
    const recentMetrics = this.integratedMetrics.slice(-10); // Last 10 measurements
    const scores = recentMetrics.map(m => m.integratedScore);
    
    // Calculate coefficient of variation (lower is more stable)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    
    // Convert to stability score (0-1, higher is more stable)
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  /**
   * Calculate explanation drift
   */
  private calculateExplanationDrift(): number {
    if (!this.baselineMetrics || this.integratedMetrics.length < 2) return 0;
    
    const currentMetrics = this.integratedMetrics[this.integratedMetrics.length - 1];
    
    // Compare feature importance distributions
    const baselineDistribution = this.baselineMetrics.explainabilityMetrics;
    const currentDistribution = currentMetrics.explainabilityMetrics;
    
    // Calculate drift as difference in confidence and fidelity
    const confidenceDrift = Math.abs(currentDistribution.avgConfidence - baselineDistribution.avgConfidence);
    const fidelityDrift = Math.abs(currentDistribution.avgFidelity - baselineDistribution.avgFidelity);
    
    return (confidenceDrift + fidelityDrift) / 2;
  }

  /**
   * Assess overall health
   */
  private assessOverallHealth(
    integratedScore: number,
    modelStability: number,
    explanationDrift: number
  ): IntegratedMetrics['overallHealth'] {
    // Health scoring
    let healthScore = integratedScore;
    
    // Penalize instability
    if (modelStability < 0.7) {
      healthScore *= 0.8;
    }
    
    // Penalize drift
    if (explanationDrift > 0.2) {
      healthScore *= 0.9;
    }
    
    // Determine health category
    if (healthScore >= 0.9) return 'excellent';
    if (healthScore >= 0.8) return 'good';
    if (healthScore >= 0.6) return 'fair';
    if (healthScore >= 0.4) return 'poor';
    return 'critical';
  }

  /**
   * Check for integrated alerts
   */
  private async checkIntegratedAlerts(metrics: IntegratedMetrics): Promise<void> {
    const alerts: IntegratedAlert[] = [];
    
    // Check overall score threshold
    if (metrics.integratedScore < this.config.alertIntegrationThresholds.minOverallScore) {
      alerts.push({
        id: `integrated_alert_${Date.now()}_score`,
        type: 'integrated_failure',
        severity: 'high',
        message: `Low integrated score: ${metrics.integratedScore.toFixed(3)}`,
        timestamp: new Date(),
        performanceImpact: 1 - metrics.integratedScore,
        explainabilityImpact: 1 - metrics.integratedScore,
        recommendations: [
          'Review model performance metrics',
          'Check explainability quality',
          'Investigate recent changes',
          'Consider model retraining',
        ],
        resolved: false,
      });
    }
    
    // Check explanation drift
    if (metrics.explanationDrift > this.config.alertIntegrationThresholds.maxExplanationDrift) {
      alerts.push({
        id: `integrated_alert_${Date.now()}_drift`,
        type: 'explanation_drift',
        severity: 'medium',
        message: `High explanation drift: ${metrics.explanationDrift.toFixed(3)}`,
        timestamp: new Date(),
        performanceImpact: metrics.explanationDrift,
        explainabilityImpact: metrics.explanationDrift,
        recommendations: [
          'Monitor explanation consistency',
          'Check for data drift',
          'Review model stability',
          'Consider explanation method adjustment',
        ],
        resolved: false,
      });
    }
    
    // Check model stability
    if (metrics.modelStability < this.config.alertIntegrationThresholds.minModelStability) {
      alerts.push({
        id: `integrated_alert_${Date.now()}_stability`,
        type: 'model_instability',
        severity: 'high',
        message: `Model instability detected: ${metrics.modelStability.toFixed(3)}`,
        timestamp: new Date(),
        performanceImpact: 1 - metrics.modelStability,
        explainabilityImpact: 1 - metrics.modelStability,
        recommendations: [
          'Investigate model performance variance',
          'Check for data quality issues',
          'Review model parameters',
          'Consider ensemble methods',
        ],
        resolved: false,
      });
    }
    
    // Add alerts
    this.integratedAlerts.push(...alerts);
    
    // Log alerts
    for (const alert of alerts) {
      this.logger.warn('Integrated alert triggered', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
      });
    }
  }

  /**
   * Get integrated metrics
   */
  getIntegratedMetrics(): IntegratedMetrics[] {
    return [...this.integratedMetrics];
  }

  /**
   * Get integrated alerts
   */
  getIntegratedAlerts(): IntegratedAlert[] {
    return [...this.integratedAlerts];
  }

  /**
   * Get explainability monitor
   */
  getExplainabilityMonitor(): ExplainabilityMonitor {
    return this.explainabilityMonitor;
  }

  /**
   * Get baseline metrics
   */
  getBaselineMetrics(): IntegratedMetrics | null {
    return this.baselineMetrics;
  }

  /**
   * Reset baseline metrics
   */
  resetBaselineMetrics(): void {
    this.baselineMetrics = null;
    this.logger.info('Baseline metrics reset');
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.integratedMetrics = [];
    this.integratedAlerts = [];
    this.baselineMetrics = null;
    this.explainabilityMonitor.clearData();
    this.logger.info('All integrated data cleared');
  }
}
