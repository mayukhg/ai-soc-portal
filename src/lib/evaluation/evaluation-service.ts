/**
 * Evaluation Service
 * Main service for orchestrating AI model evaluation and monitoring
 */

import { Logger } from '../data-ingestion/utils/logger';
import { EvaluationHarness, ComprehensiveEvaluationResult, EvaluationConfig } from './evaluation-harness';
import { MonitoringScripts, MonitoringConfig, PerformanceSnapshot, TrendAnalysis } from './monitoring-scripts';
import { RAGASService, RAGASEvaluationResult, SOCRAGASDataset } from '../ragas/ragas-service';

export interface EvaluationServiceConfig {
  evaluation: EvaluationConfig;
  monitoring: MonitoringConfig;
  enableContinuousEvaluation: boolean;
  enableAutomatedReporting: boolean;
  reportIntervalHours: number;
  enableBenchmarking: boolean;
  benchmarkModels: string[];
  enableRAGASEvaluation: boolean;
  ragasConfig?: {
    enableFaithfulness: boolean;
    enableAnswerRelevancy: boolean;
    enableContextPrecision: boolean;
    enableContextRecall: boolean;
    enableAnswerCorrectness: boolean;
    enableContextUtilization: boolean;
    enableAnswerCompleteness: boolean;
    enableAnswerConsistency: boolean;
  };
}

export interface EvaluationReport {
  id: string;
  timestamp: Date;
  evaluationResult: ComprehensiveEvaluationResult;
  ragasResults?: RAGASEvaluationResult[];
  performanceSnapshots: PerformanceSnapshot[];
  trendAnalysis: TrendAnalysis;
  summary: {
    overallScore: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    keyMetrics: {
      accuracy: number;
      latency: number;
      hallucinationRate: number;
      confidence: number;
      ragasScore?: number;
    };
    recommendations: string[];
    nextEvaluationDate: Date;
  };
}

export interface BenchmarkResult {
  modelName: string;
  timestamp: Date;
  accuracy: number;
  latency: number;
  hallucinationRate: number;
  confidence: number;
  overallScore: number;
  ranking: number;
}

export class EvaluationService {
  private logger: Logger;
  private config: EvaluationServiceConfig;
  private evaluationHarness: EvaluationHarness;
  private monitoringScripts: MonitoringScripts;
  private ragasService?: RAGASService;
  private reports: EvaluationReport[];
  private benchmarks: BenchmarkResult[];
  private reportInterval?: NodeJS.Timeout;

  constructor(config?: Partial<EvaluationServiceConfig>) {
    this.logger = new Logger('EvaluationService');
    this.config = {
      evaluation: {
        enableAccuracyTesting: true,
        enableLatencyTesting: true,
        enableHallucinationDetection: true,
        testDatasetSize: 100,
        maxConcurrentTests: 5,
        timeoutMs: 30000,
        retryAttempts: 3,
      },
      monitoring: {
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
      },
      enableContinuousEvaluation: true,
      enableAutomatedReporting: true,
      reportIntervalHours: 24,
      enableBenchmarking: true,
      benchmarkModels: ['gpt-4', 'gpt-3.5-turbo', 'claude-3'],
      enableRAGASEvaluation: true,
      ragasConfig: {
        enableFaithfulness: true,
        enableAnswerRelevancy: true,
        enableContextPrecision: true,
        enableContextRecall: true,
        enableAnswerCorrectness: true,
        enableContextUtilization: true,
        enableAnswerCompleteness: true,
        enableAnswerConsistency: true,
      },
    };
    this.reports = [];
    this.benchmarks = [];
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initializeComponents();
  }

  private initializeComponents(): void {
    this.evaluationHarness = new EvaluationHarness(this.config.evaluation);
    this.monitoringScripts = new MonitoringScripts(this.evaluationHarness, this.config.monitoring);
    
    // Initialize RAGAS service if enabled
    if (this.config.enableRAGASEvaluation && this.config.ragasConfig) {
      this.ragasService = new RAGASService(this.config.ragasConfig);
    }
    
    this.logger.info('Evaluation service initialized', {
      continuousEvaluation: this.config.enableContinuousEvaluation,
      automatedReporting: this.config.enableAutomatedReporting,
      benchmarking: this.config.enableBenchmarking,
      ragasEvaluation: this.config.enableRAGASEvaluation,
    });
  }

  async startService(): Promise<void> {
    this.logger.info('Starting evaluation service');

    try {
      // Start monitoring
      await this.monitoringScripts.startMonitoring();

      // Start continuous evaluation if enabled
      if (this.config.enableContinuousEvaluation) {
        await this.startContinuousEvaluation();
      }

      // Start automated reporting if enabled
      if (this.config.enableAutomatedReporting) {
        await this.startAutomatedReporting();
      }

      this.logger.info('Evaluation service started successfully');

    } catch (error) {
      this.logger.error('Failed to start evaluation service', { error });
      throw error;
    }
  }

  async stopService(): Promise<void> {
    this.logger.info('Stopping evaluation service');

    try {
      // Stop monitoring
      await this.monitoringScripts.stopMonitoring();

      // Stop automated reporting
      if (this.reportInterval) {
        clearInterval(this.reportInterval);
        this.reportInterval = undefined;
      }

      this.logger.info('Evaluation service stopped successfully');

    } catch (error) {
      this.logger.error('Failed to stop evaluation service', { error });
      throw error;
    }
  }

  private async startContinuousEvaluation(): Promise<void> {
    this.logger.info('Starting continuous evaluation');
    
    // Run initial evaluation
    await this.runEvaluation();
    
    // Schedule periodic evaluations
    const evaluationInterval = this.config.evaluation.testDatasetSize * 1000; // Adjust based on test size
    setInterval(async () => {
      try {
        await this.runEvaluation();
      } catch (error) {
        this.logger.error('Continuous evaluation failed', { error });
      }
    }, evaluationInterval);
  }

  private async startAutomatedReporting(): Promise<void> {
    this.logger.info('Starting automated reporting');
    
    // Generate initial report
    await this.generateReport();
    
    // Schedule periodic reports
    this.reportInterval = setInterval(async () => {
      try {
        await this.generateReport();
      } catch (error) {
        this.logger.error('Automated report generation failed', { error });
      }
    }, this.config.reportIntervalHours * 60 * 60 * 1000);
  }

  async runEvaluation(): Promise<ComprehensiveEvaluationResult> {
    this.logger.info('Running comprehensive evaluation');
    
    try {
      const result = await this.evaluationHarness.runComprehensiveEvaluation();
      
      this.logger.info('Evaluation completed', {
        totalTests: result.totalTests,
        overallScore: result.summary.overallScore,
        accuracyScore: result.summary.accuracyScore,
        latencyScore: result.summary.latencyScore,
        hallucinationScore: result.summary.hallucinationScore,
      });

      return result;

    } catch (error) {
      this.logger.error('Evaluation failed', { error });
      throw error;
    }
  }

  async generateReport(): Promise<EvaluationReport> {
    this.logger.info('Generating evaluation report');

    try {
      // Run evaluation
      const evaluationResult = await this.runEvaluation();
      
      // Get performance snapshots
      const performanceSnapshots = this.monitoringScripts.getPerformanceSnapshots(24);
      
      // Run trend analysis
      const trendAnalysis = await this.monitoringScripts.runTrendAnalysis(24);
      
      // Generate summary
      const summary = this.generateReportSummary(evaluationResult, trendAnalysis);
      
      const report: EvaluationReport = {
        id: `report_${Date.now()}`,
        timestamp: new Date(),
        evaluationResult,
        performanceSnapshots,
        trendAnalysis,
        summary,
      };

      this.reports.push(report);
      
      this.logger.info('Evaluation report generated', {
        reportId: report.id,
        overallScore: summary.overallScore,
        status: summary.status,
        recommendations: summary.recommendations.length,
      });

      return report;

    } catch (error) {
      this.logger.error('Report generation failed', { error });
      throw error;
    }
  }

  private generateReportSummary(
    evaluationResult: ComprehensiveEvaluationResult,
    trendAnalysis: TrendAnalysis
  ): EvaluationReport['summary'] {
    const overallScore = evaluationResult.summary.overallScore;
    
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (overallScore >= 90) status = 'excellent';
    else if (overallScore >= 80) status = 'good';
    else if (overallScore >= 70) status = 'fair';
    else status = 'poor';

    const keyMetrics = {
      accuracy: evaluationResult.accuracyMetrics.f1Score * 100,
      latency: evaluationResult.latencyMetrics.avgLatencyMs,
      hallucinationRate: evaluationResult.hallucinationMetrics.hallucinationRate * 100,
      confidence: evaluationResult.hallucinationMetrics.avgConfidenceScore * 100,
    };

    const recommendations = [
      ...evaluationResult.summary.recommendations,
      ...trendAnalysis.recommendations,
    ];

    const nextEvaluationDate = new Date(Date.now() + this.config.reportIntervalHours * 60 * 60 * 1000);

    return {
      overallScore,
      status,
      keyMetrics,
      recommendations,
      nextEvaluationDate,
    };
  }

  async runBenchmarking(): Promise<BenchmarkResult[]> {
    if (!this.config.enableBenchmarking) {
      throw new Error('Benchmarking is disabled');
    }

    this.logger.info('Running model benchmarking', {
      models: this.config.benchmarkModels,
    });

    const results: BenchmarkResult[] = [];

    for (const modelName of this.config.benchmarkModels) {
      try {
        const result = await this.benchmarkModel(modelName);
        results.push(result);
      } catch (error) {
        this.logger.error(`Benchmarking failed for model ${modelName}`, { error });
      }
    }

    // Sort by overall score and assign rankings
    results.sort((a, b) => b.overallScore - a.overallScore);
    results.forEach((result, index) => {
      result.ranking = index + 1;
    });

    this.benchmarks.push(...results);
    
    this.logger.info('Benchmarking completed', {
      modelsTested: results.length,
      topModel: results[0]?.modelName,
      topScore: results[0]?.overallScore,
    });

    return results;
  }

  private async benchmarkModel(modelName: string): Promise<BenchmarkResult> {
    this.logger.info(`Benchmarking model: ${modelName}`);

    // This would implement actual model benchmarking
    // For now, we'll simulate realistic results
    
    const startTime = Date.now();
    
    // Simulate model evaluation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    
    const accuracy = 0.7 + Math.random() * 0.25; // 70-95%
    const latency = 500 + Math.random() * 2000; // 500-2500ms
    const hallucinationRate = Math.random() * 0.15; // 0-15%
    const confidence = 0.6 + Math.random() * 0.3; // 60-90%
    
    const overallScore = (accuracy * 0.4 + (1 - hallucinationRate) * 0.3 + confidence * 0.2 + (1 - Math.min(latency / 5000, 1)) * 0.1) * 100;

    return {
      modelName,
      timestamp: new Date(),
      accuracy: accuracy * 100,
      latency,
      hallucinationRate: hallucinationRate * 100,
      confidence: confidence * 100,
      overallScore,
      ranking: 0, // Will be set after sorting
    };
  }

  // Public API methods
  getReports(limit?: number): EvaluationReport[] {
    const reports = [...this.reports].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? reports.slice(0, limit) : reports;
  }

  getLatestReport(): EvaluationReport | null {
    const reports = this.getReports(1);
    return reports.length > 0 ? reports[0] : null;
  }

  getBenchmarks(limit?: number): BenchmarkResult[] {
    const benchmarks = [...this.benchmarks].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? benchmarks.slice(0, limit) : benchmarks;
  }

  getLatestBenchmarks(): BenchmarkResult[] {
    const benchmarks = this.getBenchmarks();
    const latestTimestamp = benchmarks[0]?.timestamp;
    return benchmarks.filter(b => b.timestamp.getTime() === latestTimestamp?.getTime());
  }

  async exportReport(reportId: string, format: 'json' | 'html' | 'pdf'): Promise<string> {
    const report = this.reports.find(r => r.id === reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'html':
        return this.generateHTMLReport(report);
      case 'pdf':
        // This would generate a PDF report
        throw new Error('PDF export not implemented');
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private generateHTMLReport(report: EvaluationReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>AI Model Evaluation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .metric { margin: 10px 0; }
        .score { font-size: 24px; font-weight: bold; }
        .excellent { color: green; }
        .good { color: blue; }
        .fair { color: orange; }
        .poor { color: red; }
        .recommendations { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Model Evaluation Report</h1>
        <p>Generated: ${report.timestamp.toISOString()}</p>
        <p>Report ID: ${report.id}</p>
    </div>
    
    <h2>Summary</h2>
    <div class="metric">
        <span>Overall Score: </span>
        <span class="score ${report.summary.status}">${report.summary.overallScore.toFixed(2)}%</span>
        <span> (${report.summary.status})</span>
    </div>
    
    <h2>Key Metrics</h2>
    <div class="metric">Accuracy: ${report.summary.keyMetrics.accuracy.toFixed(2)}%</div>
    <div class="metric">Latency: ${report.summary.keyMetrics.latency.toFixed(2)}ms</div>
    <div class="metric">Hallucination Rate: ${report.summary.keyMetrics.hallucinationRate.toFixed(2)}%</div>
    <div class="metric">Confidence: ${report.summary.keyMetrics.confidence.toFixed(2)}%</div>
    
    <h2>Recommendations</h2>
    <div class="recommendations">
        <ul>
            ${report.summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    
    <h2>Trend Analysis</h2>
    <div class="metric">Overall Trend: ${report.trendAnalysis.overallTrend}</div>
    <div class="metric">Trend Score: ${report.trendAnalysis.trendScore.toFixed(3)}</div>
    
    <h2>Next Evaluation</h2>
    <p>Scheduled for: ${report.summary.nextEvaluationDate.toISOString()}</p>
</body>
</html>
    `;
  }

  getServiceStatus(): {
    isRunning: boolean;
    reportsCount: number;
    benchmarksCount: number;
    monitoringStatus: any;
  } {
    return {
      isRunning: this.monitoringScripts.getMonitoringStatus().isMonitoring,
      reportsCount: this.reports.length,
      benchmarksCount: this.benchmarks.length,
      monitoringStatus: this.monitoringScripts.getMonitoringStatus(),
    };
  }

  updateConfig(config: Partial<EvaluationServiceConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Evaluation service configuration updated', { config });
  }

  getConfig(): EvaluationServiceConfig {
    return { ...this.config };
  }

  // RAGAS Evaluation Methods

  /**
   * Run RAGAS evaluation on SOC datasets
   * Evaluates RAG system performance using SOC-specific scenarios
   */
  async runRAGASEvaluation(): Promise<RAGASEvaluationResult[]> {
    if (!this.ragasService) {
      throw new Error('RAGAS service is not enabled');
    }

    this.logger.info('Starting RAGAS evaluation');

    try {
      const datasets = this.ragasService.getDatasets();
      const results = await this.ragasService.evaluateBatch(datasets);

      this.logger.info('RAGAS evaluation completed', {
        datasetsEvaluated: datasets.length,
        averageScore: results.reduce((sum, r) => sum + r.overallScore, 0) / results.length,
      });

      return results;
    } catch (error) {
      this.logger.error('RAGAS evaluation failed', { error });
      throw error;
    }
  }

  /**
   * Evaluate a custom SOC dataset with RAGAS
   */
  async evaluateSOCDataset(dataset: SOCRAGASDataset): Promise<RAGASEvaluationResult> {
    if (!this.ragasService) {
      throw new Error('RAGAS service is not enabled');
    }

    this.logger.info('Evaluating SOC dataset', { datasetId: dataset.id });

    try {
      const result = await this.ragasService.evaluateDataset(dataset);
      
      this.logger.info('SOC dataset evaluation completed', {
        datasetId: dataset.id,
        overallScore: result.overallScore,
      });

      return result;
    } catch (error) {
      this.logger.error('SOC dataset evaluation failed', { error, datasetId: dataset.id });
      throw error;
    }
  }

  /**
   * Get RAGAS evaluation results
   */
  getRAGASResults(): RAGASEvaluationResult[] {
    if (!this.ragasService) {
      return [];
    }

    return this.ragasService.getEvaluationResults();
  }

  /**
   * Get RAGAS average scores
   */
  getRAGASAverageScores(): any {
    if (!this.ragasService) {
      return null;
    }

    return this.ragasService.getAverageScores();
  }

  /**
   * Export RAGAS results
   */
  exportRAGASResults(format: 'json' | 'csv'): string {
    if (!this.ragasService) {
      throw new Error('RAGAS service is not enabled');
    }

    return this.ragasService.exportResults(format);
  }

  /**
   * Get RAGAS service status
   */
  getRAGASStatus(): any {
    if (!this.ragasService) {
      return { enabled: false };
    }

    return {
      enabled: true,
      ...this.ragasService.getServiceStatus(),
    };
  }

  /**
   * Update RAGAS configuration
   */
  updateRAGASConfig(config: any): void {
    if (!this.ragasService) {
      throw new Error('RAGAS service is not enabled');
    }

    this.ragasService.updateConfig(config);
    this.logger.info('RAGAS configuration updated', { config });
  }

  // Cleanup methods
  clearReports(): void {
    this.reports = [];
    this.logger.info('Evaluation reports cleared');
  }

  clearBenchmarks(): void {
    this.benchmarks = [];
    this.logger.info('Benchmark results cleared');
  }
}
