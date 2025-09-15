/**
 * React Hook for Auditability
 * Provides easy access to audit logging and monitoring capabilities
 * 
 * This hook enables:
 * - Automatic audit logging for user actions
 * - AI operation audit trails
 * - Source retrieval tracking
 * - Guardrail action logging
 * - Audit query and reporting
 * - Real-time audit monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AuditService, 
  AuditEvent, 
  AuditQuery, 
  AuditReport,
  AuditConfig,
  RetrievedSource,
  FilteredContent,
  AuditCategory,
  AuditResult
} from '../lib/auditability/audit-service';

export interface UseAuditabilityReturn {
  // Service state
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Audit events
  auditEvents: AuditEvent[];
  recentEvents: AuditEvent[];
  
  // Service actions
  logAIOperation: (params: {
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
  }) => Promise<string>;
  
  logSourceRetrieval: (params: {
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
  }) => Promise<string>;
  
  logGuardrailAction: (params: {
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
  }) => Promise<string>;
  
  logUserAction: (params: {
    userId: string;
    sessionId?: string;
    requestId?: string;
    action: string;
    target?: string;
    category: AuditCategory;
    result: AuditResult;
    metadata?: Record<string, any>;
  }) => Promise<string>;
  
  // Query and reporting
  queryAuditEvents: (query: AuditQuery) => Promise<AuditEvent[]>;
  generateAuditReport: (query: AuditQuery, generatedBy: string) => Promise<AuditReport>;
  exportAuditData: (query: AuditQuery, format: 'json' | 'csv' | 'xml') => Promise<string>;
  
  // Service management
  getServiceStatus: () => any;
  updateConfig: (config: Partial<AuditConfig>) => void;
  getConfig: () => AuditConfig;
}

export const useAuditability = (initialConfig?: Partial<AuditConfig>): UseAuditabilityReturn => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  
  const auditServiceRef = useRef<AuditService | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audit service
  useEffect(() => {
    const initializeService = async () => {
      try {
        // Default configuration
        const defaultConfig: AuditConfig = {
          enableAuditLogging: true,
          enableIntegrityVerification: true,
          enableRealTimeMonitoring: true,
          enableComplianceReporting: true,
          retentionPeriodDays: 2555, // 7 years
          encryptionEnabled: true,
          compressionEnabled: true,
          batchSize: 50, // Smaller batch size for frontend
          flushIntervalMs: 3000,
          alertThresholds: {
            criticalEventsPerMinute: 5,
            failedOperationsPercentage: 3,
            suspiciousActivityScore: 0.7,
          },
          complianceRequirements: ['gdpr', 'sox', 'iso27001'],
          dataClassificationRules: {
            'user_data': 'confidential',
            'security_data': 'restricted',
            'public_data': 'public',
            'internal_data': 'internal',
          },
        };

        const config = { ...defaultConfig, ...initialConfig };
        
        auditServiceRef.current = new AuditService(config);
        setIsEnabled(true);
        
        // Start periodic updates for recent events
        intervalRef.current = setInterval(() => {
          if (auditServiceRef.current) {
            const events = auditServiceRef.current.getAuditEvents();
            setAuditEvents(events);
            
            // Get recent events (last 24 hours)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recent = events.filter(event => event.timestamp >= oneDayAgo);
            setRecentEvents(recent);
          }
        }, 5000); // Update every 5 seconds
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize audit service');
        setIsEnabled(false);
      }
    };

    initializeService();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (auditServiceRef.current) {
        auditServiceRef.current.destroy();
      }
    };
  }, [initialConfig]);

  // Log AI operation
  const logAIOperation = useCallback(async (params: {
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
  }): Promise<string> => {
    if (!auditServiceRef.current) {
      throw new Error('Audit service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const eventId = await auditServiceRef.current.logAIOperation(params);
      
      // Update events
      const events = auditServiceRef.current.getAuditEvents();
      setAuditEvents(events);
      
      return eventId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log AI operation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Log source retrieval
  const logSourceRetrieval = useCallback(async (params: {
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
  }): Promise<string> => {
    if (!auditServiceRef.current) {
      throw new Error('Audit service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const eventId = await auditServiceRef.current.logSourceRetrieval(params);
      
      // Update events
      const events = auditServiceRef.current.getAuditEvents();
      setAuditEvents(events);
      
      return eventId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log source retrieval';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Log guardrail action
  const logGuardrailAction = useCallback(async (params: {
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
  }): Promise<string> => {
    if (!auditServiceRef.current) {
      throw new Error('Audit service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const eventId = await auditServiceRef.current.logGuardrailAction(params);
      
      // Update events
      const events = auditServiceRef.current.getAuditEvents();
      setAuditEvents(events);
      
      return eventId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log guardrail action';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Log user action
  const logUserAction = useCallback(async (params: {
    userId: string;
    sessionId?: string;
    requestId?: string;
    action: string;
    target?: string;
    category: AuditCategory;
    result: AuditResult;
    metadata?: Record<string, any>;
  }): Promise<string> => {
    if (!auditServiceRef.current) {
      throw new Error('Audit service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const eventId = await auditServiceRef.current.logUserAction(params);
      
      // Update events
      const events = auditServiceRef.current.getAuditEvents();
      setAuditEvents(events);
      
      return eventId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log user action';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Query audit events
  const queryAuditEvents = useCallback(async (query: AuditQuery): Promise<AuditEvent[]> => {
    if (!auditServiceRef.current) {
      throw new Error('Audit service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const events = await auditServiceRef.current.queryAuditEvents(query);
      return events;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to query audit events';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate audit report
  const generateAuditReport = useCallback(async (query: AuditQuery, generatedBy: string): Promise<AuditReport> => {
    if (!auditServiceRef.current) {
      throw new Error('Audit service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const report = await auditServiceRef.current.generateAuditReport(query, generatedBy);
      return report;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate audit report';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Export audit data
  const exportAuditData = useCallback(async (query: AuditQuery, format: 'json' | 'csv' | 'xml'): Promise<string> => {
    if (!auditServiceRef.current) {
      throw new Error('Audit service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await auditServiceRef.current.exportAuditData(query, format);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export audit data';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get service status
  const getServiceStatus = useCallback(() => {
    if (!auditServiceRef.current) {
      return null;
    }

    return auditServiceRef.current.getServiceStatus();
  }, []);

  // Update configuration
  const updateConfig = useCallback((config: Partial<AuditConfig>) => {
    if (!auditServiceRef.current) {
      setError('Audit service not initialized');
      return;
    }

    try {
      auditServiceRef.current.updateConfig(config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration';
      setError(errorMessage);
    }
  }, []);

  // Get configuration
  const getConfig = useCallback(() => {
    if (!auditServiceRef.current) {
      return null;
    }

    return auditServiceRef.current.getConfig();
  }, []);

  return {
    // Service state
    isEnabled,
    isLoading,
    error,
    
    // Audit events
    auditEvents,
    recentEvents,
    
    // Service actions
    logAIOperation,
    logSourceRetrieval,
    logGuardrailAction,
    logUserAction,
    
    // Query and reporting
    queryAuditEvents,
    generateAuditReport,
    exportAuditData,
    
    // Service management
    getServiceStatus,
    updateConfig,
    getConfig,
  };
};
