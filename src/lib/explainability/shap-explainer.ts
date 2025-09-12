/**
 * SHAP (SHapley Additive exPlanations) Explainer
 * Provides global and local explanations for AI model predictions
 */

import { Logger } from '../data-ingestion/utils/logger';

export interface ShapConfig {
  numSamples: number;
  maxFeatures: number;
  featureIndependence: boolean;
  backgroundSamples: number;
  randomState: number;
  algorithm: 'exact' | 'permutation' | 'sampling' | 'linear' | 'tree';
  linkFunction: 'identity' | 'logit' | 'log';
}

export interface ShapExplanation {
  explanationId: string;
  shapValues: ShapValue[];
  baseValue: number;
  prediction: number;
  expectedValue: number;
  confidence: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface ShapValue {
  feature: string;
  value: number;
  shapValue: number;
  importance: number;
  description: string;
  category: 'threat_indicator' | 'risk_factor' | 'contextual' | 'temporal' | 'behavioral';
}

export interface ShapInstance {
  id: string;
  input: Record<string, any>;
  shapValues: ShapValue[];
  baseValue: number;
  prediction: number;
  expectedValue: number;
}

export interface ShapSummary {
  featureImportance: FeatureImportanceSummary[];
  globalImportance: Record<string, number>;
  interactionEffects: InteractionEffect[];
  summaryStats: SummaryStats;
}

export interface FeatureImportanceSummary {
  feature: string;
  meanAbsShap: number;
  stdShap: number;
  frequency: number;
  description: string;
  category: string;
}

export interface InteractionEffect {
  feature1: string;
  feature2: string;
  interactionStrength: number;
  description: string;
}

export interface SummaryStats {
  totalInstances: number;
  avgPrediction: number;
  stdPrediction: number;
  avgBaseValue: number;
  avgShapMagnitude: number;
}

export class ShapExplainer {
  private logger: Logger;
  private config: ShapConfig;
  private explanations: Map<string, ShapExplanation>;
  private backgroundData: Record<string, any>[];
  private shapSummary: ShapSummary | null;

  constructor(config?: Partial<ShapConfig>) {
    this.logger = new Logger('ShapExplainer');
    this.config = {
      numSamples: 100,
      maxFeatures: 20,
      featureIndependence: true,
      backgroundSamples: 50,
      randomState: 42,
      algorithm: 'sampling',
      linkFunction: 'identity',
    };
    this.explanations = new Map();
    this.backgroundData = [];
    this.shapSummary = null;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Generate SHAP explanation for a specific prediction
   */
  async explainPrediction(
    input: Record<string, any>,
    model: (input: Record<string, any>) => Promise<number>,
    explanationId?: string
  ): Promise<ShapExplanation> {
    try {
      this.logger.info('Generating SHAP explanation', { inputKeys: Object.keys(input) });
      
      const startTime = Date.now();
      const id = explanationId || `shap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get prediction
      const prediction = await model(input);
      
      // Calculate base value (expected value)
      const baseValue = await this.calculateBaseValue(model);
      
      // Calculate SHAP values
      const shapValues = await this.calculateShapValues(input, model, baseValue);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(shapValues, prediction, baseValue);
      
      const explanation: ShapExplanation = {
        explanationId: id,
        shapValues,
        baseValue,
        prediction,
        expectedValue: baseValue,
        confidence,
        timestamp: new Date(),
        metadata: {
          algorithm: this.config.algorithm,
          numSamples: this.config.numSamples,
          maxFeatures: this.config.maxFeatures,
          processingTimeMs: Date.now() - startTime,
        },
      };
      
      // Cache explanation
      this.explanations.set(id, explanation);
      
      this.logger.info('SHAP explanation generated', {
        explanationId: id,
        confidence,
        numFeatures: shapValues.length,
        processingTimeMs: Date.now() - startTime,
      });
      
      return explanation;
    } catch (error) {
      this.logger.error('Error generating SHAP explanation', error);
      throw new Error(`SHAP explanation failed: ${error}`);
    }
  }

  /**
   * Calculate base value (expected prediction)
   */
  private async calculateBaseValue(model: (input: Record<string, any>) => Promise<number>): Promise<number> {
    if (this.backgroundData.length === 0) {
      // Generate background data if not available
      this.backgroundData = await this.generateBackgroundData();
    }
    
    let totalPrediction = 0;
    let count = 0;
    
    for (const backgroundInput of this.backgroundData.slice(0, this.config.backgroundSamples)) {
      try {
        const prediction = await model(backgroundInput);
        totalPrediction += prediction;
        count++;
      } catch (error) {
        this.logger.warn('Error calculating base value', error);
      }
    }
    
    return count > 0 ? totalPrediction / count : 0;
  }

  /**
   * Calculate SHAP values using sampling approach
   */
  private async calculateShapValues(
    input: Record<string, any>,
    model: (input: Record<string, any>) => Promise<number>,
    baseValue: number
  ): Promise<ShapValue[]> {
    const features = Object.keys(input);
    const shapValues: ShapValue[] = [];
    
    for (const feature of features) {
      const shapValue = await this.calculateFeatureShapValue(feature, input, model, baseValue);
      
      shapValues.push({
        feature,
        value: input[feature] || 0,
        shapValue,
        importance: Math.abs(shapValue),
        description: this.getFeatureDescription(feature),
        category: this.categorizeFeature(feature),
      });
    }
    
    // Sort by importance
    return shapValues.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Calculate SHAP value for a single feature
   */
  private async calculateFeatureShapValue(
    feature: string,
    input: Record<string, any>,
    model: (input: Record<string, any>) => Promise<number>,
    baseValue: number
  ): Promise<number> {
    const features = Object.keys(input);
    const featureIndex = features.indexOf(feature);
    
    let totalContribution = 0;
    let count = 0;
    
    // Sample different subsets of features
    for (let i = 0; i < this.config.numSamples; i++) {
      const subset = this.generateRandomSubset(features, featureIndex);
      
      // Calculate marginal contribution
      const contribution = await this.calculateMarginalContribution(
        feature,
        input,
        subset,
        model
      );
      
      totalContribution += contribution;
      count++;
    }
    
    return count > 0 ? totalContribution / count : 0;
  }

  /**
   * Calculate marginal contribution of a feature
   */
  private async calculateMarginalContribution(
    feature: string,
    input: Record<string, any>,
    subset: string[],
    model: (input: Record<string, any>) => Promise<number>
  ): Promise<number> {
    // Create input with subset features
    const subsetInput = this.createSubsetInput(input, subset);
    const subsetWithFeature = this.createSubsetInput(input, [...subset, feature]);
    
    try {
      const predictionWithout = await model(subsetInput);
      const predictionWith = await model(subsetWithFeature);
      
      return predictionWith - predictionWithout;
    } catch (error) {
      this.logger.warn('Error calculating marginal contribution', error);
      return 0;
    }
  }

  /**
   * Generate background data for base value calculation
   */
  private async generateBackgroundData(): Promise<Record<string, any>[]> {
    const backgroundData: Record<string, any>[] = [];
    
    // Generate synthetic background samples
    for (let i = 0; i < this.config.backgroundSamples; i++) {
      const sample: Record<string, any> = {};
      
      // Generate random values for common features
      sample.threat_score = Math.random() * 100;
      sample.risk_level = Math.random();
      sample.confidence = Math.random();
      sample.severity = Math.random() * 10;
      sample.frequency = Math.random() * 1000;
      sample.source_ip = this.generateRandomIP();
      sample.destination_ip = this.generateRandomIP();
      sample.port = Math.floor(Math.random() * 65535);
      sample.protocol = ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)];
      sample.timestamp = new Date(Date.now() - Math.random() * 86400000); // Random time in last 24h
      
      backgroundData.push(sample);
    }
    
    return backgroundData;
  }

  /**
   * Generate random subset of features
   */
  private generateRandomSubset(features: string[], excludeIndex: number): string[] {
    const subset: string[] = [];
    
    for (let i = 0; i < features.length; i++) {
      if (i !== excludeIndex && Math.random() < 0.5) {
        subset.push(features[i]);
      }
    }
    
    return subset;
  }

  /**
   * Create input with subset of features
   */
  private createSubsetInput(input: Record<string, any>, subset: string[]): Record<string, any> {
    const subsetInput: Record<string, any> = {};
    
    for (const feature of subset) {
      subsetInput[feature] = input[feature];
    }
    
    return subsetInput;
  }

  /**
   * Calculate explanation confidence
   */
  private calculateConfidence(shapValues: ShapValue[], prediction: number, baseValue: number): number {
    // Confidence based on consistency of SHAP values
    const totalShapMagnitude = shapValues.reduce((sum, sv) => sum + Math.abs(sv.shapValue), 0);
    const predictionDeviation = Math.abs(prediction - baseValue);
    
    if (totalShapMagnitude === 0) return 0;
    
    const consistency = Math.min(1, predictionDeviation / totalShapMagnitude);
    return Math.max(0, Math.min(1, consistency));
  }

  /**
   * Generate SHAP summary for multiple explanations
   */
  async generateShapSummary(): Promise<ShapSummary> {
    const explanations = Array.from(this.explanations.values());
    
    if (explanations.length === 0) {
      throw new Error('No explanations available for summary generation');
    }
    
    // Calculate feature importance
    const featureImportance = this.calculateFeatureImportance(explanations);
    
    // Calculate global importance
    const globalImportance = this.calculateGlobalImportance(explanations);
    
    // Calculate interaction effects
    const interactionEffects = this.calculateInteractionEffects(explanations);
    
    // Calculate summary statistics
    const summaryStats = this.calculateSummaryStats(explanations);
    
    this.shapSummary = {
      featureImportance,
      globalImportance,
      interactionEffects,
      summaryStats,
    };
    
    return this.shapSummary;
  }

  /**
   * Calculate feature importance from explanations
   */
  private calculateFeatureImportance(explanations: ShapExplanation[]): FeatureImportanceSummary[] {
    const featureStats: Map<string, { values: number[], count: number }> = new Map();
    
    for (const explanation of explanations) {
      for (const shapValue of explanation.shapValues) {
        if (!featureStats.has(shapValue.feature)) {
          featureStats.set(shapValue.feature, { values: [], count: 0 });
        }
        
        const stats = featureStats.get(shapValue.feature)!;
        stats.values.push(Math.abs(shapValue.shapValue));
        stats.count++;
      }
    }
    
    const importance: FeatureImportanceSummary[] = [];
    
    for (const [feature, stats] of featureStats) {
      const meanAbsShap = stats.values.reduce((a, b) => a + b, 0) / stats.values.length;
      const stdShap = this.calculateStandardDeviation(stats.values, meanAbsShap);
      const frequency = stats.count / explanations.length;
      
      importance.push({
        feature,
        meanAbsShap,
        stdShap,
        frequency,
        description: this.getFeatureDescription(feature),
        category: this.categorizeFeature(feature),
      });
    }
    
    return importance.sort((a, b) => b.meanAbsShap - a.meanAbsShap);
  }

  /**
   * Calculate global importance
   */
  private calculateGlobalImportance(explanations: ShapExplanation[]): Record<string, number> {
    const globalImportance: Record<string, number> = {};
    
    for (const explanation of explanations) {
      for (const shapValue of explanation.shapValues) {
        if (!globalImportance[shapValue.feature]) {
          globalImportance[shapValue.feature] = 0;
        }
        globalImportance[shapValue.feature] += Math.abs(shapValue.shapValue);
      }
    }
    
    // Normalize by number of explanations
    const numExplanations = explanations.length;
    for (const feature in globalImportance) {
      globalImportance[feature] /= numExplanations;
    }
    
    return globalImportance;
  }

  /**
   * Calculate interaction effects
   */
  private calculateInteractionEffects(explanations: ShapExplanation[]): InteractionEffect[] {
    const interactions: InteractionEffect[] = [];
    const features = new Set<string>();
    
    // Collect all features
    for (const explanation of explanations) {
      for (const shapValue of explanation.shapValues) {
        features.add(shapValue.feature);
      }
    }
    
    const featureArray = Array.from(features);
    
    // Calculate pairwise interactions
    for (let i = 0; i < featureArray.length; i++) {
      for (let j = i + 1; j < featureArray.length; j++) {
        const feature1 = featureArray[i];
        const feature2 = featureArray[j];
        
        const interactionStrength = this.calculatePairwiseInteraction(
          feature1,
          feature2,
          explanations
        );
        
        if (interactionStrength > 0.1) { // Threshold for significant interactions
          interactions.push({
            feature1,
            feature2,
            interactionStrength,
            description: `Interaction between ${feature1} and ${feature2}`,
          });
        }
      }
    }
    
    return interactions.sort((a, b) => b.interactionStrength - a.interactionStrength);
  }

  /**
   * Calculate pairwise interaction strength
   */
  private calculatePairwiseInteraction(
    feature1: string,
    feature2: string,
    explanations: ShapExplanation[]
  ): number {
    let totalInteraction = 0;
    let count = 0;
    
    for (const explanation of explanations) {
      const shap1 = explanation.shapValues.find(sv => sv.feature === feature1);
      const shap2 = explanation.shapValues.find(sv => sv.feature === feature2);
      
      if (shap1 && shap2) {
        // Simple interaction measure: correlation of SHAP values
        totalInteraction += Math.abs(shap1.shapValue * shap2.shapValue);
        count++;
      }
    }
    
    return count > 0 ? totalInteraction / count : 0;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummaryStats(explanations: ShapExplanation[]): SummaryStats {
    const predictions = explanations.map(e => e.prediction);
    const baseValues = explanations.map(e => e.baseValue);
    const shapMagnitudes = explanations.flatMap(e => e.shapValues.map(sv => Math.abs(sv.shapValue)));
    
    return {
      totalInstances: explanations.length,
      avgPrediction: predictions.reduce((a, b) => a + b, 0) / predictions.length,
      stdPrediction: this.calculateStandardDeviation(predictions, predictions.reduce((a, b) => a + b, 0) / predictions.length),
      avgBaseValue: baseValues.reduce((a, b) => a + b, 0) / baseValues.length,
      avgShapMagnitude: shapMagnitudes.reduce((a, b) => a + b, 0) / shapMagnitudes.length,
    };
  }

  /**
   * Get explanation by ID
   */
  getExplanation(explanationId: string): ShapExplanation | undefined {
    return this.explanations.get(explanationId);
  }

  /**
   * Get all explanations
   */
  getAllExplanations(): ShapExplanation[] {
    return Array.from(this.explanations.values());
  }

  /**
   * Get SHAP summary
   */
  getShapSummary(): ShapSummary | null {
    return this.shapSummary;
  }

  /**
   * Clear explanation cache
   */
  clearCache(): void {
    this.explanations.clear();
    this.shapSummary = null;
  }

  // Helper methods
  private generateRandomIP(): string {
    return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }

  private calculateStandardDeviation(values: number[], mean: number): number {
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private getFeatureDescription(feature: string): string {
    const descriptions: Record<string, string> = {
      'threat_score': 'Overall threat severity score',
      'risk_level': 'Risk assessment level',
      'confidence': 'Model confidence in prediction',
      'severity': 'Alert severity level',
      'frequency': 'Event frequency',
      'source_ip': 'Source IP address',
      'destination_ip': 'Destination IP address',
      'port': 'Network port',
      'protocol': 'Network protocol',
      'user_agent': 'User agent string',
      'timestamp': 'Event timestamp',
    };
    
    return descriptions[feature] || `Feature: ${feature}`;
  }

  private categorizeFeature(feature: string): ShapValue['category'] {
    if (feature.includes('threat') || feature.includes('severity')) return 'threat_indicator';
    if (feature.includes('risk') || feature.includes('impact')) return 'risk_factor';
    if (feature.includes('ip') || feature.includes('port') || feature.includes('protocol')) return 'contextual';
    if (feature.includes('time') || feature.includes('date')) return 'temporal';
    if (feature.includes('behavior') || feature.includes('pattern')) return 'behavioral';
    
    return 'contextual';
  }
}
