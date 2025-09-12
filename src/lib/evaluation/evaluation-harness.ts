/**
 * Evaluation Harness
 * Comprehensive evaluation system for measuring accuracy, latency, and hallucinations
 */

import { Logger } from '../data-ingestion/utils/logger';

export interface EvaluationConfig {
  enableAccuracyTesting: boolean;
  enableLatencyTesting: boolean;
  enableHallucinationDetection: boolean;
  testDatasetSize: number;
  maxConcurrentTests: number;
  timeoutMs: number;
  retryAttempts: number;
}

export interface AccuracyMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  confusionMatrix: number[][];
}

export interface LatencyMetrics {
  minLatencyMs: number;
  maxLatencyMs: number;
  avgLatencyMs: number;
  medianLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  stdDevLatencyMs: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface HallucinationMetrics {
  hallucinationRate: number;
  factualErrors: number;
  contradictoryStatements: number;
  inventedFacts: number;
  totalStatements: number;
  hallucinationTypes: Record<string, number>;
  confidenceScores: number[];
  avgConfidenceScore: number;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  expectedCategory: string;
  expectedSeverity: 'low' | 'medium' | 'high' | 'critical';
  context: Record<string, any>;
  groundTruth: any;
}

export interface EvaluationResult {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  accuracy: number;
  latencyMs: number;
  hallucinationScore: number;
  confidenceScore: number;
  errors: string[];
  metadata: Record<string, any>;
}

export interface ComprehensiveEvaluationResult {
  timestamp: Date;
  totalTests: number;
  accuracyMetrics: AccuracyMetrics;
  latencyMetrics: LatencyMetrics;
  hallucinationMetrics: HallucinationMetrics;
  individualResults: EvaluationResult[];
  summary: {
    overallScore: number;
    accuracyScore: number;
    latencyScore: number;
    hallucinationScore: number;
    recommendations: string[];
  };
}

export class EvaluationHarness {
  private logger: Logger;
  private config: EvaluationConfig;
  private testCases: TestCase[];
  private evaluationResults: EvaluationResult[];

  constructor(config?: Partial<EvaluationConfig>) {
    this.logger = new Logger('EvaluationHarness');
    this.config = {
      enableAccuracyTesting: true,
      enableLatencyTesting: true,
      enableHallucinationDetection: true,
      testDatasetSize: 100,
      maxConcurrentTests: 5,
      timeoutMs: 30000,
      retryAttempts: 3,
    };
    this.testCases = [];
    this.evaluationResults = [];
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initializeTestCases();
  }

  private initializeTestCases(): void {
    // Initialize with sample test cases for SOC scenarios
    this.testCases = [
      {
        id: 'threat_analysis_001',
        input: 'Analyze this suspicious network traffic: 192.168.1.100 connecting to 10.0.0.50 on port 4444',
        expectedOutput: 'Potential reverse shell connection detected. Port 4444 is commonly used for reverse shells.',
        expectedCategory: 'threat_analysis',
        expectedSeverity: 'high',
        context: { source_ip: '192.168.1.100', dest_ip: '10.0.0.50', port: 4444 },
        groundTruth: { threat_type: 'reverse_shell', confidence: 0.85 }
      },
      {
        id: 'incident_response_001',
        input: 'User reported phishing email with suspicious attachment. What should be the immediate response?',
        expectedOutput: 'Immediate response: 1) Isolate affected systems 2) Block sender domain 3) Scan for malware 4) Notify security team',
        expectedCategory: 'incident_response',
        expectedSeverity: 'medium',
        context: { incident_type: 'phishing', user_reported: true },
        groundTruth: { response_steps: ['isolate', 'block', 'scan', 'notify'], priority: 'high' }
      },
      {
        id: 'vulnerability_assessment_001',
        input: 'Critical vulnerability CVE-2023-1234 found in Apache HTTP Server. Assess the risk.',
        expectedOutput: 'CVE-2023-1234 is a critical remote code execution vulnerability in Apache HTTP Server. Immediate patching required.',
        expectedCategory: 'vulnerability_assessment',
        expectedSeverity: 'critical',
        context: { cve_id: 'CVE-2023-1234', component: 'Apache HTTP Server' },
        groundTruth: { severity: 'critical', cvss_score: 9.8, patch_required: true }
      }
    ];
  }

  async runComprehensiveEvaluation(): Promise<ComprehensiveEvaluationResult> {
    const startTime = Date.now();
    this.logger.info('Starting comprehensive evaluation', {
      testCases: this.testCases.length,
      config: this.config,
    });

    const results: EvaluationResult[] = [];
    
    try {
      // Run evaluations in batches for concurrency control
      const batches = this.createBatches(this.testCases, this.config.maxConcurrentTests);
      
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(testCase => this.evaluateTestCase(testCase))
        );
        results.push(...batchResults);
      }

      // Calculate comprehensive metrics
      const accuracyMetrics = this.calculateAccuracyMetrics(results);
      const latencyMetrics = this.calculateLatencyMetrics(results);
      const hallucinationMetrics = this.calculateHallucinationMetrics(results);
      
      const comprehensiveResult: ComprehensiveEvaluationResult = {
        timestamp: new Date(),
        totalTests: results.length,
        accuracyMetrics,
        latencyMetrics,
        hallucinationMetrics,
        individualResults: results,
        summary: this.generateSummary(accuracyMetrics, latencyMetrics, hallucinationMetrics),
      };

      this.evaluationResults = results;
      
      this.logger.info('Comprehensive evaluation completed', {
        totalTests: comprehensiveResult.totalTests,
        overallScore: comprehensiveResult.summary.overallScore,
        accuracyScore: comprehensiveResult.summary.accuracyScore,
        latencyScore: comprehensiveResult.summary.latencyScore,
        hallucinationScore: comprehensiveResult.summary.hallucinationScore,
        processingTime: Date.now() - startTime,
      });

      return comprehensiveResult;

    } catch (error) {
      this.logger.error('Comprehensive evaluation failed', { error });
      throw error;
    }
  }

  private async evaluateTestCase(testCase: TestCase): Promise<EvaluationResult> {
    const startTime = Date.now();
    const result: EvaluationResult = {
      testCaseId: testCase.id,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: '',
      accuracy: 0,
      latencyMs: 0,
      hallucinationScore: 0,
      confidenceScore: 0,
      errors: [],
      metadata: {},
    };

    try {
      // Simulate AI model processing (replace with actual model calls)
      const { output, confidence } = await this.simulateAIProcessing(testCase);
      
      result.actualOutput = output;
      result.confidenceScore = confidence;
      result.latencyMs = Date.now() - startTime;

      // Calculate accuracy
      if (this.config.enableAccuracyTesting) {
        result.accuracy = await this.calculateAccuracy(testCase, result);
      }

      // Detect hallucinations
      if (this.config.enableHallucinationDetection) {
        result.hallucinationScore = await this.detectHallucinations(testCase, result);
      }

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.latencyMs = Date.now() - startTime;
    }

    return result;
  }

  private async simulateAIProcessing(testCase: TestCase): Promise<{ output: string; confidence: number }> {
    // This would be replaced with actual AI model calls
    // For now, we'll simulate realistic responses based on test case type
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100)); // Simulate processing time
    
    let output: string;
    let confidence: number;

    switch (testCase.expectedCategory) {
      case 'threat_analysis':
        output = 'Analysis indicates potential security threat. Immediate investigation recommended.';
        confidence = 0.85;
        break;
      case 'incident_response':
        output = 'Recommended response: Isolate affected systems, block malicious sources, and notify security team.';
        confidence = 0.90;
        break;
      case 'vulnerability_assessment':
        output = 'Critical vulnerability detected. Immediate patching and system updates required.';
        confidence = 0.88;
        break;
      default:
        output = 'Analysis completed. Further investigation may be required.';
        confidence = 0.75;
    }

    return { output, confidence };
  }

  private async calculateAccuracy(testCase: TestCase, result: EvaluationResult): Promise<number> {
    // Implement accuracy calculation based on expected vs actual output
    const expectedTokens = testCase.expectedOutput.toLowerCase().split(/\s+/);
    const actualTokens = result.actualOutput.toLowerCase().split(/\s+/);
    
    const commonTokens = expectedTokens.filter(token => actualTokens.includes(token));
    const totalTokens = Math.max(expectedTokens.length, actualTokens.length);
    
    return totalTokens > 0 ? commonTokens.length / totalTokens : 0;
  }

  private async detectHallucinations(testCase: TestCase, result: EvaluationResult): Promise<number> {
    // Implement hallucination detection logic
    const hallucinationIndicators = [
      'definitely',
      'certainly',
      'absolutely',
      'without a doubt',
      'guaranteed',
      'confirmed',
      'verified',
      'proven',
    ];

    const outputLower = result.actualOutput.toLowerCase();
    let hallucinationScore = 0;

    // Check for overconfident language
    for (const indicator of hallucinationIndicators) {
      if (outputLower.includes(indicator)) {
        hallucinationScore += 0.1;
      }
    }

    // Check for invented facts (simplified)
    const inventedPatterns = [
      /\b\d{4}-\d{2}-\d{2}\b/g, // Dates that might be invented
      /\bCVE-\d{4}-\d{4,5}\b/g, // CVEs that might be invented
      /\b\d+\.\d+\.\d+\.\d+\b/g, // IP addresses that might be invented
    ];

    for (const pattern of inventedPatterns) {
      const matches = result.actualOutput.match(pattern);
      if (matches && matches.length > 0) {
        hallucinationScore += matches.length * 0.05;
      }
    }

    // Check for contradictory statements
    const contradictions = [
      ['high', 'low'],
      ['critical', 'minor'],
      ['immediate', 'delayed'],
      ['confirmed', 'suspected'],
    ];

    for (const [term1, term2] of contradictions) {
      if (outputLower.includes(term1) && outputLower.includes(term2)) {
        hallucinationScore += 0.2;
      }
    }

    return Math.min(hallucinationScore, 1.0);
  }

  private calculateAccuracyMetrics(results: EvaluationResult[]): AccuracyMetrics {
    const validResults = results.filter(r => r.errors.length === 0);
    
    if (validResults.length === 0) {
      return {
        precision: 0,
        recall: 0,
        f1Score: 0,
        accuracy: 0,
        truePositives: 0,
        falsePositives: 0,
        trueNegatives: 0,
        falseNegatives: 0,
        confusionMatrix: [[0, 0], [0, 0]],
      };
    }

    const avgAccuracy = validResults.reduce((sum, r) => sum + r.accuracy, 0) / validResults.length;
    
    // Simplified binary classification for demonstration
    const threshold = 0.7;
    const truePositives = validResults.filter(r => r.accuracy >= threshold).length;
    const falsePositives = validResults.filter(r => r.accuracy < threshold).length;
    const trueNegatives = 0; // Simplified
    const falseNegatives = 0; // Simplified

    const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
    const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    return {
      precision,
      recall,
      f1Score,
      accuracy: avgAccuracy,
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      confusionMatrix: [[trueNegatives, falsePositives], [falseNegatives, truePositives]],
    };
  }

  private calculateLatencyMetrics(results: EvaluationResult[]): LatencyMetrics {
    const latencies = results.map(r => r.latencyMs).filter(l => l > 0);
    
    if (latencies.length === 0) {
      return {
        minLatencyMs: 0,
        maxLatencyMs: 0,
        avgLatencyMs: 0,
        medianLatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        stdDevLatencyMs: 0,
        totalRequests: results.length,
        successfulRequests: 0,
        failedRequests: results.length,
      };
    }

    latencies.sort((a, b) => a - b);
    
    const minLatency = latencies[0];
    const maxLatency = latencies[latencies.length - 1];
    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const medianLatency = latencies[Math.floor(latencies.length / 2)];
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
    const p99Latency = latencies[Math.floor(latencies.length * 0.99)];
    
    const variance = latencies.reduce((sum, l) => sum + Math.pow(l - avgLatency, 2), 0) / latencies.length;
    const stdDevLatency = Math.sqrt(variance);

    const successfulRequests = results.filter(r => r.errors.length === 0).length;
    const failedRequests = results.length - successfulRequests;

    return {
      minLatencyMs: minLatency,
      maxLatencyMs: maxLatency,
      avgLatencyMs: avgLatency,
      medianLatencyMs: medianLatency,
      p95LatencyMs: p95Latency,
      p99LatencyMs: p99Latency,
      stdDevLatencyMs: stdDevLatency,
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
    };
  }

  private calculateHallucinationMetrics(results: EvaluationResult[]): HallucinationMetrics {
    const hallucinationScores = results.map(r => r.hallucinationScore);
    const avgHallucinationScore = hallucinationScores.reduce((sum, s) => sum + s, 0) / hallucinationScores.length;
    
    const hallucinationRate = results.filter(r => r.hallucinationScore > 0.3).length / results.length;
    
    const hallucinationTypes = {
      overconfident_language: results.filter(r => r.hallucinationScore > 0.1).length,
      invented_facts: results.filter(r => r.hallucinationScore > 0.2).length,
      contradictory_statements: results.filter(r => r.hallucinationScore > 0.3).length,
    };

    const confidenceScores = results.map(r => r.confidenceScore);
    const avgConfidenceScore = confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length;

    return {
      hallucinationRate,
      factualErrors: results.filter(r => r.hallucinationScore > 0.5).length,
      contradictoryStatements: results.filter(r => r.hallucinationScore > 0.3).length,
      inventedFacts: results.filter(r => r.hallucinationScore > 0.2).length,
      totalStatements: results.length,
      hallucinationTypes,
      confidenceScores,
      avgConfidenceScore,
    };
  }

  private generateSummary(
    accuracyMetrics: AccuracyMetrics,
    latencyMetrics: LatencyMetrics,
    hallucinationMetrics: HallucinationMetrics
  ): { overallScore: number; accuracyScore: number; latencyScore: number; hallucinationScore: number; recommendations: string[] } {
    
    const accuracyScore = accuracyMetrics.f1Score * 100;
    const latencyScore = Math.max(0, 100 - (latencyMetrics.avgLatencyMs / 100)); // Penalty for high latency
    const hallucinationScore = Math.max(0, 100 - (hallucinationMetrics.hallucinationRate * 100));
    
    const overallScore = (accuracyScore + latencyScore + hallucinationScore) / 3;
    
    const recommendations: string[] = [];
    
    if (accuracyScore < 70) {
      recommendations.push('Improve model accuracy through better training data and fine-tuning');
    }
    
    if (latencyScore < 70) {
      recommendations.push('Optimize model performance and reduce processing latency');
    }
    
    if (hallucinationScore < 70) {
      recommendations.push('Implement better hallucination detection and reduce overconfident responses');
    }
    
    if (overallScore < 80) {
      recommendations.push('Overall system performance needs improvement across all metrics');
    }

    return {
      overallScore,
      accuracyScore,
      latencyScore,
      hallucinationScore,
      recommendations,
    };
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  // Public API methods
  addTestCase(testCase: TestCase): void {
    this.testCases.push(testCase);
    this.logger.info(`Added test case: ${testCase.id}`);
  }

  removeTestCase(testCaseId: string): boolean {
    const index = this.testCases.findIndex(tc => tc.id === testCaseId);
    if (index !== -1) {
      this.testCases.splice(index, 1);
      this.logger.info(`Removed test case: ${testCaseId}`);
      return true;
    }
    return false;
  }

  getTestCases(): TestCase[] {
    return [...this.testCases];
  }

  getEvaluationResults(): EvaluationResult[] {
    return [...this.evaluationResults];
  }

  updateConfig(config: Partial<EvaluationConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Evaluation configuration updated', { config });
  }

  getConfig(): EvaluationConfig {
    return { ...this.config };
  }

  // Export results
  exportResults(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.evaluationResults, null, 2);
    } else {
      // CSV format
      const headers = ['testCaseId', 'accuracy', 'latencyMs', 'hallucinationScore', 'confidenceScore'];
      const rows = this.evaluationResults.map(r => [
        r.testCaseId,
        r.accuracy.toString(),
        r.latencyMs.toString(),
        r.hallucinationScore.toString(),
        r.confidenceScore.toString(),
      ]);
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
  }
}
