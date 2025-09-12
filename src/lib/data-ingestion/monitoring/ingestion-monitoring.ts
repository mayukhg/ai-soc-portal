/**
 * Ingestion Monitoring Service
 * Comprehensive monitoring and alerting for data ingestion pipeline
 */

import { Logger } from '../utils/logger';

export interface MonitoringConfig {
  enableMetrics: boolean;
  enableAlerts: boolean;
  enableHealthChecks: boolean;
  metricsIntervalMs: number;
  healthCheckIntervalMs: number;
  alertThresholds: AlertThresholds;
  retentionDays: number;
}

export interface AlertThresholds {
  errorRate: number;
  latencyMs: number;
  throughputMin: number;
  queueSize: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
}

export interface IngestionMetrics {
  timestamp: Date;
  source: string;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  processingTimeMs: number;
  throughputPerSecond: number;
  errorRate: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  memoryUsageMB: number;
  cpuUsagePercent: number;
  queueSize: number;
  cacheHitRate: number;
}

export interface HealthStatus {
  source: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  issues: HealthIssue[];
  metrics: IngestionMetrics;
}

export interface HealthIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution?: string;
}

export interface Alert {
  id: string;
  source: string;
  type: 'threshold' | 'anomaly' | 'health' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export class IngestionMonitoringService {
  private logger: Logger;
  private config: MonitoringConfig;
  private metrics: Map<string, IngestionMetrics[]>;
  private healthStatuses: Map<string, HealthStatus>;
  private alerts: Map<string, Alert[]>;
  private metricsInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config?: Partial<MonitoringConfig>) {
    this.logger = new Logger('IngestionMonitoringService');
    this.config = {
      enableMetrics: true,
      enableAlerts: true,
      enableHealthChecks: true,
      metricsIntervalMs: 60000, // 1 minute
      healthCheckIntervalMs: 300000, // 5 minutes
      alertThresholds: {
        errorRate: 0.05, // 5%
        latencyMs: 30000, // 30 seconds
        throughputMin: 10, // 10 records per second
        queueSize: 1000,
        memoryUsagePercent: 80,
        diskUsagePercent: 85,
      },
      retentionDays: 7,
    };
    this.metrics = new Map();
    this.healthStatuses = new Map();
    this.alerts = new Map();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.startMonitoring();
  }

  private startMonitoring(): void {
    if (this.config.enableMetrics) {
      this.metricsInterval = setInterval(() => {
        this.collectMetrics();
      }, this.config.metricsIntervalMs);
    }

    if (this.config.enableHealthChecks) {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthChecks();
      }, this.config.healthCheckIntervalMs);
    }

    this.logger.info('Ingestion monitoring started', {
      metricsEnabled: this.config.enableMetrics,
      alertsEnabled: this.config.enableAlerts,
      healthChecksEnabled: this.config.enableHealthChecks,
    });
  }

  async recordIngestionMetrics(
    source: string,
    metrics: Partial<IngestionMetrics>
  ): Promise<void> {
    try {
      const fullMetrics: IngestionMetrics = {
        timestamp: new Date(),
        source,
        totalRecords: metrics.totalRecords || 0,
        processedRecords: metrics.processedRecords || 0,
        failedRecords: metrics.failedRecords || 0,
        duplicateRecords: metrics.duplicateRecords || 0,
        processingTimeMs: metrics.processingTimeMs || 0,
        throughputPerSecond: metrics.throughputPerSecond || 0,
        errorRate: metrics.errorRate || 0,
        latencyP50: metrics.latencyP50 || 0,
        latencyP95: metrics.latencyP95 || 0,
        latencyP99: metrics.latencyP99 || 0,
        memoryUsageMB: metrics.memoryUsageMB || 0,
        cpuUsagePercent: metrics.cpuUsagePercent || 0,
        queueSize: metrics.queueSize || 0,
        cacheHitRate: metrics.cacheHitRate || 0,
      };

      if (!this.metrics.has(source)) {
        this.metrics.set(source, []);
      }

      this.metrics.get(source)!.push(fullMetrics);

      // Clean up old metrics
      this.cleanupOldMetrics(source);

      // Check for alerts
      if (this.config.enableAlerts) {
        await this.checkAlerts(source, fullMetrics);
      }

      this.logger.debug(`Recorded metrics for ${source}`, {
        totalRecords: fullMetrics.totalRecords,
        processedRecords: fullMetrics.processedRecords,
        errorRate: fullMetrics.errorRate,
      });

    } catch (error) {
      this.logger.error(`Failed to record metrics for ${source}`, { error });
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const sources = Array.from(this.metrics.keys());
      
      for (const source of sources) {
        const systemMetrics = await this.getSystemMetrics();
        const sourceMetrics = await this.getSourceMetrics(source);
        
        const combinedMetrics: IngestionMetrics = {
          timestamp: new Date(),
          source,
          ...sourceMetrics,
          ...systemMetrics,
        };

        await this.recordIngestionMetrics(source, combinedMetrics);
      }

    } catch (error) {
      this.logger.error('Failed to collect metrics', { error });
    }
  }

  private async getSystemMetrics(): Promise<Partial<IngestionMetrics>> {
    // This would collect actual system metrics
    return {
      memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsagePercent: await this.getCpuUsage(),
    };
  }

  private async getSourceMetrics(source: string): Promise<Partial<IngestionMetrics>> {
    // This would collect source-specific metrics
    return {
      queueSize: await this.getQueueSize(source),
      cacheHitRate: await this.getCacheHitRate(source),
    };
  }

  private async getCpuUsage(): Promise<number> {
    // This would implement actual CPU usage calculation
    return Math.random() * 100; // Placeholder
  }

  private async getQueueSize(source: string): Promise<number> {
    // This would get actual queue size for the source
    return Math.floor(Math.random() * 1000); // Placeholder
  }

  private async getCacheHitRate(source: string): Promise<number> {
    // This would get actual cache hit rate for the source
    return Math.random(); // Placeholder
  }

  private async checkAlerts(source: string, metrics: IngestionMetrics): Promise<void> {
    const alerts: Alert[] = [];

    // Check error rate threshold
    if (metrics.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        id: `error_rate_${source}_${Date.now()}`,
        source,
        type: 'threshold',
        severity: 'high',
        message: `Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds threshold ${(this.config.alertThresholds.errorRate * 100).toFixed(2)}%`,
        timestamp: new Date(),
        resolved: false,
        metadata: { errorRate: metrics.errorRate, threshold: this.config.alertThresholds.errorRate },
      });
    }

    // Check latency threshold
    if (metrics.latencyP95 > this.config.alertThresholds.latencyMs) {
      alerts.push({
        id: `latency_${source}_${Date.now()}`,
        source,
        type: 'threshold',
        severity: 'medium',
        message: `P95 latency ${metrics.latencyP95}ms exceeds threshold ${this.config.alertThresholds.latencyMs}ms`,
        timestamp: new Date(),
        resolved: false,
        metadata: { latencyP95: metrics.latencyP95, threshold: this.config.alertThresholds.latencyMs },
      });
    }

    // Check throughput threshold
    if (metrics.throughputPerSecond < this.config.alertThresholds.throughputMin) {
      alerts.push({
        id: `throughput_${source}_${Date.now()}`,
        source,
        type: 'threshold',
        severity: 'medium',
        message: `Throughput ${metrics.throughputPerSecond.toFixed(2)} records/sec below threshold ${this.config.alertThresholds.throughputMin}`,
        timestamp: new Date(),
        resolved: false,
        metadata: { throughput: metrics.throughputPerSecond, threshold: this.config.alertThresholds.throughputMin },
      });
    }

    // Check queue size threshold
    if (metrics.queueSize > this.config.alertThresholds.queueSize) {
      alerts.push({
        id: `queue_size_${source}_${Date.now()}`,
        source,
        type: 'threshold',
        severity: 'high',
        message: `Queue size ${metrics.queueSize} exceeds threshold ${this.config.alertThresholds.queueSize}`,
        timestamp: new Date(),
        resolved: false,
        metadata: { queueSize: metrics.queueSize, threshold: this.config.alertThresholds.queueSize },
      });
    }

    // Check memory usage threshold
    if (metrics.memoryUsageMB > (this.config.alertThresholds.memoryUsagePercent / 100) * 8192) { // Assuming 8GB total memory
      alerts.push({
        id: `memory_${source}_${Date.now()}`,
        source,
        type: 'system',
        severity: 'critical',
        message: `Memory usage ${metrics.memoryUsageMB.toFixed(2)}MB exceeds threshold`,
        timestamp: new Date(),
        resolved: false,
        metadata: { memoryUsageMB: metrics.memoryUsageMB, threshold: this.config.alertThresholds.memoryUsagePercent },
      });
    }

    // Store alerts
    for (const alert of alerts) {
      await this.createAlert(alert);
    }
  }

  private async createAlert(alert: Alert): Promise<void> {
    if (!this.alerts.has(alert.source)) {
      this.alerts.set(alert.source, []);
    }

    this.alerts.get(alert.source)!.push(alert);

    this.logger.warn(`Alert created for ${alert.source}`, {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
    });

    // Send alert notification
    await this.sendAlertNotification(alert);
  }

  private async sendAlertNotification(alert: Alert): Promise<void> {
    // This would implement actual alert notification logic
    // For example, sending to Slack, email, PagerDuty, etc.
    
    this.logger.info(`Sending alert notification`, {
      alertId: alert.id,
      source: alert.source,
      severity: alert.severity,
      message: alert.message,
    });
  }

  private async performHealthChecks(): Promise<void> {
    try {
      const sources = Array.from(this.metrics.keys());
      
      for (const source of sources) {
        const healthStatus = await this.checkSourceHealth(source);
        this.healthStatuses.set(source, healthStatus);
      }

    } catch (error) {
      this.logger.error('Failed to perform health checks', { error });
    }
  }

  private async checkSourceHealth(source: string): Promise<HealthStatus> {
    const issues: HealthIssue[] = [];
    const recentMetrics = this.getRecentMetrics(source, 5); // Last 5 data points
    
    if (recentMetrics.length === 0) {
      issues.push({
        type: 'error',
        message: 'No recent metrics available',
        timestamp: new Date(),
        severity: 'high',
        resolution: 'Check data source connectivity',
      });
    } else {
      const latestMetrics = recentMetrics[recentMetrics.length - 1];
      
      // Check for high error rate
      if (latestMetrics.errorRate > 0.1) {
        issues.push({
          type: 'error',
          message: `High error rate: ${(latestMetrics.errorRate * 100).toFixed(2)}%`,
          timestamp: new Date(),
          severity: 'high',
          resolution: 'Investigate data source issues',
        });
      }

      // Check for low throughput
      if (latestMetrics.throughputPerSecond < 1) {
        issues.push({
          type: 'warning',
          message: `Low throughput: ${latestMetrics.throughputPerSecond.toFixed(2)} records/sec`,
          timestamp: new Date(),
          severity: 'medium',
          resolution: 'Check processing pipeline performance',
        });
      }

      // Check for high latency
      if (latestMetrics.latencyP95 > 60000) { // 1 minute
        issues.push({
          type: 'warning',
          message: `High latency: ${latestMetrics.latencyP95}ms`,
          timestamp: new Date(),
          severity: 'medium',
          resolution: 'Optimize processing pipeline',
        });
      }
    }

    const status: 'healthy' | 'degraded' | 'unhealthy' = 
      issues.some(issue => issue.severity === 'critical' || issue.severity === 'high') ? 'unhealthy' :
      issues.some(issue => issue.severity === 'medium') ? 'degraded' : 'healthy';

    return {
      source,
      status,
      lastCheck: new Date(),
      issues,
      metrics: recentMetrics[recentMetrics.length - 1] || this.getDefaultMetrics(source),
    };
  }

  private getDefaultMetrics(source: string): IngestionMetrics {
    return {
      timestamp: new Date(),
      source,
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      duplicateRecords: 0,
      processingTimeMs: 0,
      throughputPerSecond: 0,
      errorRate: 0,
      latencyP50: 0,
      latencyP95: 0,
      latencyP99: 0,
      memoryUsageMB: 0,
      cpuUsagePercent: 0,
      queueSize: 0,
      cacheHitRate: 0,
    };
  }

  private getRecentMetrics(source: string, count: number): IngestionMetrics[] {
    const sourceMetrics = this.metrics.get(source) || [];
    return sourceMetrics.slice(-count);
  }

  private cleanupOldMetrics(source: string): void {
    const sourceMetrics = this.metrics.get(source);
    if (!sourceMetrics) return;

    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    const filteredMetrics = sourceMetrics.filter(metric => metric.timestamp > cutoffDate);
    
    this.metrics.set(source, filteredMetrics);
  }

  // Public API methods
  getMetrics(source: string, hours: number = 24): IngestionMetrics[] {
    const sourceMetrics = this.metrics.get(source) || [];
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    return sourceMetrics.filter(metric => metric.timestamp > cutoffDate);
  }

  getHealthStatus(source: string): HealthStatus | undefined {
    return this.healthStatuses.get(source);
  }

  getAllHealthStatuses(): Map<string, HealthStatus> {
    return new Map(this.healthStatuses);
  }

  getAlerts(source: string, unresolved: boolean = true): Alert[] {
    const sourceAlerts = this.alerts.get(source) || [];
    return unresolved ? sourceAlerts.filter(alert => !alert.resolved) : sourceAlerts;
  }

  getAllAlerts(unresolved: boolean = true): Alert[] {
    const allAlerts: Alert[] = [];
    for (const alerts of this.alerts.values()) {
      allAlerts.push(...alerts);
    }
    return unresolved ? allAlerts.filter(alert => !alert.resolved) : allAlerts;
  }

  async resolveAlert(alertId: string, source: string): Promise<void> {
    const sourceAlerts = this.alerts.get(source);
    if (!sourceAlerts) return;

    const alert = sourceAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      this.logger.info(`Alert resolved`, {
        alertId,
        source,
        resolvedAt: alert.resolvedAt,
      });
    }
  }

  getMonitoringSummary(): any {
    const sources = Array.from(this.metrics.keys());
    const summary: any = {
      totalSources: sources.length,
      healthStatuses: {},
      alertCounts: {},
      metricsSummary: {},
    };

    for (const source of sources) {
      const healthStatus = this.healthStatuses.get(source);
      const alerts = this.getAlerts(source, true);
      const recentMetrics = this.getRecentMetrics(source, 1);

      summary.healthStatuses[source] = healthStatus?.status || 'unknown';
      summary.alertCounts[source] = alerts.length;
      summary.metricsSummary[source] = recentMetrics[0] || null;
    }

    return summary;
  }

  // Configuration management
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Monitoring configuration updated', { config });
  }

  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  // Cleanup and shutdown
  stopMonitoring(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.logger.info('Ingestion monitoring stopped');
  }

  clearMetrics(source?: string): void {
    if (source) {
      this.metrics.delete(source);
      this.logger.info(`Cleared metrics for ${source}`);
    } else {
      this.metrics.clear();
      this.logger.info('Cleared all metrics');
    }
  }

  clearAlerts(source?: string): void {
    if (source) {
      this.alerts.delete(source);
      this.logger.info(`Cleared alerts for ${source}`);
    } else {
      this.alerts.clear();
      this.logger.info('Cleared all alerts');
    }
  }
}
