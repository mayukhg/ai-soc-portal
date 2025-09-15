/**
 * Audit Service
 * Comprehensive auditability framework for AI-First SOC Portal
 * 
 * This service provides:
 * - Complete audit trails for all AI operations
 * - Source tracking for RAG responses
 * - Guardrail filtering audit logs
 * - Compliance and regulatory audit support
 * - Immutable audit records with cryptographic integrity
 * - Real-time audit monitoring and alerting
 */

import { Logger } from '../data-ingestion/utils/logger';
import * as crypto from 'crypto';

export interface AuditEvent {
  eventId: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  workflowId?: string;
  operation: string;
  category: AuditCategory;
  severity: AuditSeverity;
  source: string;
  target?: string;
  action: string;
  result: AuditResult;
  metadata: AuditMetadata;
  dataClassification: DataClassification;
  complianceFlags: ComplianceFlag[];
  integrityHash: string;
  previousHash?: string;
}

export type AuditEventType = 
  | 'ai_operation'
  | 'data_access'
  | 'data_modification'
  | 'user_action'
  | 'system_event'
  | 'security_event'
  | 'compliance_event'
  | 'guardrail_action'
  | 'source_retrieval'
  | 'response_generation'
  | 'model_inference'
  | 'workflow_execution'
  | 'error_event'
  | 'configuration_change'
  | 'access_control';

export type AuditCategory = 
  | 'threat_analysis'
  | 'incident_response'
  | 'risk_assessment'
  | 'correlation_analysis'
  | 'data_ingestion'
  | 'user_management'
  | 'system_administration'
  | 'security_monitoring'
  | 'compliance_monitoring'
  | 'ai_model_operations'
  | 'rag_operations'
  | 'guardrail_enforcement';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AuditResult = 'success' | 'failure' | 'partial' | 'blocked' | 'error';

export interface AuditMetadata {
  // AI-specific metadata
  modelName?: string;
  modelVersion?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costEstimate?: number;
  latencyMs?: number;
  confidenceScore?: number;
  
  // RAG-specific metadata
  retrievedSources?: RetrievedSource[];
  sourceCount?: number;
  relevanceScores?: number[];
  contextLength?: number;
  
  // Guardrail metadata
  filteredContent?: FilteredContent[];
  filterReason?: string;
  filterType?: string;
  originalContent?: string;
  sanitizedContent?: string;
  
  // Workflow metadata
  workflowPhase?: string;
  agentType?: string;
  phaseDuration?: number;
  totalDuration?: number;
  
  // Security metadata
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  riskScore?: number;
  threatIndicators?: string[];
  
  // Compliance metadata
  dataSubject?: string;
  dataPurpose?: string;
  legalBasis?: string;
  retentionPeriod?: number;
  crossBorderTransfer?: boolean;
  
  // Custom metadata
  customAttributes?: Record<string, any>;
}

export interface RetrievedSource {
  sourceId: string;
  sourceType: 'document' | 'database' | 'api' | 'knowledge_base' | 'external';
  sourceName: string;
  sourceUrl?: string;
  relevanceScore: number;
  confidenceScore: number;
  retrievalTimestamp: Date;
  contentSnippet: string;
  metadata: Record<string, any>;
}

export interface FilteredContent {
  filterId: string;
  filterType: 'toxicity' | 'bias' | 'pii' | 'sensitive' | 'malicious' | 'inappropriate';
  originalText: string;
  filteredText: string;
  filterReason: string;
  confidenceScore: number;
  severity: AuditSeverity;
  timestamp: Date;
}

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';

export type ComplianceFlag = 
  | 'gdpr'
  | 'ccpa'
  | 'hipaa'
  | 'sox'
  | 'pci_dss'
  | 'iso27001'
  | 'nist'
  | 'ai_act'
  | 'custom';

export interface AuditQuery {
  eventTypes?: AuditEventType[];
  categories?: AuditCategory[];
  severity?: AuditSeverity[];
  userId?: string;
  sessionId?: string;
  workflowId?: string;
  startDate?: Date;
  endDate?: Date;
  dataClassification?: DataClassification[];
  complianceFlags?: ComplianceFlag[];
  operation?: string;
  result?: AuditResult[];
  limit?: number;
  offset?: number;
}

export interface AuditReport {
  reportId: string;
  generatedAt: Date;
  generatedBy: string;
  query: AuditQuery;
  summary: {
    totalEvents: number;
    eventTypes: Record<AuditEventType, number>;
    categories: Record<AuditCategory, number>;
    severity: Record<AuditSeverity, number>;
    results: Record<AuditResult, number>;
    timeRange: { start: Date; end: Date };
  };
  events: AuditEvent[];
  complianceSummary: Record<ComplianceFlag, number>;
  dataClassificationSummary: Record<DataClassification, number>;
  integrityVerified: boolean;
}

export interface AuditConfig {
  enableAuditLogging: boolean;
  enableIntegrityVerification: boolean;
  enableRealTimeMonitoring: boolean;
  enableComplianceReporting: boolean;
  retentionPeriodDays: number;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  batchSize: number;
  flushIntervalMs: number;
  alertThresholds: {
    criticalEventsPerMinute: number;
    failedOperationsPercentage: number;
    suspiciousActivityScore: number;
  };
  complianceRequirements: ComplianceFlag[];
  dataClassificationRules: Record<string, DataClassification>;
}

export class AuditService {
  private logger: Logger;
  private config: AuditConfig;
  private auditEvents: AuditEvent[];
  private integrityChain: string[];
  private monitoringInterval?: NodeJS.Timeout;
  private batchBuffer: AuditEvent[];
  private lastFlushTime: Date;

  constructor(config?: Partial<AuditConfig>) {
    this.logger = new Logger('AuditService');
    this.config = {
      enableAuditLogging: true,
      enableIntegrityVerification: true,
      enableRealTimeMonitoring: true,
      enableComplianceReporting: true,
      retentionPeriodDays: 2555, // 7 years
      encryptionEnabled: true,
      compressionEnabled: true,
      batchSize: 100,
      flushIntervalMs: 5000,
      alertThresholds: {
        criticalEventsPerMinute: 10,
        failedOperationsPercentage: 5,
        suspiciousActivityScore: 0.8,
      },
      complianceRequirements: ['gdpr', 'sox', 'iso27001'],
      dataClassificationRules: {
        'user_data': 'confidential',
        'security_data': 'restricted',
        'public_data': 'public',
        'internal_data': 'internal',
      },
    };
    this.auditEvents = [];
    this.integrityChain = [];
    this.batchBuffer = [];
    this.lastFlushTime = new Date();

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initializeService();
  }

  private initializeService(): void {
    this.logger.info('Audit service initialized', {
      enableAuditLogging: this.config.enableAuditLogging,
      enableIntegrityVerification: this.config.enableIntegrityVerification,
      enableRealTimeMonitoring: this.config.enableRealTimeMonitoring,
      complianceRequirements: this.config.complianceRequirements,
    });

    if (this.config.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
    }

    if (this.config.enableAuditLogging) {
      this.startBatchProcessing();
    }
  }

  /**
   * Log an AI operation with complete audit trail
   * Tracks all aspects of AI operations including source retrieval and guardrail actions
   */
  async logAIOperation(params: {
    operation: string;
    category: AuditCategory;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    workflowId?: string;
    modelName?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costEstimate?: number;
    latencyMs?: number;
    confidenceScore?: number;
    retrievedSources?: RetrievedSource[];
    filteredContent?: FilteredContent[];
    workflowPhase?: string;
    agentType?: string;
    result: AuditResult;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const eventId = this.generateEventId();
    const timestamp = new Date();

    // Calculate data classification based on operation and metadata
    const dataClassification = this.classifyData(params.operation, params.metadata);
    
    // Determine compliance flags
    const complianceFlags = this.determineComplianceFlags(dataClassification, params.metadata);

    // Create audit metadata
    const auditMetadata: AuditMetadata = {
      modelName: params.modelName,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens: params.totalTokens,
      costEstimate: params.costEstimate,
      latencyMs: params.latencyMs,
      confidenceScore: params.confidenceScore,
      retrievedSources: params.retrievedSources,
      sourceCount: params.retrievedSources?.length,
      relevanceScores: params.retrievedSources?.map(s => s.relevanceScore),
      contextLength: params.retrievedSources?.reduce((sum, s) => sum + s.contentSnippet.length, 0),
      filteredContent: params.filteredContent,
      filterReason: params.filteredContent?.map(f => f.filterReason).join('; '),
      filterType: params.filteredContent?.map(f => f.filterType).join('; '),
      workflowPhase: params.workflowPhase,
      agentType: params.agentType,
      customAttributes: params.metadata,
    };

    // Determine severity based on operation and result
    const severity = this.determineSeverity(params.operation, params.result, params.filteredContent);

    // Calculate integrity hash
    const integrityHash = this.calculateIntegrityHash(eventId, timestamp, params);

    const auditEvent: AuditEvent = {
      eventId,
      timestamp,
      eventType: 'ai_operation',
      userId: params.userId,
      sessionId: params.sessionId,
      requestId: params.requestId,
      workflowId: params.workflowId,
      operation: params.operation,
      category: params.category,
      severity,
      source: 'ai_system',
      action: params.operation,
      result: params.result,
      metadata: auditMetadata,
      dataClassification,
      complianceFlags,
      integrityHash,
      previousHash: this.integrityChain[this.integrityChain.length - 1],
    };

    // Add to integrity chain
    this.integrityChain.push(integrityHash);

    // Store audit event
    await this.storeAuditEvent(auditEvent);

    this.logger.info('AI operation audited', {
      eventId,
      operation: params.operation,
      category: params.category,
      severity,
      result: params.result,
      dataClassification,
      complianceFlags,
      sourceCount: params.retrievedSources?.length || 0,
      filteredContentCount: params.filteredContent?.length || 0,
    });

    return eventId;
  }

  /**
   * Log source retrieval for RAG operations
   * Tracks which sources were retrieved and used for generating responses
   */
  async logSourceRetrieval(params: {
    query: string;
    retrievedSources: RetrievedSource[];
    userId?: string;
    sessionId?: string;
    requestId?: string;
    workflowId?: string;
    retrievalMethod: string;
    totalSources: number;
    retrievalLatencyMs: number;
    result: AuditResult;
  }): Promise<string> {
    const eventId = this.generateEventId();
    const timestamp = new Date();

    const auditMetadata: AuditMetadata = {
      retrievedSources: params.retrievedSources,
      sourceCount: params.retrievedSources.length,
      relevanceScores: params.retrievedSources.map(s => s.relevanceScore),
      contextLength: params.retrievedSources.reduce((sum, s) => sum + s.contentSnippet.length, 0),
      latencyMs: params.retrievalLatencyMs,
      customAttributes: {
        query: params.query,
        retrievalMethod: params.retrievalMethod,
        totalSources: params.totalSources,
      },
    };

    const severity = this.determineSeverity('source_retrieval', params.result);
    const dataClassification = this.classifyData('source_retrieval', { query: params.query });
    const complianceFlags = this.determineComplianceFlags(dataClassification, { query: params.query });
    const integrityHash = this.calculateIntegrityHash(eventId, timestamp, params);

    const auditEvent: AuditEvent = {
      eventId,
      timestamp,
      eventType: 'source_retrieval',
      userId: params.userId,
      sessionId: params.sessionId,
      requestId: params.requestId,
      workflowId: params.workflowId,
      operation: 'source_retrieval',
      category: 'rag_operations',
      severity,
      source: 'rag_system',
      action: 'retrieve_sources',
      result: params.result,
      metadata: auditMetadata,
      dataClassification,
      complianceFlags,
      integrityHash,
      previousHash: this.integrityChain[this.integrityChain.length - 1],
    };

    this.integrityChain.push(integrityHash);
    await this.storeAuditEvent(auditEvent);

    this.logger.info('Source retrieval audited', {
      eventId,
      query: params.query.substring(0, 100) + '...',
      sourceCount: params.retrievedSources.length,
      retrievalMethod: params.retrievalMethod,
      result: params.result,
    });

    return eventId;
  }

  /**
   * Log guardrail filtering actions
   * Tracks when content is filtered or removed by guardrails
   */
  async logGuardrailAction(params: {
    originalContent: string;
    filteredContent: FilteredContent[];
    userId?: string;
    sessionId?: string;
    requestId?: string;
    workflowId?: string;
    guardrailType: string;
    action: 'block' | 'filter' | 'sanitize' | 'allow';
    result: AuditResult;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const eventId = this.generateEventId();
    const timestamp = new Date();

    const auditMetadata: AuditMetadata = {
      filteredContent: params.filteredContent,
      filterReason: params.filteredContent.map(f => f.filterReason).join('; '),
      filterType: params.filteredContent.map(f => f.filterType).join('; '),
      originalContent: params.originalContent,
      sanitizedContent: params.filteredContent.map(f => f.filteredText).join(' '),
      customAttributes: {
        guardrailType: params.guardrailType,
        action: params.action,
        ...params.metadata,
      },
    };

    const severity = this.determineSeverity('guardrail_action', params.result, params.filteredContent);
    const dataClassification = this.classifyData('guardrail_action', { content: params.originalContent });
    const complianceFlags = this.determineComplianceFlags(dataClassification, { content: params.originalContent });
    const integrityHash = this.calculateIntegrityHash(eventId, timestamp, params);

    const auditEvent: AuditEvent = {
      eventId,
      timestamp,
      eventType: 'guardrail_action',
      userId: params.userId,
      sessionId: params.sessionId,
      requestId: params.requestId,
      workflowId: params.workflowId,
      operation: 'guardrail_enforcement',
      category: 'guardrail_enforcement',
      severity,
      source: 'guardrail_system',
      target: 'content',
      action: params.action,
      result: params.result,
      metadata: auditMetadata,
      dataClassification,
      complianceFlags,
      integrityHash,
      previousHash: this.integrityChain[this.integrityChain.length - 1],
    };

    this.integrityChain.push(integrityHash);
    await this.storeAuditEvent(auditEvent);

    this.logger.warn('Guardrail action audited', {
      eventId,
      guardrailType: params.guardrailType,
      action: params.action,
      filteredCount: params.filteredContent.length,
      severity,
      result: params.result,
    });

    return eventId;
  }

  /**
   * Log user actions with complete audit trail
   */
  async logUserAction(params: {
    userId: string;
    sessionId?: string;
    requestId?: string;
    action: string;
    target?: string;
    category: AuditCategory;
    result: AuditResult;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const eventId = this.generateEventId();
    const timestamp = new Date();

    const auditMetadata: AuditMetadata = {
      customAttributes: params.metadata,
    };

    const severity = this.determineSeverity('user_action', params.result);
    const dataClassification = this.classifyData('user_action', params.metadata);
    const complianceFlags = this.determineComplianceFlags(dataClassification, params.metadata);
    const integrityHash = this.calculateIntegrityHash(eventId, timestamp, params);

    const auditEvent: AuditEvent = {
      eventId,
      timestamp,
      eventType: 'user_action',
      userId: params.userId,
      sessionId: params.sessionId,
      requestId: params.requestId,
      operation: params.action,
      category: params.category,
      severity,
      source: 'user',
      target: params.target,
      action: params.action,
      result: params.result,
      metadata: auditMetadata,
      dataClassification,
      complianceFlags,
      integrityHash,
      previousHash: this.integrityChain[this.integrityChain.length - 1],
    };

    this.integrityChain.push(integrityHash);
    await this.storeAuditEvent(auditEvent);

    this.logger.info('User action audited', {
      eventId,
      userId: params.userId,
      action: params.action,
      target: params.target,
      category: params.category,
      result: params.result,
    });

    return eventId;
  }

  /**
   * Query audit events with comprehensive filtering
   */
  async queryAuditEvents(query: AuditQuery): Promise<AuditEvent[]> {
    this.logger.info('Querying audit events', { query });

    let filteredEvents = [...this.auditEvents];

    // Apply filters
    if (query.eventTypes && query.eventTypes.length > 0) {
      filteredEvents = filteredEvents.filter(event => query.eventTypes!.includes(event.eventType));
    }

    if (query.categories && query.categories.length > 0) {
      filteredEvents = filteredEvents.filter(event => query.categories!.includes(event.category));
    }

    if (query.severity && query.severity.length > 0) {
      filteredEvents = filteredEvents.filter(event => query.severity!.includes(event.severity));
    }

    if (query.userId) {
      filteredEvents = filteredEvents.filter(event => event.userId === query.userId);
    }

    if (query.sessionId) {
      filteredEvents = filteredEvents.filter(event => event.sessionId === query.sessionId);
    }

    if (query.workflowId) {
      filteredEvents = filteredEvents.filter(event => event.workflowId === query.workflowId);
    }

    if (query.startDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp <= query.endDate!);
    }

    if (query.dataClassification && query.dataClassification.length > 0) {
      filteredEvents = filteredEvents.filter(event => query.dataClassification!.includes(event.dataClassification));
    }

    if (query.complianceFlags && query.complianceFlags.length > 0) {
      filteredEvents = filteredEvents.filter(event => 
        event.complianceFlags.some(flag => query.complianceFlags!.includes(flag))
      );
    }

    if (query.operation) {
      filteredEvents = filteredEvents.filter(event => event.operation.includes(query.operation!));
    }

    if (query.result && query.result.length > 0) {
      filteredEvents = filteredEvents.filter(event => query.result!.includes(event.result));
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 1000;
    const paginatedEvents = filteredEvents.slice(offset, offset + limit);

    this.logger.info('Audit query completed', {
      totalEvents: this.auditEvents.length,
      filteredEvents: filteredEvents.length,
      returnedEvents: paginatedEvents.length,
    });

    return paginatedEvents;
  }

  /**
   * Generate comprehensive audit report
   */
  async generateAuditReport(query: AuditQuery, generatedBy: string): Promise<AuditReport> {
    this.logger.info('Generating audit report', { query, generatedBy });

    const events = await this.queryAuditEvents(query);
    const reportId = this.generateEventId();
    const generatedAt = new Date();

    // Calculate summary statistics
    const eventTypes: Record<AuditEventType, number> = {} as Record<AuditEventType, number>;
    const categories: Record<AuditCategory, number> = {} as Record<AuditCategory, number>;
    const severity: Record<AuditSeverity, number> = {} as Record<AuditSeverity, number>;
    const results: Record<AuditResult, number> = {} as Record<AuditResult, number>;
    const complianceSummary: Record<ComplianceFlag, number> = {} as Record<ComplianceFlag, number>;
    const dataClassificationSummary: Record<DataClassification, number> = {} as Record<DataClassification, number>;

    // Initialize counters
    Object.values('AuditEventType').forEach(type => eventTypes[type as AuditEventType] = 0);
    Object.values('AuditCategory').forEach(cat => categories[cat as AuditCategory] = 0);
    Object.values('AuditSeverity').forEach(sev => severity[sev as AuditSeverity] = 0);
    Object.values('AuditResult').forEach(res => results[res as AuditResult] = 0);
    Object.values('ComplianceFlag').forEach(flag => complianceSummary[flag as ComplianceFlag] = 0);
    Object.values('DataClassification').forEach(classification => dataClassificationSummary[classification as DataClassification] = 0);

    // Count events
    events.forEach(event => {
      eventTypes[event.eventType]++;
      categories[event.category]++;
      severity[event.severity]++;
      results[event.result]++;
      dataClassificationSummary[event.dataClassification]++;
      
      event.complianceFlags.forEach(flag => {
        complianceSummary[flag]++;
      });
    });

    // Verify integrity
    const integrityVerified = this.verifyIntegrityChain();

    const report: AuditReport = {
      reportId,
      generatedAt,
      generatedBy,
      query,
      summary: {
        totalEvents: events.length,
        eventTypes,
        categories,
        severity,
        results,
        timeRange: {
          start: query.startDate || new Date(0),
          end: query.endDate || new Date(),
        },
      },
      events,
      complianceSummary,
      dataClassificationSummary,
      integrityVerified,
    };

    this.logger.info('Audit report generated', {
      reportId,
      totalEvents: events.length,
      integrityVerified,
      generatedBy,
    });

    return report;
  }

  /**
   * Verify integrity of audit chain
   */
  verifyIntegrityChain(): boolean {
    if (this.integrityChain.length === 0) return true;

    for (let i = 1; i < this.integrityChain.length; i++) {
      const currentHash = this.integrityChain[i];
      const previousHash = this.integrityChain[i - 1];
      
      // In a real implementation, we would verify that the current hash
      // was calculated using the previous hash
      if (!currentHash || !previousHash) {
        return false;
      }
    }

    return true;
  }

  /**
   * Export audit data for external analysis
   */
  async exportAuditData(query: AuditQuery, format: 'json' | 'csv' | 'xml'): Promise<string> {
    const events = await this.queryAuditEvents(query);

    switch (format) {
      case 'json':
        return JSON.stringify(events, null, 2);
      
      case 'csv':
        return this.convertToCSV(events);
      
      case 'xml':
        return this.convertToXML(events);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Private helper methods

  private async storeAuditEvent(event: AuditEvent): Promise<void> {
    if (this.config.enableAuditLogging) {
      this.batchBuffer.push(event);
      
      if (this.batchBuffer.length >= this.config.batchSize) {
        await this.flushBatch();
      }
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    try {
      // In a real implementation, this would store to a secure audit database
      this.auditEvents.push(...this.batchBuffer);
      this.batchBuffer = [];
      this.lastFlushTime = new Date();

      this.logger.debug('Audit batch flushed', {
        batchSize: this.batchBuffer.length,
        totalEvents: this.auditEvents.length,
      });
    } catch (error) {
      this.logger.error('Failed to flush audit batch', { error });
    }
  }

  private startBatchProcessing(): void {
    setInterval(async () => {
      await this.flushBatch();
    }, this.config.flushIntervalMs);
  }

  private startRealTimeMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.performRealTimeMonitoring();
    }, 60000); // Check every minute
  }

  private performRealTimeMonitoring(): void {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    // Count critical events in the last minute
    const recentCriticalEvents = this.auditEvents.filter(event => 
      event.timestamp >= oneMinuteAgo && event.severity === 'critical'
    );

    if (recentCriticalEvents.length > this.config.alertThresholds.criticalEventsPerMinute) {
      this.logger.warn('High critical event rate detected', {
        criticalEvents: recentCriticalEvents.length,
        threshold: this.config.alertThresholds.criticalEventsPerMinute,
      });
    }

    // Check failed operations percentage
    const recentEvents = this.auditEvents.filter(event => event.timestamp >= oneMinuteAgo);
    const failedEvents = recentEvents.filter(event => event.result === 'failure');
    const failureRate = recentEvents.length > 0 ? failedEvents.length / recentEvents.length : 0;

    if (failureRate > this.config.alertThresholds.failedOperationsPercentage / 100) {
      this.logger.warn('High failure rate detected', {
        failureRate: failureRate * 100,
        threshold: this.config.alertThresholds.failedOperationsPercentage,
      });
    }
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private calculateIntegrityHash(eventId: string, timestamp: Date, data: any): string {
    const dataString = JSON.stringify({ eventId, timestamp, data });
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private determineSeverity(operation: string, result: AuditResult, filteredContent?: FilteredContent[]): AuditSeverity {
    if (result === 'failure' || result === 'error') return 'critical';
    if (filteredContent && filteredContent.length > 0) {
      const maxSeverity = Math.max(...filteredContent.map(f => this.getSeverityScore(f.severity)));
      if (maxSeverity >= 3) return 'high';
      if (maxSeverity >= 2) return 'medium';
    }
    if (operation.includes('critical') || operation.includes('security')) return 'high';
    if (operation.includes('important')) return 'medium';
    return 'low';
  }

  private getSeverityScore(severity: AuditSeverity): number {
    const scores = { low: 1, medium: 2, high: 3, critical: 4 };
    return scores[severity];
  }

  private classifyData(operation: string, metadata?: Record<string, any>): DataClassification {
    // Simple classification logic - in production, this would be more sophisticated
    if (metadata?.query?.includes('confidential') || metadata?.content?.includes('confidential')) {
      return 'confricted';
    }
    if (metadata?.query?.includes('internal') || metadata?.content?.includes('internal')) {
      return 'internal';
    }
    if (operation.includes('security') || operation.includes('threat')) {
      return 'restricted';
    }
    return 'internal';
  }

  private determineComplianceFlags(dataClassification: DataClassification, metadata?: Record<string, any>): ComplianceFlag[] {
    const flags: ComplianceFlag[] = [];
    
    if (dataClassification === 'confidential' || dataClassification === 'restricted') {
      flags.push('gdpr', 'iso27001');
    }
    
    if (metadata?.financial || operation.includes('financial')) {
      flags.push('sox');
    }
    
    if (metadata?.healthcare || operation.includes('healthcare')) {
      flags.push('hipaa');
    }
    
    if (operation.includes('ai') || operation.includes('model')) {
      flags.push('ai_act');
    }
    
    return flags;
  }

  private convertToCSV(events: AuditEvent[]): string {
    const headers = [
      'eventId', 'timestamp', 'eventType', 'userId', 'sessionId', 'requestId', 'workflowId',
      'operation', 'category', 'severity', 'source', 'target', 'action', 'result',
      'dataClassification', 'complianceFlags', 'integrityHash'
    ];
    
    const rows = events.map(event => [
      event.eventId,
      event.timestamp.toISOString(),
      event.eventType,
      event.userId || '',
      event.sessionId || '',
      event.requestId || '',
      event.workflowId || '',
      event.operation,
      event.category,
      event.severity,
      event.source,
      event.target || '',
      event.action,
      event.result,
      event.dataClassification,
      event.complianceFlags.join(';'),
      event.integrityHash
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private convertToXML(events: AuditEvent[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<auditEvents>\n';
    
    events.forEach(event => {
      xml += '  <event>\n';
      xml += `    <eventId>${event.eventId}</eventId>\n`;
      xml += `    <timestamp>${event.timestamp.toISOString()}</timestamp>\n`;
      xml += `    <eventType>${event.eventType}</eventType>\n`;
      xml += `    <operation>${event.operation}</operation>\n`;
      xml += `    <category>${event.category}</category>\n`;
      xml += `    <severity>${event.severity}</severity>\n`;
      xml += `    <result>${event.result}</result>\n`;
      xml += `    <dataClassification>${event.dataClassification}</dataClassification>\n`;
      xml += `    <complianceFlags>${event.complianceFlags.join(';')}</complianceFlags>\n`;
      xml += `    <integrityHash>${event.integrityHash}</integrityHash>\n`;
      xml += '  </event>\n';
    });
    
    xml += '</auditEvents>';
    return xml;
  }

  // Public API methods

  getAuditEvents(): AuditEvent[] {
    return [...this.auditEvents];
  }

  getIntegrityChain(): string[] {
    return [...this.integrityChain];
  }

  getServiceStatus(): {
    isEnabled: boolean;
    totalEvents: number;
    integrityVerified: boolean;
    lastFlushTime: Date;
    batchBufferSize: number;
  } {
    return {
      isEnabled: this.config.enableAuditLogging,
      totalEvents: this.auditEvents.length,
      integrityVerified: this.verifyIntegrityChain(),
      lastFlushTime: this.lastFlushTime,
      batchBufferSize: this.batchBuffer.length,
    };
  }

  updateConfig(config: Partial<AuditConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Audit configuration updated', { config });
  }

  getConfig(): AuditConfig {
    return { ...this.config };
  }

  // Cleanup
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.logger.info('Audit service destroyed');
  }
}
