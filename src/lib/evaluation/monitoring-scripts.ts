/**
 * Monitoring Scripts
 * Real-time performance tracking and alerting for AI model evaluation
 */

import { Logger } from '../data-ingestion/utils/logger';
import { EvaluationHarness, ComprehensiveEvaluationResult, EvaluationResult } from './evaluation-harness';

export interface MonitoringConfig {
  enableRealTimeMonitoring: boolean;
  enablePerformanceAlerts: boolean;
  enableTrendAnalysis: boolean;
  monitoringIntervalMs: number;
  alertThresholds: PerformanceThresholds;
  retentionDays: number;
  enableMetricsExport: boolean;
}

export interface PerformanceThresholds {
  minAccuracy: number;
  maxLatencyMs: number;
  maxHallucinationRate: number;
  minConfidenceScore: number;
  maxErrorRate: number;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  accuracy: number;
  latencyMs: number;
  hallucinationRate: number;
  confidenceScore: number;
  errorRate: number;
  throughputPerSecond: number;
  activeTests: number;
  completedTests: number;
  failedTests: number;
}

export interface TrendAnalysis {
  period: string;
  accuracyTrend: 'improving' | 'declining' | 'stable';
  latencyTrend: 'improving' | 'declining' | 'stable';
  hallucinationTrend: 'improving' | 'declining' | 'stable';
  confidenceTrend: 'improving' | 'declining' | 'stable';
  overallTrend: 'improving' | 'declining' | 'stable';
  trendScore: number;
  recommendations: string[];
}

export interface PerformanceAlert {
  id: string;
  type: 'accuracy' | 'latency' | 'hallucination' | 'confidence' | 'error_rate' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  threshold: number;
  actualValue: number;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export class MonitoringScripts {
  private logger: Logger;
  private config: MonitoringConfig;
  private evaluationHarness: EvaluationHarness;
  private performanceSnapshots: PerformanceSnapshot[];
  private alerts: PerformanceAlert[];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring: boolean;

  constructor(evaluationHarness: EvaluationHarness, config?: Partial<MonitoringConfig>) {
    this.logger = new Logger('MonitoringScripts');
    this.evaluationHarness = evaluationHarness;
    this.config = {
      enableRealTimeMonitoring: true,
      enablePerformanceAlerts: true,
      enableTrendAnalysis: true,
      monitoringIntervalMs: 60000, // 1 minute
      alertThresholds: {
        minAccuracy: 0.8,
        maxLatencyMs: 5000,
        maxHallucinationRate: 0.1,
        minConfidenceScore: 0.7,
        maxErrorRate: 0.05,
      },
      retentionDays: 7,
      enableMetricsExport: true,
    };
    this.performanceSnapshots = [];
    this.alerts = [];
    this.isMonitoring = false;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn('Monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.logger.info('Starting performance monitoring', {
      interval: this.config.monitoringIntervalMs,
      thresholds: this.config.alertThresholds,
    });

    if (this.config.enableRealTimeMonitoring) {
      this.monitoringInterval = setInterval(() => {
        this.collectPerformanceSnapshot();
      }, this.config.monitoringIntervalMs);
    }

    // Initial snapshot
    await this.collectPerformanceSnapshot();
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      this.logger.warn('Monitoring is not running');
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.logger.info('Performance monitoring stopped');
  }

  private async collectPerformanceSnapshot(): Promise<void> {
    try {
      const snapshot = await this.createPerformanceSnapshot();
      this.performanceSnapshots.push(snapshot);

      // Clean up old snapshots
      this.cleanupOldSnapshots();

      // Check for alerts
      if (this.config.enablePerformanceAlerts) {
        await this.checkPerformanceAlerts(snapshot);
      }

      this.logger.debug('Performance snapshot collected', {
        accuracy: snapshot.accuracy,
        latencyMs: snapshot.latencyMs,
        hallucinationRate: snapshot.hallucinationRate,
        confidenceScore: snapshot.confidenceScore,
      });

    } catch (error) {
      this.logger.error('Failed to collect performance snapshot', { error });
    }
  }

  private async createPerformanceSnapshot(): Promise<PerformanceSnapshot> {
    const timestamp = new Date();
    const evaluationResults = this.evaluationHarness.getEvaluationResults();
    
    if (evaluationResults.length === 0) {
      return {
        timestamp,
        accuracy: 0,
        latencyMs: 0,
        hallucinationRate: 0,
        confidenceScore: 0,
        errorRate: 0,
        throughputPerSecond: 0,
        activeTests: 0,
        completedTests: 0,
        failedTests: 0,
      };
    }

    const recentResults = this.getRecentResults(evaluationResults, 5); // Last 5 minutes
    
    const accuracy = recentResults.reduce((sum, r) => sum + r.accuracy, 0) / recentResults.length;
    const latencyMs = recentResults.reduce((sum, r) => sum + r.latencyMs, 0) / recentResults.length;
    const hallucinationRate = recentResults.reduce((sum, r) => sum + r.hallucinationScore, 0) / recentResults.length;
    const confidenceScore = recentResults.reduce((sum, r) => sum + r.confidenceScore, 0) / recentResults.length;
    const errorRate = recentResults.filter(r => r.errors.length > 0).length / recentResults.length;
    
    const completedTests = recentResults.length;
    const failedTests = recentResults.filter(r => r.errors.length > 0).length;
    const throughputPerSecond = completedTests / (this.config.monitoringIntervalMs / 1000);

    return {
      timestamp,
      accuracy,
      latencyMs,
      hallucinationRate,
      confidenceScore,
      errorRate,
      throughputPerSecond,
      activeTests: 0, // Would be tracked in real implementation
      completedTests,
      failedTests,
    };
  }

  private getRecentResults(results: EvaluationResult[], minutes: number): EvaluationResult[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    // Since we don't have timestamps in EvaluationResult, we'll use all results for now
    // In a real implementation, you'd filter by timestamp
    return results.slice(-Math.min(results.length, 10)); // Last 10 results
  }

  private async checkPerformanceAlerts(snapshot: PerformanceSnapshot): Promise<void> {
    const alerts: PerformanceAlert[] = [];

    // Check accuracy threshold
    if (snapshot.accuracy < this.config.alertThresholds.minAccuracy) {
      alerts.push({
        id: `accuracy_${Date.now()}`,
        type: 'accuracy',
        severity: snapshot.accuracy < 0.5 ? 'critical' : snapshot.accuracy < 0.7 ? 'high' : 'medium',
        message: `Accuracy ${(snapshot.accuracy * 100).toFixed(2)}% below threshold ${(this.config.alertThresholds.minAccuracy * 100).toFixed(2)}%`,
        timestamp: new Date(),
        threshold: this.config.alertThresholds.minAccuracy,
        actualValue: snapshot.accuracy,
        resolved: false,
        metadata: { snapshot },
      });
    }

    // Check latency threshold
    if (snapshot.latencyMs > this.config.alertThresholds.maxLatencyMs) {
      alerts.push({
        id: `latency_${Date.now()}`,
        type: 'latency',
        severity: snapshot.latencyMs > 10000 ? 'critical' : snapshot.latencyMs > 7000 ? 'high' : 'medium',
        message: `Latency ${snapshot.latencyMs.toFixed(2)}ms exceeds threshold ${this.config.alertThresholds.maxLatencyMs}ms`,
        timestamp: new Date(),
        threshold: this.config.alertThresholds.maxLatencyMs,
        actualValue: snapshot.latencyMs,
        resolved: false,
        metadata: { snapshot },
      });
    }

    // Check hallucination rate threshold
    if (snapshot.hallucinationRate > this.config.alertThresholds.maxHallucinationRate) {
      alerts.push({
        id: `hallucination_${Date.now()}`,
        type: 'hallucination',
        severity: snapshot.hallucinationRate > 0.3 ? 'critical' : snapshot.hallucinationRate > 0.2 ? 'high' : 'medium',
        message: `Hallucination rate ${(snapshot.hallucinationRate * 100).toFixed(2)}% exceeds threshold ${(this.config.alertThresholds.maxHallucinationRate * 100).toFixed(2)}%`,
        timestamp: new Date(),
        threshold: this.config.alertThresholds.maxHallucinationRate,
        actualValue: snapshot.hallucinationRate,
        resolved: false,
        metadata: { snapshot },
      });
    }

    // Check confidence score threshold
    if (snapshot.confidenceScore < this.config.alertThresholds.minConfidenceScore) {
      alerts.push({
        id: `confidence_${Date.now()}`,
        type: 'confidence',
        severity: snapshot.confidenceScore < 0.5 ? 'critical' : snapshot.confidenceScore < 0.6 ? 'high' : 'medium',
        message: `Confidence score ${(snapshot.confidenceScore * 100).toFixed(2)}% below threshold ${(this.config.alertThresholds.minConfidenceScore * 100).toFixed(2)}%`,
        timestamp: new Date(),
        threshold: this.config.alertThresholds.minConfidenceScore,
        actualValue: snapshot.confidenceScore,
        resolved: false,
        metadata: { snapshot },
      });
    }

    // Check error rate threshold
    if (snapshot.errorRate > this.config.alertThresholds.maxErrorRate) {
      alerts.push({
        id: `error_rate_${Date.now()}`,
        type: 'error_rate',
        severity: snapshot.errorRate > 0.2 ? 'critical' : snapshot.errorRate > 0.1 ? 'high' : 'medium',
        message: `Error rate ${(snapshot.errorRate * 100).toFixed(2)}% exceeds threshold ${(this.config.alertThresholds.maxErrorRate * 100).toFixed(2)}%`,
        timestamp: new Date(),
        threshold: this.config.alertThresholds.maxErrorRate,
        actualValue: snapshot.errorRate,
        resolved: false,
        metadata: { snapshot },
      });
    }

    // Store and process alerts
    for (const alert of alerts) {
      await this.createAlert(alert);
    }
  }

  private async createAlert(alert: PerformanceAlert): Promise<void> {
    this.alerts.push(alert);
    
    this.logger.warn(`Performance alert created`, {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      threshold: alert.threshold,
      actualValue: alert.actualValue,
    });

    // Send alert notification
    await this.sendAlertNotification(alert);
  }

  private async sendAlertNotification(alert: PerformanceAlert): Promise<void> {
    // This would implement actual alert notification logic
    // For example, sending to Slack, email, PagerDuty, etc.
    
    this.logger.info(`Sending alert notification`, {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
    });
  }

  private cleanupOldSnapshots(): void {
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    this.performanceSnapshots = this.performanceSnapshots.filter(s => s.timestamp > cutoffDate);
  }

  async runTrendAnalysis(hours: number = 24): Promise<TrendAnalysis> {
    if (!this.config.enableTrendAnalysis) {
      throw new Error('Trend analysis is disabled');
    }

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentSnapshots = this.performanceSnapshots.filter(s => s.timestamp > cutoffTime);
    
    if (recentSnapshots.length < 2) {
      throw new Error('Insufficient data for trend analysis');
    }

    const accuracyTrend = this.calculateTrend(recentSnapshots.map(s => s.accuracy));
    const latencyTrend = this.calculateTrend(recentSnapshots.map(s => s.latencyMs), true); // Lower is better
    const hallucinationTrend = this.calculateTrend(recentSnapshots.map(s => s.hallucinationRate), true); // Lower is better
    const confidenceTrend = this.calculateTrend(recentSnapshots.map(s => s.confidenceScore));

    const trendScores = [accuracyTrend, latencyTrend, hallucinationTrend, confidenceTrend];
    const overallTrend = this.calculateOverallTrend(trendScores);
    const trendScore = trendScores.reduce((sum, score) => sum + score, 0) / trendScores.length;

    const recommendations = this.generateTrendRecommendations({
      accuracyTrend,
      latencyTrend,
      hallucinationTrend,
      confidenceTrend,
    });

    return {
      period: `${hours} hours`,
      accuracyTrend: this.scoreToTrend(accuracyTrend),
      latencyTrend: this.scoreToTrend(latencyTrend),
      hallucinationTrend: this.scoreToTrend(hallucinationTrend),
      confidenceTrend: this.scoreToTrend(confidenceTrend),
      overallTrend: this.scoreToTrend(trendScore),
      trendScore,
      recommendations,
    };
  }

  private calculateTrend(values: number[], lowerIsBetter: boolean = false): number {
    if (values.length < 2) return 0;

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (lowerIsBetter) {
      return -change; // Negative change is improvement
    }
    
    return change;
  }

  private calculateOverallTrend(trendScores: number[]): 'improving' | 'declining' | 'stable' {
    const avgTrend = trendScores.reduce((sum, score) => sum + score, 0) / trendScores.length;
    
    if (avgTrend > 0.1) return 'improving';
    if (avgTrend < -0.1) return 'declining';
    return 'stable';
  }

  private scoreToTrend(score: number): 'improving' | 'declining' | 'stable' {
    if (score > 0.05) return 'improving';
    if (score < -0.05) return 'declining';
    return 'stable';
  }

  private generateTrendRecommendations(trends: {
    accuracyTrend: number;
    latencyTrend: number;
    hallucinationTrend: number;
    confidenceTrend: number;
  }): string[] {
    const recommendations: string[] = [];

    if (trends.accuracyTrend < -0.1) {
      recommendations.push('Accuracy is declining - consider model retraining or data quality improvements');
    }

    if (trends.latencyTrend > 0.1) {
      recommendations.push('Latency is increasing - optimize model performance and infrastructure');
    }

    if (trends.hallucinationTrend > 0.1) {
      recommendations.push('Hallucination rate is increasing - implement better fact-checking mechanisms');
    }

    if (trends.confidenceTrend < -0.1) {
      recommendations.push('Confidence scores are declining - review model calibration');
    }

    if (recommendations.length === 0) {
      recommendations.push('All performance metrics are stable - continue current approach');
    }

    return recommendations;
  }

  // Public API methods
  getPerformanceSnapshots(hours: number = 24): PerformanceSnapshot[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.performanceSnapshots.filter(s => s.timestamp > cutoffTime);
  }

  getAlerts(unresolved: boolean = true): PerformanceAlert[] {
    return unresolved ? this.alerts.filter(a => !a.resolved) : this.alerts;
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      this.logger.info(`Alert resolved`, {
        alertId,
        resolvedAt: alert.resolvedAt,
      });
    }
  }

  getMonitoringStatus(): { isMonitoring: boolean; snapshotsCount: number; alertsCount: number } {
    return {
      isMonitoring: this.isMonitoring,
      snapshotsCount: this.performanceSnapshots.length,
      alertsCount: this.alerts.length,
    };
  }

  async exportMetrics(format: 'json' | 'csv'): Promise<string> {
    if (!this.config.enableMetricsExport) {
      throw new Error('Metrics export is disabled');
    }

    if (format === 'json') {
      return JSON.stringify({
        snapshots: this.performanceSnapshots,
        alerts: this.alerts,
        config: this.config,
      }, null, 2);
    } else {
      // CSV format for snapshots
      const headers = ['timestamp', 'accuracy', 'latencyMs', 'hallucinationRate', 'confidenceScore', 'errorRate', 'throughputPerSecond'];
      const rows = this.performanceSnapshots.map(s => [
        s.timestamp.toISOString(),
        s.accuracy.toString(),
        s.latencyMs.toString(),
        s.hallucinationRate.toString(),
        s.confidenceScore.toString(),
        s.errorRate.toString(),
        s.throughputPerSecond.toString(),
      ]);
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
  }

  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Monitoring configuration updated', { config });
  }

  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  // Cleanup methods
  clearSnapshots(): void {
    this.performanceSnapshots = [];
    this.logger.info('Performance snapshots cleared');
  }

  clearAlerts(): void {
    this.alerts = [];
    this.logger.info('Performance alerts cleared');
  }
}
