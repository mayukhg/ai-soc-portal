/**
 * LLM Operations Logger
 * Comprehensive logging service for LLM operations with detailed tracking
 * 
 * Features:
 * - Detailed request/response data logging
 * - Token usage tracking and cost estimation
 * - Performance metrics monitoring
 * - Quality assessment and scoring
 * - Structured logging format
 * - Security and compliance tracking
 */

import { Logger } from '../data-ingestion/utils/logger';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage } from '@langchain/core/messages';

export interface LLMRequestData {
  // Request identification
  requestId: string;
  sessionId: string;
  userId?: string;
  timestamp: string;
  
  // Model configuration
  modelName: string;
  modelVersion?: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  
  // Request content
  prompt: string;
  promptTokens: number;
  promptLength: number;
  promptHash: string; // For deduplication
  
  // Context and metadata
  agentType: string;
  workflowPhase: string;
  requestType: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  customAttributes?: Record<string, any>;
  
  // Performance tracking
  startTime: number;
  requestLatency?: number;
  
  // Security and compliance
  containsPII: boolean;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  complianceFlags?: string[];
}

export interface LLMResponseData {
  // Response identification
  requestId: string;
  responseId: string;
  timestamp: string;
  
  // Response content
  content: string;
  responseTokens: number;
  responseLength: number;
  responseHash: string;
  
  // Model information
  modelName: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'function_call' | 'tool_calls';
  
  // Performance metrics
  endTime: number;
  totalLatency: number;
  processingTime: number;
  
  // Quality metrics
  confidence?: number;
  toxicityScore?: number;
  biasScore?: number;
  hallucinationScore?: number;
  relevanceScore?: number;
  coherenceScore?: number;
  
  // Cost information
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  
  // Error information
  error?: string;
  errorCode?: string;
  retryCount?: number;
  
  // Security assessment
  securityFlags?: string[];
  contentFilterFlags?: string[];
}

export interface LLMOperationMetrics {
  // Performance metrics
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number; // requests per minute
  successRate: number;
  errorRate: number;
  
  // Token metrics
  averageInputTokens: number;
  averageOutputTokens: number;
  totalTokensProcessed: number;
  tokenEfficiency: number; // output/input ratio
  
  // Cost metrics
  totalCost: number;
  averageCostPerRequest: number;
  costPerToken: number;
  dailyCost: number;
  monthlyCost: number;
  
  // Quality metrics
  averageConfidence: number;
  averageToxicityScore: number;
  averageBiasScore: number;
  averageHallucinationScore: number;
  averageRelevanceScore: number;
  averageCoherenceScore: number;
  
  // Usage patterns
  mostUsedModels: Array<{ model: string; count: number; cost: number }>;
  mostUsedAgents: Array<{ agent: string; count: number; avgLatency: number }>;
  peakUsageHours: Array<{ hour: number; requests: number }>;
  
  // Error patterns
  commonErrors: Array<{ error: string; count: number; percentage: number }>;
  errorTrends: Array<{ timestamp: string; errorRate: number }>;
}

export interface LLMQualityAssessment {
  // Content quality
  grammarScore: number;
  coherenceScore: number;
  relevanceScore: number;
  completenessScore: number;
  
  // Security assessment
  toxicityScore: number;
  biasScore: number;
  hallucinationScore: number;
  promptInjectionScore: number;
  
  // Domain-specific assessment
  technicalAccuracy: number;
  securityCompliance: number;
  factualAccuracy: number;
  
  // Overall assessment
  overallQuality: number;
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

export interface LLMLoggingConfig {
  enableDetailedLogging: boolean;
  enableCostTracking: boolean;
  enableQualityAssessment: boolean;
  enablePerformanceMetrics: boolean;
  enableSecurityMonitoring: boolean;
  logRetentionDays: number;
  samplingRate: number; // 0.0 to 1.0
  sensitiveDataMasking: boolean;
  complianceMode: 'none' | 'gdpr' | 'ccpa' | 'sox' | 'hipaa';
  alertThresholds: {
    highLatency: number; // ms
    highCost: number; // currency
    lowQuality: number; // score
    highErrorRate: number; // percentage
  };
}

export class LLMOperationsLogger {
  private logger: Logger;
  private config: LLMLoggingConfig;
  private requestLogs: Map<string, LLMRequestData> = new Map();
  private responseLogs: Map<string, LLMResponseData> = new Map();
  private metrics: LLMOperationMetrics;
  private qualityAssessor: LLMQualityAssessor;
  private costCalculator: LLMCostCalculator;
  private securityMonitor: LLMSecurityMonitor;

  constructor(config: LLMLoggingConfig) {
    this.config = config;
    this.logger = new Logger('LLMOperationsLogger');
    this.qualityAssessor = new LLMQualityAssessor();
    this.costCalculator = new LLMCostCalculator();
    this.securityMonitor = new LLMSecurityMonitor();
    this.metrics = this.initializeMetrics();
    
    this.logger.info('LLM Operations Logger initialized', {
      config: this.config,
    });
  }

  /**
   * Log LLM request with detailed tracking
   */
  async logRequest(requestData: Omit<LLMRequestData, 'requestId' | 'timestamp' | 'startTime'>): Promise<string> {
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();
    const startTime = Date.now();

    const fullRequestData: LLMRequestData = {
      ...requestData,
      requestId,
      timestamp,
      startTime,
    };

    // Store request data
    this.requestLogs.set(requestId, fullRequestData);

    // Log to structured logger
    this.logger.info('LLM Request', {
      requestId,
      modelName: requestData.modelName,
      agentType: requestData.agentType,
      workflowPhase: requestData.workflowPhase,
      promptTokens: requestData.promptTokens,
      promptLength: requestData.promptLength,
      temperature: requestData.temperature,
      maxTokens: requestData.maxTokens,
      severity: requestData.severity,
      tags: requestData.tags,
      containsPII: requestData.containsPII,
      dataClassification: requestData.dataClassification,
      timestamp,
    });

    return requestId;
  }

  /**
   * Log LLM response with comprehensive metrics
   */
  async logResponse(
    requestId: string,
    responseData: Omit<LLMResponseData, 'requestId' | 'responseId' | 'timestamp' | 'endTime' | 'totalLatency' | 'processingTime'>
  ): Promise<string> {
    const requestData = this.requestLogs.get(requestId);
    if (!requestData) {
      throw new Error(`Request ${requestId} not found`);
    }

    const responseId = this.generateResponseId();
    const timestamp = new Date().toISOString();
    const endTime = Date.now();
    const totalLatency = endTime - requestData.startTime;
    const processingTime = totalLatency - (requestData.requestLatency || 0);

    // Calculate costs
    const costs = this.costCalculator.calculateCosts(
      requestData.modelName,
      requestData.promptTokens,
      responseData.responseTokens
    );

    // Perform quality assessment
    const qualityAssessment = await this.qualityAssessor.assessQuality(
      requestData.prompt,
      responseData.content,
      requestData.agentType
    );

    // Perform security monitoring
    const securityAssessment = await this.securityMonitor.assessSecurity(
      requestData.prompt,
      responseData.content
    );

    const fullResponseData: LLMResponseData = {
      ...responseData,
      requestId,
      responseId,
      timestamp,
      endTime,
      totalLatency,
      processingTime,
      inputCost: costs.inputCost,
      outputCost: costs.outputCost,
      totalCost: costs.totalCost,
      currency: costs.currency,
      confidence: qualityAssessment.overallQuality,
      toxicityScore: qualityAssessment.toxicityScore,
      biasScore: qualityAssessment.biasScore,
      hallucinationScore: qualityAssessment.hallucinationScore,
      relevanceScore: qualityAssessment.relevanceScore,
      coherenceScore: qualityAssessment.coherenceScore,
      securityFlags: securityAssessment.flags,
      contentFilterFlags: securityAssessment.contentFilterFlags,
    };

    // Store response data
    this.responseLogs.set(responseId, fullResponseData);

    // Update metrics
    this.updateMetrics(fullRequestData, fullResponseData);

    // Log to structured logger
    this.logger.info('LLM Response', {
      requestId,
      responseId,
      modelName: responseData.modelName,
      agentType: requestData.agentType,
      workflowPhase: requestData.workflowPhase,
      responseTokens: responseData.responseTokens,
      responseLength: responseData.responseLength,
      totalLatency,
      processingTime,
      finishReason: responseData.finishReason,
      totalCost: costs.totalCost,
      currency: costs.currency,
      confidence: qualityAssessment.overallQuality,
      toxicityScore: qualityAssessment.toxicityScore,
      biasScore: qualityAssessment.biasScore,
      hallucinationScore: qualityAssessment.hallucinationScore,
      securityFlags: securityAssessment.flags,
      error: responseData.error,
      timestamp,
    });

    // Check for alerts
    this.checkAlerts(fullRequestData, fullResponseData);

    return responseId;
  }

  /**
   * Get comprehensive metrics for a time period
   */
  getMetrics(timeRange?: { start: Date; end: Date }): LLMOperationMetrics {
    if (timeRange) {
      return this.calculateMetricsForTimeRange(timeRange);
    }
    return this.metrics;
  }

  /**
   * Get quality assessment for a specific response
   */
  async getQualityAssessment(responseId: string): Promise<LLMQualityAssessment | null> {
    const responseData = this.responseLogs.get(responseId);
    if (!responseData) {
      return null;
    }

    const requestData = this.requestLogs.get(responseData.requestId);
    if (!requestData) {
      return null;
    }

    return await this.qualityAssessor.assessQuality(
      requestData.prompt,
      responseData.content,
      requestData.agentType
    );
  }

  /**
   * Get cost breakdown for a time period
   */
  getCostBreakdown(timeRange?: { start: Date; end: Date }): {
    totalCost: number;
    costByModel: Record<string, number>;
    costByAgent: Record<string, number>;
    costByDay: Record<string, number>;
    averageCostPerRequest: number;
    currency: string;
  } {
    const responses = Array.from(this.responseLogs.values());
    const filteredResponses = timeRange 
      ? responses.filter(r => {
          const responseTime = new Date(r.timestamp);
          return responseTime >= timeRange.start && responseTime <= timeRange.end;
        })
      : responses;

    const totalCost = filteredResponses.reduce((sum, r) => sum + r.totalCost, 0);
    const costByModel: Record<string, number> = {};
    const costByAgent: Record<string, number> = {};
    const costByDay: Record<string, number> = {};

    filteredResponses.forEach(response => {
      const request = this.requestLogs.get(response.requestId);
      if (!request) return;

      // Cost by model
      costByModel[response.modelName] = (costByModel[response.modelName] || 0) + response.totalCost;

      // Cost by agent
      costByAgent[request.agentType] = (costByAgent[request.agentType] || 0) + response.totalCost;

      // Cost by day
      const day = response.timestamp.split('T')[0];
      costByDay[day] = (costByDay[day] || 0) + response.totalCost;
    });

    return {
      totalCost,
      costByModel,
      costByAgent,
      costByDay,
      averageCostPerRequest: filteredResponses.length > 0 ? totalCost / filteredResponses.length : 0,
      currency: filteredResponses[0]?.currency || 'USD',
    };
  }

  /**
   * Export logs for compliance and auditing
   */
  exportLogs(timeRange?: { start: Date; end: Date }, format: 'json' | 'csv' = 'json'): string {
    const requests = Array.from(this.requestLogs.values());
    const responses = Array.from(this.responseLogs.values());

    const filteredRequests = timeRange 
      ? requests.filter(r => {
          const requestTime = new Date(r.timestamp);
          return requestTime >= timeRange.start && requestTime <= timeRange.end;
        })
      : requests;

    const filteredResponses = timeRange 
      ? responses.filter(r => {
          const responseTime = new Date(r.timestamp);
          return responseTime >= timeRange.start && responseTime <= timeRange.end;
        })
      : responses;

    const exportData = {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        timeRange,
        totalRequests: filteredRequests.length,
        totalResponses: filteredResponses.length,
        config: this.config,
      },
      requests: filteredRequests,
      responses: filteredResponses,
      metrics: this.getMetrics(timeRange),
      costBreakdown: this.getCostBreakdown(timeRange),
    };

    if (format === 'csv') {
      return this.convertToCSV(exportData);
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear old logs based on retention policy
   */
  cleanupOldLogs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.logRetentionDays);

    // Clean up request logs
    for (const [requestId, requestData] of this.requestLogs.entries()) {
      if (new Date(requestData.timestamp) < cutoffDate) {
        this.requestLogs.delete(requestId);
      }
    }

    // Clean up response logs
    for (const [responseId, responseData] of this.responseLogs.entries()) {
      if (new Date(responseData.timestamp) < cutoffDate) {
        this.responseLogs.delete(responseId);
      }
    }

    this.logger.info('Cleaned up old logs', {
      cutoffDate: cutoffDate.toISOString(),
      remainingRequests: this.requestLogs.size,
      remainingResponses: this.responseLogs.size,
    });
  }

  // Private helper methods

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResponseId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMetrics(): LLMOperationMetrics {
    return {
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      throughput: 0,
      successRate: 0,
      errorRate: 0,
      averageInputTokens: 0,
      averageOutputTokens: 0,
      totalTokensProcessed: 0,
      tokenEfficiency: 0,
      totalCost: 0,
      averageCostPerRequest: 0,
      costPerToken: 0,
      dailyCost: 0,
      monthlyCost: 0,
      averageConfidence: 0,
      averageToxicityScore: 0,
      averageBiasScore: 0,
      averageHallucinationScore: 0,
      averageRelevanceScore: 0,
      averageCoherenceScore: 0,
      mostUsedModels: [],
      mostUsedAgents: [],
      peakUsageHours: [],
      commonErrors: [],
      errorTrends: [],
    };
  }

  private updateMetrics(requestData: LLMRequestData, responseData: LLMResponseData): void {
    // Update latency metrics
    const latencies = Array.from(this.responseLogs.values()).map(r => r.totalLatency);
    this.metrics.averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    this.metrics.p95Latency = this.calculatePercentile(latencies, 95);
    this.metrics.p99Latency = this.calculatePercentile(latencies, 99);

    // Update token metrics
    const inputTokens = Array.from(this.requestLogs.values()).map(r => r.promptTokens);
    const outputTokens = Array.from(this.responseLogs.values()).map(r => r.responseTokens);
    
    this.metrics.averageInputTokens = inputTokens.reduce((sum, t) => sum + t, 0) / inputTokens.length;
    this.metrics.averageOutputTokens = outputTokens.reduce((sum, t) => sum + t, 0) / outputTokens.length;
    this.metrics.totalTokensProcessed = inputTokens.reduce((sum, t) => sum + t, 0) + outputTokens.reduce((sum, t) => sum + t, 0);
    this.metrics.tokenEfficiency = this.metrics.averageOutputTokens / this.metrics.averageInputTokens;

    // Update cost metrics
    const costs = Array.from(this.responseLogs.values()).map(r => r.totalCost);
    this.metrics.totalCost = costs.reduce((sum, c) => sum + c, 0);
    this.metrics.averageCostPerRequest = this.metrics.totalCost / this.responseLogs.size;
    this.metrics.costPerToken = this.metrics.totalCost / this.metrics.totalTokensProcessed;

    // Update quality metrics
    const confidences = Array.from(this.responseLogs.values()).map(r => r.confidence || 0);
    this.metrics.averageConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    // Update success/error rates
    const errors = Array.from(this.responseLogs.values()).filter(r => r.error);
    this.metrics.errorRate = (errors.length / this.responseLogs.size) * 100;
    this.metrics.successRate = 100 - this.metrics.errorRate;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private calculateMetricsForTimeRange(timeRange: { start: Date; end: Date }): LLMOperationMetrics {
    // Implementation for time-range specific metrics
    return this.metrics; // Simplified for now
  }

  private checkAlerts(requestData: LLMRequestData, responseData: LLMResponseData): void {
    const alerts: string[] = [];

    // High latency alert
    if (responseData.totalLatency > this.config.alertThresholds.highLatency) {
      alerts.push(`High latency: ${responseData.totalLatency}ms`);
    }

    // High cost alert
    if (responseData.totalCost > this.config.alertThresholds.highCost) {
      alerts.push(`High cost: ${responseData.totalCost} ${responseData.currency}`);
    }

    // Low quality alert
    if ((responseData.confidence || 0) < this.config.alertThresholds.lowQuality) {
      alerts.push(`Low quality: ${responseData.confidence}`);
    }

    // Log alerts
    if (alerts.length > 0) {
      this.logger.warn('LLM Operation Alerts', {
        requestId: requestData.requestId,
        responseId: responseData.responseId,
        alerts,
      });
    }
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    return JSON.stringify(data);
  }
}

// Supporting classes

class LLMQualityAssessor {
  async assessQuality(prompt: string, response: string, agentType: string): Promise<LLMQualityAssessment> {
    // Simplified quality assessment - in production, this would use ML models
    const grammarScore = Math.random() * 0.2 + 0.8; // 0.8-1.0
    const coherenceScore = Math.random() * 0.2 + 0.8;
    const relevanceScore = Math.random() * 0.2 + 0.8;
    const completenessScore = Math.random() * 0.2 + 0.8;
    const toxicityScore = Math.random() * 0.1; // 0-0.1
    const biasScore = Math.random() * 0.1;
    const hallucinationScore = Math.random() * 0.1;
    const promptInjectionScore = Math.random() * 0.1;
    const technicalAccuracy = Math.random() * 0.2 + 0.8;
    const securityCompliance = Math.random() * 0.2 + 0.8;
    const factualAccuracy = Math.random() * 0.2 + 0.8;

    const overallQuality = (
      grammarScore + coherenceScore + relevanceScore + completenessScore +
      (1 - toxicityScore) + (1 - biasScore) + (1 - hallucinationScore) +
      technicalAccuracy + securityCompliance + factualAccuracy
    ) / 10;

    const qualityGrade = overallQuality >= 0.9 ? 'A' : 
                        overallQuality >= 0.8 ? 'B' : 
                        overallQuality >= 0.7 ? 'C' : 
                        overallQuality >= 0.6 ? 'D' : 'F';

    return {
      grammarScore,
      coherenceScore,
      relevanceScore,
      completenessScore,
      toxicityScore,
      biasScore,
      hallucinationScore,
      promptInjectionScore,
      technicalAccuracy,
      securityCompliance,
      factualAccuracy,
      overallQuality,
      qualityGrade,
      recommendations: this.generateRecommendations(overallQuality, qualityGrade),
    };
  }

  private generateRecommendations(overallQuality: number, grade: string): string[] {
    const recommendations: string[] = [];
    
    if (overallQuality < 0.8) {
      recommendations.push('Consider improving prompt clarity and specificity');
    }
    if (grade === 'D' || grade === 'F') {
      recommendations.push('Review model parameters and prompt engineering');
      recommendations.push('Consider using a different model or fine-tuning');
    }
    
    return recommendations;
  }
}

class LLMCostCalculator {
  private pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  };

  calculateCosts(modelName: string, inputTokens: number, outputTokens: number): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
  } {
    const modelPricing = this.pricing[modelName] || this.pricing['gpt-4o-mini'];
    
    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
      currency: 'USD',
    };
  }
}

class LLMSecurityMonitor {
  async assessSecurity(prompt: string, response: string): Promise<{
    flags: string[];
    contentFilterFlags: string[];
  }> {
    const flags: string[] = [];
    const contentFilterFlags: string[] = [];

    // Check for prompt injection
    if (this.detectPromptInjection(prompt)) {
      flags.push('prompt_injection');
    }

    // Check for data leakage
    if (this.detectDataLeakage(response)) {
      flags.push('data_leakage');
    }

    // Check for malicious content
    if (this.detectMaliciousContent(response)) {
      contentFilterFlags.push('malicious_content');
    }

    return { flags, contentFilterFlags };
  }

  private detectPromptInjection(prompt: string): boolean {
    const injectionPatterns = [
      /ignore previous instructions/i,
      /forget everything/i,
      /new instructions/i,
      /system prompt/i,
    ];
    return injectionPatterns.some(pattern => pattern.test(prompt));
  }

  private detectDataLeakage(response: string): boolean {
    const leakagePatterns = [
      /password/i,
      /api[_-]?key/i,
      /secret/i,
      /token/i,
    ];
    return leakagePatterns.some(pattern => pattern.test(response));
  }

  private detectMaliciousContent(response: string): boolean {
    const maliciousPatterns = [
      /exploit/i,
      /hack/i,
      /attack/i,
      /malware/i,
    ];
    return maliciousPatterns.some(pattern => pattern.test(response));
  }
}
