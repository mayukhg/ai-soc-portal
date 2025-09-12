/**
 * Explainability Monitor
 * Integrates LIME and SHAP explanations into monitoring pipelines
 */

import { Logger } from '../data-ingestion/utils/logger';
import { LimeExplainer, LimeExplanation, LimeConfig } from './lime-explainer';
import { ShapExplainer, ShapExplanation, ShapConfig, ShapSummary } from './shap-explainer';

export interface ExplainabilityConfig {
  enableLime: boolean;
  enableShap: boolean;
  monitoringIntervalMs: number;
  explanationRetentionDays: number;
  alertThresholds: ExplainabilityThresholds;
  limeConfig?: Partial<LimeConfig>;
  shapConfig?: Partial<ShapConfig>;
}

export interface ExplainabilityThresholds {
  minConfidence: number;
  maxFidelity: number;
  minFeatureImportance: number;
  maxExplanationTimeMs: number;
  minConsistencyScore: number;
}

export interface ExplainabilityMetrics {
  timestamp: Date;
  totalExplanations: number;
  limeExplanations: number;
  shapExplanations: number;
  avgConfidence: number;
  avgFidelity: number;
  avgExplanationTimeMs: number;
  consistencyScore: number;
  featureImportanceDistribution: Record<string, number>;
  explanationQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ExplainabilityAlert {
  id: string;
  type: 'low_confidence' | 'high_fidelity_loss' | 'slow_explanation' | 'inconsistent_explanations' | 'feature_bias';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  threshold: number;
  actualValue: number;
  explanationIds: string[];
  recommendations: string[];
  resolved: boolean;
  resolvedAt?: Date;
}

export interface ModelExplanation {
  modelId: string;
  prediction: number;
  limeExplanation?: LimeExplanation;
  shapExplanation?: ShapExplanation;
  combinedConfidence: number;
  explanationConsistency: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export class ExplainabilityMonitor {
  private logger: Logger;
  private config: ExplainabilityConfig;
  private limeExplainer: LimeExplainer;
  private shapExplainer: ShapExplainer;
  private metrics: ExplainabilityMetrics[];
  private alerts: ExplainabilityAlert[];
  private modelExplanations: Map<string, ModelExplanation>;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring: boolean;

  constructor(config?: Partial<ExplainabilityConfig>) {
    this.logger = new Logger('ExplainabilityMonitor');
    this.config = {
      enableLime: true,
      enableShap: true,
      monitoringIntervalMs: 300000, // 5 minutes
      explanationRetentionDays: 7,
      alertThresholds: {
        minConfidence: 0.7,
        maxFidelity: 0.8,
        minFeatureImportance: 0.1,
        maxExplanationTimeMs: 10000,
        minConsistencyScore: 0.6,
      },
    };
    this.metrics = [];
    this.alerts = [];
    this.modelExplanations = new Map();
    this.isMonitoring = false;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize explainers
    this.limeExplainer = new LimeExplainer(this.config.limeConfig);
    this.shapExplainer = new ShapExplainer(this.config.shapConfig);
  }

  /**
   * Start explainability monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn('Explainability monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.logger.info('Starting explainability monitoring', {
      enableLime: this.config.enableLime,
      enableShap: this.config.enableShap,
      interval: this.config.monitoringIntervalMs,
    });

    this.monitoringInterval = setInterval(() => {
      this.collectExplainabilityMetrics();
    }, this.config.monitoringIntervalMs);

    // Initial metrics collection
    await this.collectExplainabilityMetrics();
  }

  /**
   * Stop explainability monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.warn('Explainability monitoring is not running');
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.logger.info('Explainability monitoring stopped');
  }

  /**
   * Generate explanations for a model prediction
   */
  async explainModelPrediction(
    modelId: string,
    input: Record<string, any>,
    model: (input: Record<string, any>) => Promise<number>
  ): Promise<ModelExplanation> {
    try {
      this.logger.info('Generating model explanation', { modelId, inputKeys: Object.keys(input) });
      
      const startTime = Date.now();
      const prediction = await model(input);
      
      let limeExplanation: LimeExplanation | undefined;
      let shapExplanation: ShapExplanation | undefined;
      
      // Generate LIME explanation
      if (this.config.enableLime) {
        try {
          limeExplanation = await this.limeExplainer.explainPrediction(input, model);
        } catch (error) {
          this.logger.warn('LIME explanation failed', error);
        }
      }
      
      // Generate SHAP explanation
      if (this.config.enableShap) {
        try {
          shapExplanation = await this.shapExplainer.explainPrediction(input, model);
        } catch (error) {
          this.logger.warn('SHAP explanation failed', error);
        }
      }
      
      // Calculate combined confidence
      const combinedConfidence = this.calculateCombinedConfidence(limeExplanation, shapExplanation);
      
      // Calculate explanation consistency
      const explanationConsistency = this.calculateExplanationConsistency(limeExplanation, shapExplanation);
      
      const modelExplanation: ModelExplanation = {
        modelId,
        prediction,
        limeExplanation,
        shapExplanation,
        combinedConfidence,
        explanationConsistency,
        timestamp: new Date(),
        metadata: {
          processingTimeMs: Date.now() - startTime,
          inputFeatures: Object.keys(input).length,
          explanationMethods: this.getActiveExplanationMethods(),
        },
      };
      
      // Store explanation
      const explanationId = `expl_${modelId}_${Date.now()}`;
      this.modelExplanations.set(explanationId, modelExplanation);
      
      // Check for alerts
      await this.checkExplainabilityAlerts(modelExplanation, explanationId);
      
      this.logger.info('Model explanation generated', {
        modelId,
        explanationId,
        combinedConfidence,
        explanationConsistency,
        processingTimeMs: Date.now() - startTime,
      });
      
      return modelExplanation;
    } catch (error) {
      this.logger.error('Error generating model explanation', error);
      throw new Error(`Model explanation failed: ${error}`);
    }
  }

  /**
   * Collect explainability metrics
   */
  private async collectExplainabilityMetrics(): Promise<void> {
    try {
      const explanations = Array.from(this.modelExplanations.values());
      
      if (explanations.length === 0) {
        this.logger.info('No explanations available for metrics collection');
        return;
      }
      
      const metrics: ExplainabilityMetrics = {
        timestamp: new Date(),
        totalExplanations: explanations.length,
        limeExplanations: explanations.filter(e => e.limeExplanation).length,
        shapExplanations: explanations.filter(e => e.shapExplanation).length,
        avgConfidence: this.calculateAverageConfidence(explanations),
        avgFidelity: this.calculateAverageFidelity(explanations),
        avgExplanationTimeMs: this.calculateAverageExplanationTime(explanations),
        consistencyScore: this.calculateAverageConsistency(explanations),
        featureImportanceDistribution: this.calculateFeatureImportanceDistribution(explanations),
        explanationQuality: this.assessExplanationQuality(explanations),
      };
      
      this.metrics.push(metrics);
      
      // Clean up old metrics
      this.cleanupOldMetrics();
      
      this.logger.info('Explainability metrics collected', {
        totalExplanations: metrics.totalExplanations,
        avgConfidence: metrics.avgConfidence,
        avgFidelity: metrics.avgFidelity,
        explanationQuality: metrics.explanationQuality,
      });
    } catch (error) {
      this.logger.error('Error collecting explainability metrics', error);
    }
  }

  /**
   * Check for explainability alerts
   */
  private async checkExplainabilityAlerts(
    modelExplanation: ModelExplanation,
    explanationId: string
  ): Promise<void> {
    const alerts: ExplainabilityAlert[] = [];
    
    // Check confidence threshold
    if (modelExplanation.combinedConfidence < this.config.alertThresholds.minConfidence) {
      alerts.push({
        id: `alert_${Date.now()}_confidence`,
        type: 'low_confidence',
        severity: 'medium',
        message: `Low explanation confidence: ${modelExplanation.combinedConfidence.toFixed(3)}`,
        timestamp: new Date(),
        threshold: this.config.alertThresholds.minConfidence,
        actualValue: modelExplanation.combinedConfidence,
        explanationIds: [explanationId],
        recommendations: [
          'Review model input features',
          'Check explanation method parameters',
          'Consider increasing sample size for explanations',
        ],
        resolved: false,
      });
    }
    
    // Check fidelity threshold
    const avgFidelity = this.calculateAverageFidelity([modelExplanation]);
    if (avgFidelity < this.config.alertThresholds.maxFidelity) {
      alerts.push({
        id: `alert_${Date.now()}_fidelity`,
        type: 'high_fidelity_loss',
        severity: 'high',
        message: `High fidelity loss: ${avgFidelity.toFixed(3)}`,
        timestamp: new Date(),
        threshold: this.config.alertThresholds.maxFidelity,
        actualValue: avgFidelity,
        explanationIds: [explanationId],
        recommendations: [
          'Investigate model complexity',
          'Check for overfitting',
          'Review explanation method selection',
        ],
        resolved: false,
      });
    }
    
    // Check explanation time
    const explanationTime = modelExplanation.metadata.processingTimeMs || 0;
    if (explanationTime > this.config.alertThresholds.maxExplanationTimeMs) {
      alerts.push({
        id: `alert_${Date.now()}_time`,
        type: 'slow_explanation',
        severity: 'medium',
        message: `Slow explanation generation: ${explanationTime}ms`,
        timestamp: new Date(),
        threshold: this.config.alertThresholds.maxExplanationTimeMs,
        actualValue: explanationTime,
        explanationIds: [explanationId],
        recommendations: [
          'Optimize explanation parameters',
          'Reduce sample size',
          'Consider caching explanations',
        ],
        resolved: false,
      });
    }
    
    // Check consistency
    if (modelExplanation.explanationConsistency < this.config.alertThresholds.minConsistencyScore) {
      alerts.push({
        id: `alert_${Date.now()}_consistency`,
        type: 'inconsistent_explanations',
        severity: 'high',
        message: `Inconsistent explanations: ${modelExplanation.explanationConsistency.toFixed(3)}`,
        timestamp: new Date(),
        threshold: this.config.alertThresholds.minConsistencyScore,
        actualValue: modelExplanation.explanationConsistency,
        explanationIds: [explanationId],
        recommendations: [
          'Review explanation method parameters',
          'Check for model instability',
          'Consider ensemble explanation methods',
        ],
        resolved: false,
      });
    }
    
    // Add alerts
    this.alerts.push(...alerts);
    
    // Log alerts
    for (const alert of alerts) {
      this.logger.warn('Explainability alert triggered', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
      });
    }
  }

  /**
   * Calculate combined confidence from LIME and SHAP
   */
  private calculateCombinedConfidence(
    limeExplanation?: LimeExplanation,
    shapExplanation?: ShapExplanation
  ): number {
    const confidences: number[] = [];
    
    if (limeExplanation) {
      confidences.push(limeExplanation.confidence);
    }
    
    if (shapExplanation) {
      confidences.push(shapExplanation.confidence);
    }
    
    return confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
  }

  /**
   * Calculate explanation consistency between LIME and SHAP
   */
  private calculateExplanationConsistency(
    limeExplanation?: LimeExplanation,
    shapExplanation?: ShapExplanation
  ): number {
    if (!limeExplanation || !shapExplanation) {
      return 1.0; // Perfect consistency if only one method available
    }
    
    // Compare top features from both explanations
    const limeTopFeatures = limeExplanation.explanation
      .slice(0, 5)
      .map(f => f.feature);
    const shapTopFeatures = shapExplanation.shapValues
      .slice(0, 5)
      .map(f => f.feature);
    
    // Calculate Jaccard similarity
    const intersection = limeTopFeatures.filter(f => shapTopFeatures.includes(f));
    const union = [...new Set([...limeTopFeatures, ...shapTopFeatures])];
    
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  /**
   * Calculate average confidence across explanations
   */
  private calculateAverageConfidence(explanations: ModelExplanation[]): number {
    if (explanations.length === 0) return 0;
    
    const totalConfidence = explanations.reduce((sum, exp) => sum + exp.combinedConfidence, 0);
    return totalConfidence / explanations.length;
  }

  /**
   * Calculate average fidelity across explanations
   */
  private calculateAverageFidelity(explanations: ModelExplanation[]): number {
    const fidelities: number[] = [];
    
    for (const explanation of explanations) {
      if (explanation.limeExplanation) {
        fidelities.push(explanation.limeExplanation.fidelity);
      }
    }
    
    return fidelities.length > 0 ? fidelities.reduce((a, b) => a + b, 0) / fidelities.length : 0;
  }

  /**
   * Calculate average explanation time
   */
  private calculateAverageExplanationTime(explanations: ModelExplanation[]): number {
    if (explanations.length === 0) return 0;
    
    const totalTime = explanations.reduce((sum, exp) => sum + (exp.metadata.processingTimeMs || 0), 0);
    return totalTime / explanations.length;
  }

  /**
   * Calculate average consistency
   */
  private calculateAverageConsistency(explanations: ModelExplanation[]): number {
    if (explanations.length === 0) return 0;
    
    const totalConsistency = explanations.reduce((sum, exp) => sum + exp.explanationConsistency, 0);
    return totalConsistency / explanations.length;
  }

  /**
   * Calculate feature importance distribution
   */
  private calculateFeatureImportanceDistribution(explanations: ModelExplanation[]): Record<string, number> {
    const featureCounts: Record<string, number> = {};
    let totalFeatures = 0;
    
    for (const explanation of explanations) {
      if (explanation.limeExplanation) {
        for (const feature of explanation.limeExplanation.explanation) {
          featureCounts[feature.feature] = (featureCounts[feature.feature] || 0) + 1;
          totalFeatures++;
        }
      }
      
      if (explanation.shapExplanation) {
        for (const feature of explanation.shapExplanation.shapValues) {
          featureCounts[feature.feature] = (featureCounts[feature.feature] || 0) + 1;
          totalFeatures++;
        }
      }
    }
    
    // Convert to percentages
    const distribution: Record<string, number> = {};
    for (const [feature, count] of Object.entries(featureCounts)) {
      distribution[feature] = totalFeatures > 0 ? count / totalFeatures : 0;
    }
    
    return distribution;
  }

  /**
   * Assess explanation quality
   */
  private assessExplanationQuality(explanations: ModelExplanation[]): ExplainabilityMetrics['explanationQuality'] {
    const avgConfidence = this.calculateAverageConfidence(explanations);
    const avgFidelity = this.calculateAverageFidelity(explanations);
    const avgConsistency = this.calculateAverageConsistency(explanations);
    
    const qualityScore = (avgConfidence + avgFidelity + avgConsistency) / 3;
    
    if (qualityScore >= 0.9) return 'excellent';
    if (qualityScore >= 0.8) return 'good';
    if (qualityScore >= 0.6) return 'fair';
    return 'poor';
  }

  /**
   * Get active explanation methods
   */
  private getActiveExplanationMethods(): string[] {
    const methods: string[] = [];
    
    if (this.config.enableLime) methods.push('LIME');
    if (this.config.enableShap) methods.push('SHAP');
    
    return methods;
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffDate = new Date(Date.now() - this.config.explanationRetentionDays * 24 * 60 * 60 * 1000);
    
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffDate);
    
    // Clean up old explanations
    for (const [id, explanation] of this.modelExplanations) {
      if (explanation.timestamp < cutoffDate) {
        this.modelExplanations.delete(id);
      }
    }
  }

  /**
   * Get explainability metrics
   */
  getMetrics(): ExplainabilityMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get explainability alerts
   */
  getAlerts(): ExplainabilityAlert[] {
    return [...this.alerts];
  }

  /**
   * Get model explanations
   */
  getModelExplanations(): ModelExplanation[] {
    return Array.from(this.modelExplanations.values());
  }

  /**
   * Get SHAP summary
   */
  async getShapSummary(): Promise<ShapSummary | null> {
    return this.shapExplainer.getShapSummary();
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.metrics = [];
    this.alerts = [];
    this.modelExplanations.clear();
    this.limeExplainer.clearCache();
    this.shapExplainer.clearCache();
  }
}
