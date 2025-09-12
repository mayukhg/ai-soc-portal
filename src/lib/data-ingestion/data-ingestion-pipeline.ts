/**
 * Data Ingestion Pipeline
 * Main orchestrator for the complete data ingestion pipeline
 */

import { SIEMConnector, SIEMConfig, SIEMQuery } from './connectors/siem-connector';
import { SOARConnector, SOARConfig, SOARQuery } from './connectors/soar-connector';
import { EDRConnector, EDRConfig, EDRQuery } from './connectors/edr-connector';
import { DataValidators, ValidationResult } from './validation/data-validators';
import { DeduplicationEngine, DeduplicationResult } from './deduplication/deduplication-engine';
import { ErrorRecoveryEngine, RecoveryResult } from './error-handling/error-recovery';
import { IngestionMonitoringService, IngestionMetrics } from './monitoring/ingestion-monitoring';
import { Logger } from './utils/logger';

export interface DataSourceConfig {
  siem?: SIEMConfig[];
  soar?: SOARConfig[];
  edr?: EDRConfig[];
}

export interface PipelineConfig {
  enableValidation: boolean;
  enableDeduplication: boolean;
  enableErrorRecovery: boolean;
  enableMonitoring: boolean;
  batchSize: number;
  maxConcurrentSources: number;
  processingTimeoutMs: number;
}

export interface IngestionResult {
  success: boolean;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  processingTimeMs: number;
  sources: SourceResult[];
  errors: string[];
  warnings: string[];
}

export interface SourceResult {
  source: string;
  sourceType: 'siem' | 'soar' | 'edr';
  success: boolean;
  recordCount: number;
  processingTimeMs: number;
  errors: string[];
  warnings: string[];
}

export class DataIngestionPipeline {
  private logger: Logger;
  private config: PipelineConfig;
  private dataSourceConfig: DataSourceConfig;
  
  // Components
  private siemConnectors: SIEMConnector[];
  private soarConnectors: SOARConnector[];
  private edrConnectors: EDRConnector[];
  private validators: DataValidators;
  private deduplicationEngine: DeduplicationEngine;
  private errorRecoveryEngine: ErrorRecoveryEngine;
  private monitoringService: IngestionMonitoringService;

  constructor(config?: Partial<PipelineConfig>, dataSourceConfig?: DataSourceConfig) {
    this.logger = new Logger('DataIngestionPipeline');
    this.config = {
      enableValidation: true,
      enableDeduplication: true,
      enableErrorRecovery: true,
      enableMonitoring: true,
      batchSize: 1000,
      maxConcurrentSources: 5,
      processingTimeoutMs: 300000, // 5 minutes
    };
    this.dataSourceConfig = dataSourceConfig || {};
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initializeComponents();
  }

  private initializeComponents(): void {
    // Initialize connectors
    this.siemConnectors = (this.dataSourceConfig.siem || []).map(config => new SIEMConnector(config));
    this.soarConnectors = (this.dataSourceConfig.soar || []).map(config => new SOARConnector(config));
    this.edrConnectors = (this.dataSourceConfig.edr || []).map(config => new EDRConnector(config));

    // Initialize processing components
    this.validators = new DataValidators();
    this.deduplicationEngine = new DeduplicationEngine();
    this.errorRecoveryEngine = new ErrorRecoveryEngine();
    this.monitoringService = new IngestionMonitoringService();

    this.logger.info('Data ingestion pipeline initialized', {
      siemConnectors: this.siemConnectors.length,
      soarConnectors: this.soarConnectors.length,
      edrConnectors: this.edrConnectors.length,
      config: this.config,
    });
  }

  async runFullIngestion(): Promise<IngestionResult> {
    const startTime = Date.now();
    this.logger.info('Starting full data ingestion');

    const result: IngestionResult = {
      success: true,
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      duplicateRecords: 0,
      processingTimeMs: 0,
      sources: [],
      errors: [],
      warnings: [],
    };

    try {
      // Phase 1: Data Collection
      this.logger.info('Phase 1: Collecting data from all sources');
      const collectedData = await this.collectAllDataSources();
      result.totalRecords = collectedData.reduce((sum, source) => sum + source.recordCount, 0);

      // Phase 2: Data Processing
      this.logger.info('Phase 2: Processing and normalizing data');
      const processedData = await this.processAndNormalize(collectedData);

      // Phase 3: Validation
      if (this.config.enableValidation) {
        this.logger.info('Phase 3: Validating data');
        const validationResults = await this.validateData(processedData);
        result.processedRecords = validationResults.reduce((sum, vr) => sum + vr.acceptedCount, 0);
        result.failedRecords = validationResults.reduce((sum, vr) => sum + vr.rejectedCount, 0);
      } else {
        result.processedRecords = result.totalRecords;
      }

      // Phase 4: Deduplication
      if (this.config.enableDeduplication) {
        this.logger.info('Phase 4: Deduplicating data');
        const deduplicationResults = await this.deduplicateData(processedData);
        result.duplicateRecords = deduplicationResults.reduce((sum, dr) => sum + dr.duplicateCount, 0);
      }

      // Phase 5: Storage
      this.logger.info('Phase 5: Storing processed data');
      await this.storeData(processedData);

      // Phase 6: Monitoring
      if (this.config.enableMonitoring) {
        this.logger.info('Phase 6: Recording metrics');
        await this.recordMetrics(result, Date.now() - startTime);
      }

      result.processingTimeMs = Date.now() - startTime;
      result.success = result.errors.length === 0;

      this.logger.info('Full data ingestion completed', {
        success: result.success,
        totalRecords: result.totalRecords,
        processedRecords: result.processedRecords,
        failedRecords: result.failedRecords,
        duplicateRecords: result.duplicateRecords,
        processingTimeMs: result.processingTimeMs,
      });

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.processingTimeMs = Date.now() - startTime;

      this.logger.error('Full data ingestion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: result.processingTimeMs,
      });
    }

    return result;
  }

  async runIncrementalIngestion(lastRunTimestamp: Date): Promise<IngestionResult> {
    const startTime = Date.now();
    this.logger.info('Starting incremental data ingestion', { lastRunTimestamp });

    const result: IngestionResult = {
      success: true,
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      duplicateRecords: 0,
      processingTimeMs: 0,
      sources: [],
      errors: [],
      warnings: [],
    };

    try {
      // Get only new/changed data since last run
      const newData = await this.getIncrementalData(lastRunTimestamp);
      result.totalRecords = newData.reduce((sum, source) => sum + source.recordCount, 0);

      if (result.totalRecords === 0) {
        this.logger.info('No new data found for incremental ingestion');
        return result;
      }

      // Process only new data
      const processedData = await this.processAndNormalize(newData);
      
      if (this.config.enableValidation) {
        const validationResults = await this.validateData(processedData);
        result.processedRecords = validationResults.reduce((sum, vr) => sum + vr.acceptedCount, 0);
        result.failedRecords = validationResults.reduce((sum, vr) => sum + vr.rejectedCount, 0);
      } else {
        result.processedRecords = result.totalRecords;
      }

      if (this.config.enableDeduplication) {
        const deduplicationResults = await this.deduplicateData(processedData);
        result.duplicateRecords = deduplicationResults.reduce((sum, dr) => sum + dr.duplicateCount, 0);
      }

      await this.storeData(processedData);

      if (this.config.enableMonitoring) {
        await this.recordMetrics(result, Date.now() - startTime);
      }

      result.processingTimeMs = Date.now() - startTime;
      result.success = result.errors.length === 0;

      this.logger.info('Incremental data ingestion completed', {
        success: result.success,
        totalRecords: result.totalRecords,
        processedRecords: result.processedRecords,
        processingTimeMs: result.processingTimeMs,
      });

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.processingTimeMs = Date.now() - startTime;

      this.logger.error('Incremental data ingestion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  private async collectAllDataSources(): Promise<SourceResult[]> {
    const collectionTasks: Promise<SourceResult>[] = [];

    // Collect from SIEM sources
    for (const connector of this.siemConnectors) {
      collectionTasks.push(this.collectSIEMData(connector));
    }

    // Collect from SOAR sources
    for (const connector of this.soarConnectors) {
      collectionTasks.push(this.collectSOARData(connector));
    }

    // Collect from EDR sources
    for (const connector of this.edrConnectors) {
      collectionTasks.push(this.collectEDRData(connector));
    }

    // Run collection tasks in parallel with concurrency limit
    const results = await this.runWithConcurrencyLimit(collectionTasks, this.config.maxConcurrentSources);
    
    return results.filter(result => result !== null) as SourceResult[];
  }

  private async collectSIEMData(connector: SIEMConnector): Promise<SourceResult> {
    const startTime = Date.now();
    const sourceResult: SourceResult = {
      source: 'siem',
      sourceType: 'siem',
      success: false,
      recordCount: 0,
      processingTimeMs: 0,
      errors: [],
      warnings: [],
    };

    try {
      const query: SIEMQuery = {
        timeRange: 'last_24_hours',
        eventTypes: ['alerts', 'logs', 'correlations'],
        limit: this.config.batchSize,
      };

      const events = await connector.fetchRecentEvents(query);
      sourceResult.recordCount = events.length;
      sourceResult.success = true;

      this.logger.info(`Collected ${events.length} events from SIEM`);

    } catch (error) {
      sourceResult.errors.push(error instanceof Error ? error.message : 'Unknown error');
      this.logger.error('SIEM data collection failed', { error });
    }

    sourceResult.processingTimeMs = Date.now() - startTime;
    return sourceResult;
  }

  private async collectSOARData(connector: SOARConnector): Promise<SourceResult> {
    const startTime = Date.now();
    const sourceResult: SourceResult = {
      source: 'soar',
      sourceType: 'soar',
      success: false,
      recordCount: 0,
      processingTimeMs: 0,
      errors: [],
      warnings: [],
    };

    try {
      const query: SOARQuery = {
        timeRange: 'last_7_days',
        status: ['new', 'in_progress', 'resolved'],
        limit: this.config.batchSize,
      };

      const incidents = await connector.fetchIncidents(query);
      const playbooks = await connector.fetchPlaybookExecutions(query);
      
      sourceResult.recordCount = incidents.length + playbooks.length;
      sourceResult.success = true;

      this.logger.info(`Collected ${incidents.length} incidents and ${playbooks.length} playbooks from SOAR`);

    } catch (error) {
      sourceResult.errors.push(error instanceof Error ? error.message : 'Unknown error');
      this.logger.error('SOAR data collection failed', { error });
    }

    sourceResult.processingTimeMs = Date.now() - startTime;
    return sourceResult;
  }

  private async collectEDRData(connector: EDRConnector): Promise<SourceResult> {
    const startTime = Date.now();
    const sourceResult: SourceResult = {
      source: 'edr',
      sourceType: 'edr',
      success: false,
      recordCount: 0,
      processingTimeMs: 0,
      errors: [],
      warnings: [],
    };

    try {
      const query: EDRQuery = {
        timeRange: 'last_24_hours',
        severity: ['high', 'critical'],
        limit: this.config.batchSize,
      };

      const detections = await connector.fetchDetections(query);
      const telemetry = await connector.fetchTelemetry(query);
      
      sourceResult.recordCount = detections.length + telemetry.length;
      sourceResult.success = true;

      this.logger.info(`Collected ${detections.length} detections and ${telemetry.length} telemetry events from EDR`);

    } catch (error) {
      sourceResult.errors.push(error instanceof Error ? error.message : 'Unknown error');
      this.logger.error('EDR data collection failed', { error });
    }

    sourceResult.processingTimeMs = Date.now() - startTime;
    return sourceResult;
  }

  private async getIncrementalData(lastRunTimestamp: Date): Promise<SourceResult[]> {
    // This would implement incremental data collection logic
    // For now, we'll use the same collection logic but with a shorter time range
    this.logger.info('Collecting incremental data since', { lastRunTimestamp });
    
    // Modify the collection to only get data since last run
    // This is a simplified implementation
    return await this.collectAllDataSources();
  }

  private async processAndNormalize(sourceResults: SourceResult[]): Promise<any[]> {
    const allData: any[] = [];

    for (const sourceResult of sourceResults) {
      if (sourceResult.success && sourceResult.recordCount > 0) {
        // This would implement the actual data processing and normalization
        // For now, we'll create placeholder data
        const processedData = this.createProcessedData(sourceResult);
        allData.push(...processedData);
      }
    }

    return allData;
  }

  private createProcessedData(sourceResult: SourceResult): any[] {
    // This is a placeholder implementation
    // In reality, this would process the actual collected data
    const processedData: any[] = [];
    
    for (let i = 0; i < sourceResult.recordCount; i++) {
      processedData.push({
        id: `${sourceResult.source}_${Date.now()}_${i}`,
        source: sourceResult.source,
        sourceType: sourceResult.sourceType,
        timestamp: new Date(),
        processed: true,
      });
    }

    return processedData;
  }

  private async validateData(data: any[]): Promise<ValidationResult[]> {
    const validationResults: ValidationResult[] = [];
    
    // Group data by source
    const dataBySource = this.groupDataBySource(data);
    
    for (const [source, sourceData] of dataBySource) {
      try {
        const result = await this.validators.validateSourceData(sourceData, source);
        validationResults.push(result);
      } catch (error) {
        this.logger.error(`Validation failed for ${source}`, { error });
        validationResults.push({
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
          validatedData: [],
          rejectedCount: sourceData.length,
          acceptedCount: 0,
        });
      }
    }

    return validationResults;
  }

  private async deduplicateData(data: any[]): Promise<DeduplicationResult[]> {
    const deduplicationResults: DeduplicationResult[] = [];
    
    // Group data by source
    const dataBySource = this.groupDataBySource(data);
    
    for (const [source, sourceData] of dataBySource) {
      try {
        const result = await this.deduplicationEngine.deduplicate(sourceData, source);
        deduplicationResults.push(result);
      } catch (error) {
        this.logger.error(`Deduplication failed for ${source}`, { error });
        deduplicationResults.push({
          uniqueRecords: sourceData,
          duplicateGroups: [],
          duplicateCount: 0,
          uniqueCount: sourceData.length,
          totalCount: sourceData.length,
          processingTime: 0,
        });
      }
    }

    return deduplicationResults;
  }

  private groupDataBySource(data: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    
    for (const record of data) {
      const source = record.source || 'unknown';
      if (!grouped.has(source)) {
        grouped.set(source, []);
      }
      grouped.get(source)!.push(record);
    }
    
    return grouped;
  }

  private async storeData(data: any[]): Promise<void> {
    this.logger.info(`Storing ${data.length} processed records`);
    
    // This would implement actual data storage logic
    // For example, storing to Aurora PostgreSQL and Pinecone
    
    // Simulate storage delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.logger.info('Data storage completed');
  }

  private async recordMetrics(result: IngestionResult, processingTimeMs: number): Promise<void> {
    const metrics: IngestionMetrics = {
      timestamp: new Date(),
      source: 'pipeline',
      totalRecords: result.totalRecords,
      processedRecords: result.processedRecords,
      failedRecords: result.failedRecords,
      duplicateRecords: result.duplicateRecords,
      processingTimeMs,
      throughputPerSecond: result.totalRecords / (processingTimeMs / 1000),
      errorRate: result.totalRecords > 0 ? result.failedRecords / result.totalRecords : 0,
      latencyP50: processingTimeMs,
      latencyP95: processingTimeMs,
      latencyP99: processingTimeMs,
      memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsagePercent: 0,
      queueSize: 0,
      cacheHitRate: 0,
    };

    await this.monitoringService.recordIngestionMetrics('pipeline', metrics);
  }

  private async runWithConcurrencyLimit<T>(
    tasks: Promise<T>[],
    limit: number
  ): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const promise = task
        .then(result => {
          results[i] = result;
        })
        .catch(error => {
          this.logger.error(`Task ${i} failed`, { error });
          results[i] = null;
        });

      executing.push(promise);

      if (executing.length >= limit) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  // Configuration management
  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Pipeline configuration updated', { config });
  }

  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  // Component access
  getMonitoringService(): IngestionMonitoringService {
    return this.monitoringService;
  }

  getErrorRecoveryEngine(): ErrorRecoveryEngine {
    return this.errorRecoveryEngine;
  }

  getDeduplicationEngine(): DeduplicationEngine {
    return this.deduplicationEngine;
  }

  getValidators(): DataValidators {
    return this.validators;
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check connector health
    for (const connector of this.siemConnectors) {
      const isHealthy = await connector.testConnection();
      if (!isHealthy) {
        issues.push('SIEM connector connection failed');
      }
    }

    for (const connector of this.soarConnectors) {
      const isHealthy = await connector.testConnection();
      if (!isHealthy) {
        issues.push('SOAR connector connection failed');
      }
    }

    for (const connector of this.edrConnectors) {
      const isHealthy = await connector.testConnection();
      if (!isHealthy) {
        issues.push('EDR connector connection failed');
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}
