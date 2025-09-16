/**
 * LangSmith Service
 * Comprehensive tracing and monitoring service for AI model operations
 * 
 * This service provides:
 * - Automatic tracing of LangChain/LangGraph operations
 * - Performance monitoring and analytics
 * - Error tracking and debugging
 * - Custom metrics and evaluations
 * - Integration with SOC workflows
 */

import { Client } from 'langsmith';
import { Logger } from '../data-ingestion/utils/logger';

export interface LangSmithConfig {
  apiKey: string;
  projectName: string;
  environment: 'development' | 'staging' | 'production';
  enableTracing: boolean;
  enableEvaluations: boolean;
  enableCustomMetrics: boolean;
  samplingRate: number; // 0.0 to 1.0
  retentionDays: number;
  enableErrorTracking: boolean;
  enablePerformanceMonitoring: boolean;
}

export interface TraceMetadata {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  workflowType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  customAttributes?: Record<string, any>;
}

export interface PerformanceMetrics {
  latencyMs: number;
  tokenCount: number;
  costEstimate: number;
  memoryUsage?: number;
  cpuUsage?: number;
  errorRate: number;
  successRate: number;
}

export interface EvaluationResult {
  evaluationId: string;
  traceId: string;
  metricName: string;
  score: number;
  feedback?: string;
  metadata?: Record<string, any>;
}

export interface SOCWorkflowTrace {
  traceId: string;
  workflowType: 'threat_analysis' | 'incident_response' | 'risk_assessment' | 'correlation_analysis';
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  phases: Array<{
    phaseName: string;
    startTime: Date;
    endTime?: Date;
    status: 'running' | 'completed' | 'failed';
    agentType?: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    error?: string;
  }>;
  totalTokens: number;
  totalCost: number;
  performanceMetrics: PerformanceMetrics;
  metadata: TraceMetadata;
}

export class LangSmithService {
  private client: Client;
  private logger: Logger;
  private config: LangSmithConfig;
  private activeTraces: Map<string, SOCWorkflowTrace>;
  private performanceMetrics: Map<string, PerformanceMetrics[]>;

  constructor(config: LangSmithConfig) {
    this.config = config;
    this.logger = new Logger('LangSmithService');
    this.activeTraces = new Map();
    this.performanceMetrics = new Map();

    // Initialize LangSmith client
    this.client = new Client({
      apiKey: config.apiKey,
      project: config.projectName,
    });

    this.logger.info('LangSmith service initialized', {
      project: config.projectName,
      environment: config.environment,
      tracingEnabled: config.enableTracing,
      evaluationsEnabled: config.enableEvaluations,
    });
  }

  /**
   * Start tracing a SOC workflow
   * Creates a new trace for monitoring the entire workflow execution
   */
  async startWorkflowTrace(
    workflowType: SOCWorkflowTrace['workflowType'],
    metadata: TraceMetadata = {}
  ): Promise<string> {
    if (!this.config.enableTracing) {
      return 'tracing_disabled';
    }

    const traceId = `soc_workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const trace: SOCWorkflowTrace = {
      traceId,
      workflowType,
      startTime: new Date(),
      status: 'running',
      phases: [],
      totalTokens: 0,
      totalCost: 0,
      performanceMetrics: {
        latencyMs: 0,
        tokenCount: 0,
        costEstimate: 0,
        errorRate: 0,
        successRate: 0,
      },
      metadata,
    };

    this.activeTraces.set(traceId, trace);

    this.logger.info('Started SOC workflow trace', {
      traceId,
      workflowType,
      metadata,
    });

    return traceId;
  }

  /**
   * Start tracing a specific phase within a workflow
   * Tracks individual agent operations and their performance
   */
  async startPhaseTrace(
    traceId: string,
    phaseName: string,
    agentType?: string
  ): Promise<void> {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      this.logger.warn('Trace not found', { traceId });
      return;
    }

    const phase = {
      phaseName,
      startTime: new Date(),
      status: 'running' as const,
      agentType,
    };

    trace.phases.push(phase);

    this.logger.debug('Started phase trace', {
      traceId,
      phaseName,
      agentType,
    });
  }

  /**
   * Complete a phase trace with performance metrics
   * Records completion time, token usage, and any errors
   */
  async completePhaseTrace(
    traceId: string,
    phaseName: string,
    metrics: {
      inputTokens?: number;
      outputTokens?: number;
      latencyMs?: number;
      error?: string;
    } = {}
  ): Promise<void> {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      this.logger.warn('Trace not found', { traceId });
      return;
    }

    const phase = trace.phases.find(p => p.phaseName === phaseName && !p.endTime);
    if (!phase) {
      this.logger.warn('Phase not found', { traceId, phaseName });
      return;
    }

    phase.endTime = new Date();
    phase.status = metrics.error ? 'failed' : 'completed';
    phase.inputTokens = metrics.inputTokens;
    phase.outputTokens = metrics.outputTokens;
    phase.latencyMs = metrics.latencyMs;
    phase.error = metrics.error;

    // Update trace totals
    trace.totalTokens += (metrics.inputTokens || 0) + (metrics.outputTokens || 0);
    trace.totalCost += this.calculateCost(metrics.inputTokens || 0, metrics.outputTokens || 0);

    this.logger.debug('Completed phase trace', {
      traceId,
      phaseName,
      metrics,
    });
  }

  /**
   * Complete the entire workflow trace
   * Finalizes the trace and sends it to LangSmith
   */
  async completeWorkflowTrace(
    traceId: string,
    status: 'completed' | 'failed' | 'cancelled' = 'completed',
    finalMetrics?: Partial<PerformanceMetrics>
  ): Promise<void> {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      this.logger.warn('Trace not found', { traceId });
      return;
    }

    trace.endTime = new Date();
    trace.status = status;

    // Calculate final performance metrics
    const totalLatency = trace.endTime.getTime() - trace.startTime.getTime();
    const completedPhases = trace.phases.filter(p => p.status === 'completed').length;
    const failedPhases = trace.phases.filter(p => p.status === 'failed').length;
    const totalPhases = trace.phases.length;

    trace.performanceMetrics = {
      latencyMs: totalLatency,
      tokenCount: trace.totalTokens,
      costEstimate: trace.totalCost,
      errorRate: totalPhases > 0 ? failedPhases / totalPhases : 0,
      successRate: totalPhases > 0 ? completedPhases / totalPhases : 0,
      ...finalMetrics,
    };

    // Send trace to LangSmith
    if (this.config.enableTracing) {
      await this.sendTraceToLangSmith(trace);
    }

    // Store performance metrics for trend analysis
    this.storePerformanceMetrics(traceId, trace.performanceMetrics);

    this.activeTraces.delete(traceId);

    this.logger.info('Completed SOC workflow trace', {
      traceId,
      status,
      totalLatency,
      totalTokens: trace.totalTokens,
      totalCost: trace.totalCost,
      successRate: trace.performanceMetrics.successRate,
    });
  }

  /**
   * Log a custom event or metric
   * Useful for tracking specific SOC operations and custom metrics
   */
  async logCustomEvent(
    traceId: string,
    eventName: string,
    data: Record<string, any>,
    level: 'info' | 'warn' | 'error' = 'info'
  ): Promise<void> {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      this.logger.warn('Trace not found for custom event', { traceId });
      return;
    }

    // Add custom attributes to trace metadata
    if (!trace.metadata.customAttributes) {
      trace.metadata.customAttributes = {};
    }
    trace.metadata.customAttributes[eventName] = {
      timestamp: new Date(),
      level,
      data,
    };

    this.logger.log(level, 'Custom event logged', {
      traceId,
      eventName,
      data,
    });
  }

  /**
   * Run evaluations on traces
   * Implements custom SOC-specific evaluations for AI model performance
   */
  async runEvaluations(
    traceIds: string[],
    evaluationTypes: Array<'accuracy' | 'latency' | 'cost' | 'security_relevance'>
  ): Promise<EvaluationResult[]> {
    if (!this.config.enableEvaluations) {
      this.logger.warn('Evaluations are disabled');
      return [];
    }

    const results: EvaluationResult[] = [];

    for (const traceId of traceIds) {
      const trace = this.activeTraces.get(traceId);
      if (!trace) {
        // Try to get from completed traces (would need persistence in real implementation)
        continue;
      }

      for (const evaluationType of evaluationTypes) {
        const result = await this.runSingleEvaluation(traceId, evaluationType, trace);
        if (result) {
          results.push(result);
        }
      }
    }

    this.logger.info('Evaluations completed', {
      traceCount: traceIds.length,
      evaluationCount: results.length,
    });

    return results;
  }

  /**
   * Get performance analytics for a time period
   * Provides insights into system performance and trends
   */
  async getPerformanceAnalytics(
    startDate: Date,
    endDate: Date,
    workflowType?: string
  ): Promise<{
    totalTraces: number;
    averageLatency: number;
    averageCost: number;
    successRate: number;
    errorRate: number;
    topErrors: Array<{ error: string; count: number }>;
    performanceTrends: Array<{ date: string; latency: number; cost: number; successRate: number }>;
  }> {
    // In a real implementation, this would query LangSmith's analytics API
    // For now, we'll return mock data based on stored metrics
    
    const allMetrics = Array.from(this.performanceMetrics.values()).flat();
    const filteredMetrics = allMetrics.filter(metric => {
      // Filter by date range and workflow type if specified
      return true; // Simplified for demo
    });

    const totalTraces = filteredMetrics.length;
    const averageLatency = filteredMetrics.reduce((sum, m) => sum + m.latencyMs, 0) / totalTraces || 0;
    const averageCost = filteredMetrics.reduce((sum, m) => sum + m.costEstimate, 0) / totalTraces || 0;
    const successRate = filteredMetrics.reduce((sum, m) => sum + m.successRate, 0) / totalTraces || 0;
    const errorRate = filteredMetrics.reduce((sum, m) => sum + m.errorRate, 0) / totalTraces || 0;

    return {
      totalTraces,
      averageLatency,
      averageCost,
      successRate,
      errorRate,
      topErrors: [], // Would be populated from actual error data
      performanceTrends: [], // Would be populated from time-series data
    };
  }

  /**
   * Configure alerting thresholds
   * Sets up monitoring alerts for performance degradation
   */
  async configureAlerts(thresholds: {
    maxLatencyMs: number;
    maxErrorRate: number;
    maxCostPerTrace: number;
    minSuccessRate: number;
  }): Promise<void> {
    this.logger.info('Alert thresholds configured', { thresholds });
    
    // In a real implementation, this would configure LangSmith alerts
    // or integrate with external monitoring systems
  }

  /**
   * Export trace data for analysis
   * Allows exporting traces in various formats for external analysis
   */
  async exportTraces(
    traceIds: string[],
    format: 'json' | 'csv' | 'parquet'
  ): Promise<string> {
    const traces = traceIds.map(id => this.activeTraces.get(id)).filter(Boolean);
    
    switch (format) {
      case 'json':
        return JSON.stringify(traces, null, 2);
      case 'csv':
        return this.convertTracesToCSV(traces);
      case 'parquet':
        throw new Error('Parquet export not implemented');
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Private helper methods

  private async sendTraceToLangSmith(trace: SOCWorkflowTrace): Promise<void> {
    try {
      // Send trace to LangSmith using the actual client
      const traceData = {
        name: `soc_workflow_${trace.workflowType}`,
        run_type: 'chain',
        inputs: {
          workflowType: trace.workflowType,
          metadata: trace.metadata,
        },
        outputs: {
          status: trace.status,
          phases: trace.phases.length,
          totalTokens: trace.totalTokens,
          totalCost: trace.totalCost,
        },
        start_time: trace.startTime,
        end_time: trace.endTime,
        run_id: trace.traceId,
        project_name: this.config.projectName,
        tags: trace.metadata.tags || [],
        metadata: {
          ...trace.metadata.customAttributes,
          phases: trace.phases.map(phase => ({
            name: phase.phaseName,
            status: phase.status,
            latencyMs: phase.latencyMs,
            inputTokens: phase.inputTokens,
            outputTokens: phase.outputTokens,
            error: phase.error,
          })),
          performanceMetrics: trace.performanceMetrics,
        },
      };

      // Use LangSmith client to create the trace
      await this.client.createRun(traceData);
      
      this.logger.debug('Trace sent to LangSmith', {
        traceId: trace.traceId,
        workflowType: trace.workflowType,
        phases: trace.phases.length,
      });
    } catch (error) {
      this.logger.error('Failed to send trace to LangSmith', { error });
      // Don't throw error to avoid breaking workflow execution
    }
  }

  private async runSingleEvaluation(
    traceId: string,
    evaluationType: string,
    trace: SOCWorkflowTrace
  ): Promise<EvaluationResult | null> {
    let score = 0;
    let feedback = '';

    switch (evaluationType) {
      case 'accuracy':
        // Evaluate accuracy based on phase completion and error rates
        score = trace.performanceMetrics.successRate * 100;
        feedback = `Success rate: ${(trace.performanceMetrics.successRate * 100).toFixed(1)}%`;
        break;
      case 'latency':
        // Evaluate latency performance
        const maxLatency = 30000; // 30 seconds
        score = Math.max(0, 100 - (trace.performanceMetrics.latencyMs / maxLatency) * 100);
        feedback = `Latency: ${trace.performanceMetrics.latencyMs}ms`;
        break;
      case 'cost':
        // Evaluate cost efficiency
        const maxCost = 10; // $10 per trace
        score = Math.max(0, 100 - (trace.performanceMetrics.costEstimate / maxCost) * 100);
        feedback = `Cost: $${trace.performanceMetrics.costEstimate.toFixed(2)}`;
        break;
      case 'security_relevance':
        // Evaluate security relevance based on workflow type and metadata
        score = this.evaluateSecurityRelevance(trace);
        feedback = `Security relevance score based on workflow type and severity`;
        break;
      default:
        return null;
    }

    return {
      evaluationId: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      traceId,
      metricName: evaluationType,
      score,
      feedback,
      metadata: {
        workflowType: trace.workflowType,
        timestamp: new Date(),
      },
    };
  }

  private evaluateSecurityRelevance(trace: SOCWorkflowTrace): number {
    // Base score on workflow type and severity
    let score = 50; // Base score
    
    switch (trace.workflowType) {
      case 'threat_analysis':
        score += 30;
        break;
      case 'incident_response':
        score += 25;
        break;
      case 'risk_assessment':
        score += 20;
        break;
      case 'correlation_analysis':
        score += 15;
        break;
    }

    // Adjust based on severity
    if (trace.metadata.severity === 'critical') score += 20;
    else if (trace.metadata.severity === 'high') score += 15;
    else if (trace.metadata.severity === 'medium') score += 10;
    else if (trace.metadata.severity === 'low') score += 5;

    return Math.min(100, score);
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Simplified cost calculation (would use actual model pricing)
    const inputCost = inputTokens * 0.0000015; // $0.0015 per 1K tokens
    const outputCost = outputTokens * 0.000006; // $0.006 per 1K tokens
    return inputCost + outputCost;
  }

  private storePerformanceMetrics(traceId: string, metrics: PerformanceMetrics): void {
    if (!this.performanceMetrics.has(traceId)) {
      this.performanceMetrics.set(traceId, []);
    }
    this.performanceMetrics.get(traceId)!.push(metrics);
  }

  private convertTracesToCSV(traces: SOCWorkflowTrace[]): string {
    const headers = [
      'traceId',
      'workflowType',
      'startTime',
      'endTime',
      'status',
      'totalTokens',
      'totalCost',
      'latencyMs',
      'successRate',
      'errorRate',
    ];

    const rows = traces.map(trace => [
      trace.traceId,
      trace.workflowType,
      trace.startTime.toISOString(),
      trace.endTime?.toISOString() || '',
      trace.status,
      trace.totalTokens.toString(),
      trace.totalCost.toString(),
      trace.performanceMetrics.latencyMs.toString(),
      trace.performanceMetrics.successRate.toString(),
      trace.performanceMetrics.errorRate.toString(),
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  // Public API methods

  getActiveTraces(): SOCWorkflowTrace[] {
    return Array.from(this.activeTraces.values());
  }

  getTrace(traceId: string): SOCWorkflowTrace | undefined {
    return this.activeTraces.get(traceId);
  }

  updateConfig(config: Partial<LangSmithConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('LangSmith configuration updated', { config });
  }

  getConfig(): LangSmithConfig {
    return { ...this.config };
  }

  getServiceStatus(): {
    isEnabled: boolean;
    activeTraces: number;
    totalMetrics: number;
    projectName: string;
    environment: string;
  } {
    return {
      isEnabled: this.config.enableTracing,
      activeTraces: this.activeTraces.size,
      totalMetrics: Array.from(this.performanceMetrics.values()).flat().length,
      projectName: this.config.projectName,
      environment: this.config.environment,
    };
  }
}
