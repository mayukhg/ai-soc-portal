/**
 * LIME (Local Interpretable Model-agnostic Explanations) Explainer
 * Provides local explanations for AI model predictions
 */

import { Logger } from '../data-ingestion/utils/logger';

export interface LimeConfig {
  numSamples: number;
  numFeatures: number;
  kernelWidth: number;
  randomState: number;
  featureSelection: 'auto' | 'forward_selection' | 'highest_weights';
  discretizeContinuous: boolean;
  discretizer: 'quartile' | 'decile' | 'entropy';
}

export interface LimeExplanation {
  explanationId: string;
  modelPrediction: number;
  explanation: FeatureImportance[];
  confidence: number;
  fidelity: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface FeatureImportance {
  feature: string;
  value: number;
  weight: number;
  description: string;
  category: 'threat_indicator' | 'risk_factor' | 'contextual' | 'temporal' | 'behavioral';
}

export interface LimeInstance {
  id: string;
  input: Record<string, any>;
  prediction: number;
  explanation: LimeExplanation;
  perturbedSamples: PerturbedSample[];
  localModel: LocalModel;
}

export interface PerturbedSample {
  features: Record<string, any>;
  prediction: number;
  weight: number;
  distance: number;
}

export interface LocalModel {
  coefficients: Record<string, number>;
  intercept: number;
  r2Score: number;
  mse: number;
}

export class LimeExplainer {
  private logger: Logger;
  private config: LimeConfig;
  private explanations: Map<string, LimeExplanation>;
  private instanceCache: Map<string, LimeInstance>;

  constructor(config?: Partial<LimeConfig>) {
    this.logger = new Logger('LimeExplainer');
    this.config = {
      numSamples: 5000,
      numFeatures: 10,
      kernelWidth: 0.75,
      randomState: 42,
      featureSelection: 'auto',
      discretizeContinuous: true,
      discretizer: 'quartile',
    };
    this.explanations = new Map();
    this.instanceCache = new Map();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Generate LIME explanation for a specific prediction
   */
  async explainPrediction(
    input: Record<string, any>,
    model: (input: Record<string, any>) => Promise<number>,
    explanationId?: string
  ): Promise<LimeExplanation> {
    try {
      this.logger.info('Generating LIME explanation', { inputKeys: Object.keys(input) });
      
      const startTime = Date.now();
      const id = explanationId || `lime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get original prediction
      const originalPrediction = await model(input);
      
      // Generate perturbed samples
      const perturbedSamples = await this.generatePerturbedSamples(input, model);
      
      // Train local linear model
      const localModel = await this.trainLocalModel(perturbedSamples);
      
      // Extract feature importance
      const featureImportance = this.extractFeatureImportance(localModel, input);
      
      // Calculate explanation metrics
      const confidence = this.calculateConfidence(localModel);
      const fidelity = this.calculateFidelity(perturbedSamples, localModel);
      
      const explanation: LimeExplanation = {
        explanationId: id,
        modelPrediction: originalPrediction,
        explanation: featureImportance,
        confidence,
        fidelity,
        timestamp: new Date(),
        metadata: {
          numSamples: this.config.numSamples,
          numFeatures: this.config.numFeatures,
          kernelWidth: this.config.kernelWidth,
          processingTimeMs: Date.now() - startTime,
        },
      };
      
      // Cache explanation
      this.explanations.set(id, explanation);
      
      this.logger.info('LIME explanation generated', {
        explanationId: id,
        confidence,
        fidelity,
        numFeatures: featureImportance.length,
        processingTimeMs: Date.now() - startTime,
      });
      
      return explanation;
    } catch (error) {
      this.logger.error('Error generating LIME explanation', error);
      throw new Error(`LIME explanation failed: ${error}`);
    }
  }

  /**
   * Generate perturbed samples around the input
   */
  private async generatePerturbedSamples(
    input: Record<string, any>,
    model: (input: Record<string, any>) => Promise<number>
  ): Promise<PerturbedSample[]> {
    const samples: PerturbedSample[] = [];
    
    for (let i = 0; i < this.config.numSamples; i++) {
      const perturbedInput = this.perturbInput(input);
      const prediction = await model(perturbedInput);
      const distance = this.calculateDistance(input, perturbedInput);
      const weight = this.calculateWeight(distance);
      
      samples.push({
        features: perturbedInput,
        prediction,
        weight,
        distance,
      });
    }
    
    return samples;
  }

  /**
   * Perturb input features
   */
  private perturbInput(input: Record<string, any>): Record<string, any> {
    const perturbed = { ...input };
    
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'number') {
        // Add Gaussian noise to numerical features
        const noise = this.generateGaussianNoise(0, 0.1);
        perturbed[key] = value + noise;
      } else if (typeof value === 'string') {
        // Randomly replace string values
        if (Math.random() < 0.1) {
          perturbed[key] = this.generateRandomString(value);
        }
      } else if (Array.isArray(value)) {
        // Perturb array elements
        if (Math.random() < 0.1) {
          perturbed[key] = this.perturbArray(value);
        }
      }
    }
    
    return perturbed;
  }

  /**
   * Train local linear model on perturbed samples
   */
  private async trainLocalModel(samples: PerturbedSample[]): Promise<LocalModel> {
    // Convert samples to feature matrix
    const features = this.extractFeatures(samples);
    const predictions = samples.map(s => s.prediction);
    const weights = samples.map(s => s.weight);
    
    // Simple linear regression with weights
    const coefficients = this.weightedLinearRegression(features, predictions, weights);
    const intercept = this.calculateIntercept(features, predictions, coefficients);
    
    // Calculate model metrics
    const r2Score = this.calculateR2Score(features, predictions, coefficients, intercept);
    const mse = this.calculateMSE(features, predictions, coefficients, intercept);
    
    return {
      coefficients,
      intercept,
      r2Score,
      mse,
    };
  }

  /**
   * Extract feature importance from local model
   */
  private extractFeatureImportance(
    localModel: LocalModel,
    originalInput: Record<string, any>
  ): FeatureImportance[] {
    const importance: FeatureImportance[] = [];
    
    for (const [feature, coefficient] of Object.entries(localModel.coefficients)) {
      const value = originalInput[feature] || 0;
      const weight = Math.abs(coefficient);
      
      importance.push({
        feature,
        value: typeof value === 'number' ? value : 0,
        weight,
        description: this.getFeatureDescription(feature),
        category: this.categorizeFeature(feature),
      });
    }
    
    // Sort by weight (importance)
    return importance.sort((a, b) => b.weight - a.weight).slice(0, this.config.numFeatures);
  }

  /**
   * Calculate explanation confidence
   */
  private calculateConfidence(localModel: LocalModel): number {
    // Confidence based on R² score and MSE
    const r2Confidence = Math.max(0, Math.min(1, localModel.r2Score));
    const mseConfidence = Math.max(0, Math.min(1, 1 - localModel.mse));
    
    return (r2Confidence + mseConfidence) / 2;
  }

  /**
   * Calculate explanation fidelity
   */
  private calculateFidelity(samples: PerturbedSample[], localModel: LocalModel): number {
    let totalError = 0;
    let totalWeight = 0;
    
    for (const sample of samples) {
      const localPrediction = this.predictWithLocalModel(sample.features, localModel);
      const error = Math.abs(sample.prediction - localPrediction);
      totalError += error * sample.weight;
      totalWeight += sample.weight;
    }
    
    const avgError = totalWeight > 0 ? totalError / totalWeight : 1;
    return Math.max(0, Math.min(1, 1 - avgError));
  }

  /**
   * Get explanation by ID
   */
  getExplanation(explanationId: string): LimeExplanation | undefined {
    return this.explanations.get(explanationId);
  }

  /**
   * Get all explanations
   */
  getAllExplanations(): LimeExplanation[] {
    return Array.from(this.explanations.values());
  }

  /**
   * Clear explanation cache
   */
  clearCache(): void {
    this.explanations.clear();
    this.instanceCache.clear();
  }

  // Helper methods
  private generateGaussianNoise(mean: number, std: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + std * z0;
  }

  private generateRandomString(original: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: original.length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private perturbArray(arr: any[]): any[] {
    if (arr.length === 0) return arr;
    
    const perturbed = [...arr];
    const index = Math.floor(Math.random() * arr.length);
    
    if (typeof arr[index] === 'number') {
      perturbed[index] = arr[index] + this.generateGaussianNoise(0, 0.1);
    } else if (typeof arr[index] === 'string') {
      perturbed[index] = this.generateRandomString(arr[index]);
    }
    
    return perturbed;
  }

  private calculateDistance(input1: Record<string, any>, input2: Record<string, any>): number {
    let distance = 0;
    let count = 0;
    
    for (const key of Object.keys(input1)) {
      const val1 = input1[key];
      const val2 = input2[key];
      
      if (typeof val1 === 'number' && typeof val2 === 'number') {
        distance += Math.pow(val1 - val2, 2);
        count++;
      } else if (val1 !== val2) {
        distance += 1;
        count++;
      }
    }
    
    return count > 0 ? Math.sqrt(distance / count) : 0;
  }

  private calculateWeight(distance: number): number {
    return Math.exp(-Math.pow(distance / this.config.kernelWidth, 2));
  }

  private extractFeatures(samples: PerturbedSample[]): number[][] {
    if (samples.length === 0) return [];
    
    const featureKeys = Object.keys(samples[0].features);
    return samples.map(sample => 
      featureKeys.map(key => {
        const value = sample.features[key];
        return typeof value === 'number' ? value : 0;
      })
    );
  }

  private weightedLinearRegression(features: number[][], predictions: number[], weights: number[]): Record<string, number> {
    // Simplified weighted linear regression
    const coefficients: Record<string, number> = {};
    const numFeatures = features[0]?.length || 0;
    
    for (let i = 0; i < numFeatures; i++) {
      let numerator = 0;
      let denominator = 0;
      
      for (let j = 0; j < features.length; j++) {
        const weight = weights[j];
        const featureValue = features[j][i];
        const prediction = predictions[j];
        
        numerator += weight * featureValue * prediction;
        denominator += weight * featureValue * featureValue;
      }
      
      coefficients[`feature_${i}`] = denominator > 0 ? numerator / denominator : 0;
    }
    
    return coefficients;
  }

  private calculateIntercept(features: number[][], predictions: number[], coefficients: Record<string, number>): number {
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < features.length; i++) {
      let prediction = predictions[i];
      
      for (let j = 0; j < features[i].length; j++) {
        prediction -= coefficients[`feature_${j}`] * features[i][j];
      }
      
      weightedSum += prediction;
      totalWeight += 1;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculateR2Score(features: number[][], predictions: number[], coefficients: Record<string, number>, intercept: number): number {
    let ssRes = 0;
    let ssTot = 0;
    const meanPrediction = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    
    for (let i = 0; i < features.length; i++) {
      const predicted = this.predictWithLocalModel(features[i], { coefficients, intercept, r2Score: 0, mse: 0 });
      ssRes += Math.pow(predictions[i] - predicted, 2);
      ssTot += Math.pow(predictions[i] - meanPrediction, 2);
    }
    
    return ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  }

  private calculateMSE(features: number[][], predictions: number[], coefficients: Record<string, number>, intercept: number): number {
    let mse = 0;
    
    for (let i = 0; i < features.length; i++) {
      const predicted = this.predictWithLocalModel(features[i], { coefficients, intercept, r2Score: 0, mse: 0 });
      mse += Math.pow(predictions[i] - predicted, 2);
    }
    
    return mse / features.length;
  }

  private predictWithLocalModel(features: number[], localModel: LocalModel): number {
    let prediction = localModel.intercept;
    
    for (let i = 0; i < features.length; i++) {
      prediction += localModel.coefficients[`feature_${i}`] * features[i];
    }
    
    return prediction;
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

  private categorizeFeature(feature: string): FeatureImportance['category'] {
    if (feature.includes('threat') || feature.includes('severity')) return 'threat_indicator';
    if (feature.includes('risk') || feature.includes('impact')) return 'risk_factor';
    if (feature.includes('ip') || feature.includes('port') || feature.includes('protocol')) return 'contextual';
    if (feature.includes('time') || feature.includes('date')) return 'temporal';
    if (feature.includes('behavior') || feature.includes('pattern')) return 'behavioral';
    
    return 'contextual';
  }
}
