/**
 * Rubric Integration Service
 * Integrates the LLM Rubric Framework with existing evaluation services
 * 
 * This service provides:
 * - Integration with EvaluationService, RAGASService, and LangSmithService
 * - Automated rubric application to LLM outputs
 * - Performance comparison and benchmarking
 * - Comprehensive evaluation reporting
 */

import { Logger } from '../data-ingestion/utils/logger';
import { LLMRubricFramework, RubricEvaluation, RubricConfig } from './llm-rubric-framework';
import { EvaluationService, EvaluationReport } from '../evaluation/evaluation-service';
import { RAGASService, RAGASEvaluationResult } from '../ragas/ragas-service';
import { LangSmithService, SOCWorkflowTrace } from '../langsmith/langsmith-service';

export interface RubricIntegrationConfig {
  enableRubricEvaluation: boolean;
  enableRAGASIntegration: boolean;
  enableLangSmithIntegration: boolean;
  enableAutomatedScoring: boolean;
  enablePerformanceComparison: boolean;
  evaluationIntervalMs: number;
  reportGenerationIntervalMs: number;
  enableRealTimeMonitoring: boolean;
  alertThresholds: {
    minOverallScore: number;
    minCategoryScore: number;
    maxEvaluationTimeMs: number;
  };
}

export interface ComprehensiveEvaluationResult {
  rubricEvaluation: RubricEvaluation;
  ragasEvaluation?: RAGASEvaluationResult;
  langSmithTrace?: SOCWorkflowTrace;
  performanceMetrics: {
    evaluationTimeMs: number;
    totalScore: number;
    grade: string;
    categoryBreakdown: Record<string, number>;
  };
  recommendations: string[];
  alerts: string[];
  timestamp: Date;
}

export interface RubricBenchmarkResult {
  modelName: string;
  averageScore: number;
  gradeDistribution: Record<string, number>;
  categoryAverages: Record<string, number>;
  evaluationCount: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export class RubricIntegrationService {
  private logger: Logger;
  private config: RubricIntegrationConfig;
  private rubricFramework: LLMRubricFramework;
  private evaluationService?: EvaluationService;
  private ragasService?: RAGASService;
  private langSmithService?: LangSmithService;
  private evaluationResults: ComprehensiveEvaluationResult[];
  private benchmarkResults: RubricBenchmarkResult[];

  constructor(
    config?: Partial<RubricIntegrationConfig>,
    evaluationService?: EvaluationService,
    ragasService?: RAGASService,
    langSmithService?: LangSmithService
  ) {
    this.logger = new Logger('RubricIntegrationService');
    this.config = {
      enableRubricEvaluation: true,
      enableRAGASIntegration: true,
      enableLangSmithIntegration: true,
      enableAutomatedScoring: true,
      enablePerformanceComparison: true,
      evaluationIntervalMs: 300000, // 5 minutes
      reportGenerationIntervalMs: 3600000, // 1 hour
      enableRealTimeMonitoring: true,
      alertThresholds: {
        minOverallScore: 0.7,
        minCategoryScore: 0.6,
        maxEvaluationTimeMs: 30000,
      },
    };

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.rubricFramework = new LLMRubricFramework();
    this.evaluationService = evaluationService;
    this.ragasService = ragasService;
    this.langSmithService = langSmithService;
    this.evaluationResults = [];
    this.benchmarkResults = [];

    this.logger.info('Rubric Integration Service initialized', {
      enableRubricEvaluation: this.config.enableRubricEvaluation,
      enableRAGASIntegration: this.config.enableRAGASIntegration,
      enableLangSmithIntegration: this.config.enableLangSmithIntegration,
    });
  }

  /**
   * Evaluate an LLM response using all available evaluation methods
   */
  async evaluateLLMResponse(
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
  ): Promise<ComprehensiveEvaluationResult> {
    const startTime = Date.now();
    this.logger.info('Starting comprehensive LLM response evaluation', {
      inputType: context.inputType,
      responseLength: response.length,
      traceId: context.traceId,
    });

    try {
      // 1. Run rubric evaluation
      const rubricEvaluation = await this.rubricFramework.evaluateResponse(response, {
        inputType: context.inputType,
        question: context.question,
        severity: context.severity,
        userId: context.userId,
        sessionId: context.sessionId,
        metadata: context.metadata,
      });

      // 2. Run RAGAS evaluation if enabled and context is available
      let ragasEvaluation: RAGASEvaluationResult | undefined;
      if (this.config.enableRAGASIntegration && this.ragasService && context.question) {
        try {
          // Create a mock dataset for RAGAS evaluation
          const mockDataset = {
            id: `eval_${Date.now()}`,
            question: context.question,
            groundTruth: context.metadata?.groundTruth || 'No ground truth available',
            context: context.metadata?.context || [response],
            answer: response,
            socContext: {
              alertType: context.inputType,
              severity: context.severity || 'medium',
              threatCategory: context.metadata?.threatCategory,
              incidentType: context.metadata?.incidentType,
              workflowPhase: context.metadata?.workflowPhase || 'analysis',
              userRole: context.metadata?.userRole || 'security_analyst',
            },
          };

          ragasEvaluation = await this.ragasService.evaluateDataset(mockDataset);
        } catch (error) {
          this.logger.warn('RAGAS evaluation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      // 3. Get LangSmith trace if available
      let langSmithTrace: SOCWorkflowTrace | undefined;
      if (this.config.enableLangSmithIntegration && this.langSmithService && context.traceId) {
        try {
          langSmithTrace = this.langSmithService.getTrace(context.traceId);
        } catch (error) {
          this.logger.warn('LangSmith trace retrieval failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      // 4. Calculate performance metrics
      const evaluationTimeMs = Date.now() - startTime;
      const performanceMetrics = {
        evaluationTimeMs,
        totalScore: rubricEvaluation.overallScore,
        grade: rubricEvaluation.grade,
        categoryBreakdown: rubricEvaluation.categoryScores,
      };

      // 5. Generate recommendations and alerts
      const { recommendations, alerts } = this.generateRecommendationsAndAlerts(
        rubricEvaluation,
        ragasEvaluation,
        performanceMetrics
      );

      const comprehensiveResult: ComprehensiveEvaluationResult = {
        rubricEvaluation,
        ragasEvaluation,
        langSmithTrace,
        performanceMetrics,
        recommendations,
        alerts,
        timestamp: new Date(),
      };

      // Store result
      this.evaluationResults.push(comprehensiveResult);

      // Check for alerts
      if (alerts.length > 0) {
        this.logger.warn('Evaluation alerts generated', { alerts, traceId: context.traceId });
      }

      this.logger.info('Comprehensive LLM response evaluation completed', {
        overallScore: rubricEvaluation.overallScore,
        grade: rubricEvaluation.grade,
        evaluationTimeMs,
        alertsCount: alerts.length,
      });

      return comprehensiveResult;

    } catch (error) {
      this.logger.error('Comprehensive LLM response evaluation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId: context.traceId,
      });
      throw error;
    }
  }

  /**
   * Run batch evaluation on multiple responses
   */
  async evaluateBatch(
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
  ): Promise<ComprehensiveEvaluationResult[]> {
    this.logger.info('Starting batch evaluation', { responseCount: responses.length });

    const results: ComprehensiveEvaluationResult[] = [];

    for (const { response, context } of responses) {
      try {
        const result = await this.evaluateLLMResponse(response, context);
        results.push(result);
      } catch (error) {
        this.logger.error('Batch evaluation item failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          traceId: context.traceId,
        });
      }
    }

    this.logger.info('Batch evaluation completed', {
      totalResponses: responses.length,
      successfulEvaluations: results.length,
      averageScore: results.reduce((sum, r) => sum + r.rubricEvaluation.overallScore, 0) / results.length,
    });

    return results;
  }

  /**
   * Generate performance benchmark
   */
  async generateBenchmark(
    timeRange: { start: Date; end: Date },
    modelName?: string
  ): Promise<RubricBenchmarkResult> {
    this.logger.info('Generating performance benchmark', { timeRange, modelName });

    const filteredResults = this.evaluationResults.filter(result => {
      const resultTime = result.timestamp;
      return resultTime >= timeRange.start && resultTime <= timeRange.end;
    });

    if (filteredResults.length === 0) {
      throw new Error('No evaluation results found for the specified time range');
    }

    const averageScore = filteredResults.reduce((sum, r) => sum + r.rubricEvaluation.overallScore, 0) / filteredResults.length;

    // Calculate grade distribution
    const gradeDistribution: Record<string, number> = {};
    for (const result of filteredResults) {
      const grade = result.rubricEvaluation.grade;
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    }

    // Calculate category averages
    const categoryAverages: Record<string, number> = {};
    const categoryKeys = Object.keys(filteredResults[0].rubricEvaluation.categoryScores);
    
    for (const category of categoryKeys) {
      const categorySum = filteredResults.reduce((sum, r) => sum + (r.rubricEvaluation.categoryScores[category] || 0), 0);
      categoryAverages[category] = categorySum / filteredResults.length;
    }

    const benchmark: RubricBenchmarkResult = {
      modelName: modelName || 'unknown',
      averageScore,
      gradeDistribution,
      categoryAverages,
      evaluationCount: filteredResults.length,
      timeRange,
    };

    this.benchmarkResults.push(benchmark);

    this.logger.info('Performance benchmark generated', {
      modelName: benchmark.modelName,
      averageScore: benchmark.averageScore.toFixed(3),
      evaluationCount: benchmark.evaluationCount,
    });

    return benchmark;
  }

  /**
   * Compare performance across different models or time periods
   */
  async comparePerformance(
    benchmarks: RubricBenchmarkResult[]
  ): Promise<{
    bestPerformingModel: string;
    worstPerformingModel: string;
    performanceGaps: Array<{ category: string; gap: number; model1: string; model2: string }>;
    recommendations: string[];
  }> {
    if (benchmarks.length < 2) {
      throw new Error('At least 2 benchmarks required for comparison');
    }

    // Find best and worst performing models
    const sortedBenchmarks = benchmarks.sort((a, b) => b.averageScore - a.averageScore);
    const bestPerformingModel = sortedBenchmarks[0].modelName;
    const worstPerformingModel = sortedBenchmarks[sortedBenchmarks.length - 1].modelName;

    // Calculate performance gaps
    const performanceGaps: Array<{ category: string; gap: number; model1: string; model2: string }> = [];
    const categories = Object.keys(sortedBenchmarks[0].categoryAverages);

    for (const category of categories) {
      const bestCategoryScore = Math.max(...sortedBenchmarks.map(b => b.categoryAverages[category] || 0));
      const worstCategoryScore = Math.min(...sortedBenchmarks.map(b => b.categoryAverages[category] || 0));
      const gap = bestCategoryScore - worstCategoryScore;

      if (gap > 0.1) { // Only include significant gaps
        performanceGaps.push({
          category,
          gap,
          model1: bestPerformingModel,
          model2: worstPerformingModel,
        });
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (performanceGaps.length > 0) {
      recommendations.push(`Focus on improving ${performanceGaps[0].category} performance`);
    }

    if (sortedBenchmarks[0].averageScore < 0.8) {
      recommendations.push('Overall performance needs improvement across all models');
    }

    if (sortedBenchmarks[0].gradeDistribution['F'] > 0) {
      recommendations.push('Address failing evaluations to improve overall performance');
    }

    return {
      bestPerformingModel,
      worstPerformingModel,
      performanceGaps,
      recommendations,
    };
  }

  /**
   * Generate comprehensive evaluation report
   */
  async generateEvaluationReport(
    timeRange: { start: Date; end: Date },
    includeRecommendations: boolean = true
  ): Promise<{
    summary: {
      totalEvaluations: number;
      averageScore: number;
      gradeDistribution: Record<string, number>;
      topCategories: Array<{ category: string; score: number }>;
      bottomCategories: Array<{ category: string; score: number }>;
    };
    trends: {
      scoreTrend: Array<{ date: string; score: number }>;
      categoryTrends: Record<string, Array<{ date: string; score: number }>>;
    };
    alerts: Array<{ type: string; message: string; timestamp: Date; severity: string }>;
    recommendations: string[];
    benchmarks: RubricBenchmarkResult[];
  }> {
    this.logger.info('Generating comprehensive evaluation report', { timeRange });

    const filteredResults = this.evaluationResults.filter(result => {
      const resultTime = result.timestamp;
      return resultTime >= timeRange.start && resultTime <= timeRange.end;
    });

    if (filteredResults.length === 0) {
      throw new Error('No evaluation results found for the specified time range');
    }

    // Calculate summary statistics
    const averageScore = filteredResults.reduce((sum, r) => sum + r.rubricEvaluation.overallScore, 0) / filteredResults.length;

    const gradeDistribution: Record<string, number> = {};
    for (const result of filteredResults) {
      const grade = result.rubricEvaluation.grade;
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    }

    // Calculate category averages
    const categoryAverages: Record<string, number> = {};
    const categoryKeys = Object.keys(filteredResults[0].rubricEvaluation.categoryScores);
    
    for (const category of categoryKeys) {
      const categorySum = filteredResults.reduce((sum, r) => sum + (r.rubricEvaluation.categoryScores[category] || 0), 0);
      categoryAverages[category] = categorySum / filteredResults.length;
    }

    const topCategories = Object.entries(categoryAverages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category, score]) => ({ category, score }));

    const bottomCategories = Object.entries(categoryAverages)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .map(([category, score]) => ({ category, score }));

    // Generate trends (simplified - would need more sophisticated time series analysis)
    const scoreTrend = filteredResults.map((result, index) => ({
      date: result.timestamp.toISOString().split('T')[0],
      score: result.rubricEvaluation.overallScore,
    }));

    const categoryTrends: Record<string, Array<{ date: string; score: number }>> = {};
    for (const category of categoryKeys) {
      categoryTrends[category] = filteredResults.map(result => ({
        date: result.timestamp.toISOString().split('T')[0],
        score: result.rubricEvaluation.categoryScores[category] || 0,
      }));
    }

    // Collect alerts
    const alerts: Array<{ type: string; message: string; timestamp: Date; severity: string }> = [];
    for (const result of filteredResults) {
      for (const alert of result.alerts) {
        alerts.push({
          type: 'evaluation_alert',
          message: alert,
          timestamp: result.timestamp,
          severity: result.rubricEvaluation.overallScore < 0.6 ? 'high' : 'medium',
        });
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (includeRecommendations) {
      if (averageScore < 0.7) {
        recommendations.push('Overall performance is below acceptable threshold - review and improve evaluation criteria');
      }

      for (const category of bottomCategories) {
        if (category.score < 0.6) {
          recommendations.push(`Focus on improving ${category.category} performance`);
        }
      }

      if (gradeDistribution['F'] > 0) {
        recommendations.push('Address failing evaluations to improve overall system performance');
      }
    }

    // Get relevant benchmarks
    const relevantBenchmarks = this.benchmarkResults.filter(b => 
      b.timeRange.start >= timeRange.start && b.timeRange.end <= timeRange.end
    );

    return {
      summary: {
        totalEvaluations: filteredResults.length,
        averageScore,
        gradeDistribution,
        topCategories,
        bottomCategories,
      },
      trends: {
        scoreTrend,
        categoryTrends,
      },
      alerts,
      recommendations,
      benchmarks: relevantBenchmarks,
    };
  }

  /**
   * Generate recommendations and alerts based on evaluation results
   */
  private generateRecommendationsAndAlerts(
    rubricEvaluation: RubricEvaluation,
    ragasEvaluation?: RAGASEvaluationResult,
    performanceMetrics: any
  ): { recommendations: string[]; alerts: string[] } {
    const recommendations: string[] = [];
    const alerts: string[] = [];

    // Check overall score
    if (rubricEvaluation.overallScore < this.config.alertThresholds.minOverallScore) {
      alerts.push(`Overall score ${rubricEvaluation.overallScore.toFixed(2)} is below threshold ${this.config.alertThresholds.minOverallScore}`);
      recommendations.push('Review and improve overall response quality');
    }

    // Check category scores
    for (const [category, score] of Object.entries(rubricEvaluation.categoryScores)) {
      if (score < this.config.alertThresholds.minCategoryScore) {
        alerts.push(`Category ${category} score ${score.toFixed(2)} is below threshold ${this.config.alertThresholds.minCategoryScore}`);
        recommendations.push(`Focus on improving ${category} performance`);
      }
    }

    // Check evaluation time
    if (performanceMetrics.evaluationTimeMs > this.config.alertThresholds.maxEvaluationTimeMs) {
      alerts.push(`Evaluation time ${performanceMetrics.evaluationTimeMs}ms exceeds threshold ${this.config.alertThresholds.maxEvaluationTimeMs}ms`);
      recommendations.push('Optimize evaluation performance');
    }

    // Check RAGAS evaluation if available
    if (ragasEvaluation && ragasEvaluation.overallScore < 0.7) {
      alerts.push(`RAGAS evaluation score ${ragasEvaluation.overallScore.toFixed(2)} is below acceptable threshold`);
      recommendations.push('Review RAGAS evaluation criteria and improve response quality');
    }

    // Add rubric-specific recommendations
    recommendations.push(...rubricEvaluation.recommendations);

    return { recommendations, alerts };
  }

  // Public API methods

  /**
   * Get evaluation results
   */
  getEvaluationResults(): ComprehensiveEvaluationResult[] {
    return [...this.evaluationResults];
  }

  /**
   * Get benchmark results
   */
  getBenchmarkResults(): RubricBenchmarkResult[] {
    return [...this.benchmarkResults];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RubricIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Rubric integration configuration updated', { config });
  }

  /**
   * Get service status
   */
  getServiceStatus(): {
    isEnabled: boolean;
    evaluationCount: number;
    benchmarkCount: number;
    averageScore: number;
    lastEvaluationTime?: Date;
  } {
    const averageScore = this.evaluationResults.length > 0
      ? this.evaluationResults.reduce((sum, r) => sum + r.rubricEvaluation.overallScore, 0) / this.evaluationResults.length
      : 0;

    const lastEvaluationTime = this.evaluationResults.length > 0
      ? this.evaluationResults[this.evaluationResults.length - 1].timestamp
      : undefined;

    return {
      isEnabled: this.config.enableRubricEvaluation,
      evaluationCount: this.evaluationResults.length,
      benchmarkCount: this.benchmarkResults.length,
      averageScore,
      lastEvaluationTime,
    };
  }

  /**
   * Clear evaluation results
   */
  clearResults(): void {
    this.evaluationResults = [];
    this.benchmarkResults = [];
    this.logger.info('Evaluation results cleared');
  }

  /**
   * Export evaluation results
   */
  exportResults(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify({
        evaluationResults: this.evaluationResults,
        benchmarkResults: this.benchmarkResults,
        config: this.config,
      }, null, 2);
    } else {
      // CSV format
      const headers = [
        'timestamp',
        'overallScore',
        'grade',
        'evaluationTimeMs',
        'alertsCount',
        'recommendationsCount',
      ];

      const rows = this.evaluationResults.map(result => [
        result.timestamp.toISOString(),
        result.rubricEvaluation.overallScore.toString(),
        result.rubricEvaluation.grade,
        result.performanceMetrics.evaluationTimeMs.toString(),
        result.alerts.length.toString(),
        result.recommendations.length.toString(),
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
  }
}

