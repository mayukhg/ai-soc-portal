/**
 * LLM Logging Hook
 * React hook for LLM operations logging and monitoring
 * 
 * Provides:
 * - Request/response logging
 * - Performance metrics tracking
 * - Cost monitoring
 * - Quality assessment
 * - Real-time alerts and notifications
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { LLMOperationsLogger, LLMRequestData, LLMResponseData, LLMOperationMetrics, LLMQualityAssessment, LLMLoggingConfig } from '@/lib/logging/llm-operations-logger';
import { useToast } from '@/hooks/use-toast';

export interface UseLLMLoggingOptions {
  config?: Partial<LLMLoggingConfig>;
  enableRealTimeMonitoring?: boolean;
  enableAlerts?: boolean;
  autoCleanup?: boolean;
}

export interface UseLLMLoggingReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  metrics: LLMOperationMetrics | null;
  alerts: Array<{
    id: string;
    type: 'latency' | 'cost' | 'quality' | 'error';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    resolved: boolean;
  }>;

  // Logging operations
  logRequest: (requestData: Omit<LLMRequestData, 'requestId' | 'timestamp' | 'startTime'>) => Promise<string>;
  logResponse: (requestId: string, responseData: Omit<LLMResponseData, 'requestId' | 'responseId' | 'timestamp' | 'endTime' | 'totalLatency' | 'processingTime'>) => Promise<string>;
  
  // Metrics and analytics
  getMetrics: (timeRange?: { start: Date; end: Date }) => LLMOperationMetrics | null;
  getCostBreakdown: (timeRange?: { start: Date; end: Date }) => {
    totalCost: number;
    costByModel: Record<string, number>;
    costByAgent: Record<string, number>;
    costByDay: Record<string, number>;
    averageCostPerRequest: number;
    currency: string;
  } | null;
  
  // Quality assessment
  getQualityAssessment: (responseId: string) => Promise<LLMQualityAssessment | null>;
  
  // Data export
  exportLogs: (timeRange?: { start: Date; end: Date }, format?: 'json' | 'csv') => string | null;
  
  // Utility operations
  clearAlerts: () => void;
  resolveAlert: (alertId: string) => void;
  cleanupOldLogs: () => void;
  getConfig: () => LLMLoggingConfig | null;
}

export const useLLMLogging = (options: UseLLMLoggingOptions = {}): UseLLMLoggingReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<LLMOperationMetrics | null>(null);
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'latency' | 'cost' | 'quality' | 'error';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    resolved: boolean;
  }>>([]);

  const llmLoggerRef = useRef<LLMOperationsLogger | null>(null);
  const { toast } = useToast();

  // Default configuration
  const defaultConfig: LLMLoggingConfig = {
    enableDetailedLogging: true,
    enableCostTracking: true,
    enableQualityAssessment: true,
    enablePerformanceMetrics: true,
    enableSecurityMonitoring: true,
    logRetentionDays: 30,
    samplingRate: 1.0,
    sensitiveDataMasking: true,
    complianceMode: 'none',
    alertThresholds: {
      highLatency: 5000, // 5 seconds
      highCost: 1.0, // $1.00
      lowQuality: 0.7, // 70%
      highErrorRate: 10, // 10%
    },
  };

  // Initialize LLM logger
  useEffect(() => {
    const initializeLogger = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const config = { ...defaultConfig, ...options.config };
        
        llmLoggerRef.current = new LLMOperationsLogger(config);
        
        // Load initial metrics
        const initialMetrics = llmLoggerRef.current.getMetrics();
        setMetrics(initialMetrics);

        setIsInitialized(true);
        
        toast({
          title: "LLM Logging Initialized",
          description: "Comprehensive LLM operations logging is now active",
        });

        // Set up auto cleanup if enabled
        if (options.autoCleanup) {
          const cleanupInterval = setInterval(() => {
            llmLoggerRef.current?.cleanupOldLogs();
          }, 24 * 60 * 60 * 1000); // Daily cleanup

          return () => clearInterval(cleanupInterval);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize LLM logging';
        setError(errorMessage);
        setIsInitialized(false);
        
        toast({
          title: "LLM Logging Initialization Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeLogger();
  }, [options.config, options.autoCleanup]);

  // Log request
  const logRequest = useCallback(async (
    requestData: Omit<LLMRequestData, 'requestId' | 'timestamp' | 'startTime'>
  ): Promise<string> => {
    if (!llmLoggerRef.current) {
      throw new Error('LLM logger not initialized');
    }

    try {
      const requestId = await llmLoggerRef.current.logRequest(requestData);
      
      toast({
        title: "Request Logged",
        description: `LLM request logged with ID: ${requestId}`,
      });

      return requestId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log request';
      setError(errorMessage);
      
      toast({
        title: "Request Logging Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, []);

  // Log response
  const logResponse = useCallback(async (
    requestId: string,
    responseData: Omit<LLMResponseData, 'requestId' | 'responseId' | 'timestamp' | 'endTime' | 'totalLatency' | 'processingTime'>
  ): Promise<string> => {
    if (!llmLoggerRef.current) {
      throw new Error('LLM logger not initialized');
    }

    try {
      const responseId = await llmLoggerRef.current.logResponse(requestId, responseData);
      
      // Update metrics
      const updatedMetrics = llmLoggerRef.current.getMetrics();
      setMetrics(updatedMetrics);

      // Check for alerts
      if (options.enableAlerts) {
        checkForAlerts(responseData);
      }

      toast({
        title: "Response Logged",
        description: `LLM response logged with ID: ${responseId}`,
      });

      return responseId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log response';
      setError(errorMessage);
      
      toast({
        title: "Response Logging Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [options.enableAlerts]);

  // Get metrics
  const getMetrics = useCallback((timeRange?: { start: Date; end: Date }): LLMOperationMetrics | null => {
    if (!llmLoggerRef.current) {
      return null;
    }

    try {
      const metrics = llmLoggerRef.current.getMetrics(timeRange);
      setMetrics(metrics);
      return metrics;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get metrics';
      setError(errorMessage);
      return null;
    }
  }, []);

  // Get cost breakdown
  const getCostBreakdown = useCallback((timeRange?: { start: Date; end: Date }) => {
    if (!llmLoggerRef.current) {
      return null;
    }

    try {
      return llmLoggerRef.current.getCostBreakdown(timeRange);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get cost breakdown';
      setError(errorMessage);
      return null;
    }
  }, []);

  // Get quality assessment
  const getQualityAssessment = useCallback(async (responseId: string): Promise<LLMQualityAssessment | null> => {
    if (!llmLoggerRef.current) {
      return null;
    }

    try {
      return await llmLoggerRef.current.getQualityAssessment(responseId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get quality assessment';
      setError(errorMessage);
      return null;
    }
  }, []);

  // Export logs
  const exportLogs = useCallback((timeRange?: { start: Date; end: Date }, format: 'json' | 'csv' = 'json'): string | null => {
    if (!llmLoggerRef.current) {
      return null;
    }

    try {
      const exportedData = llmLoggerRef.current.exportLogs(timeRange, format);
      
      toast({
        title: "Logs Exported",
        description: `Exported ${format.toUpperCase()} logs successfully`,
      });

      return exportedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export logs';
      setError(errorMessage);
      
      toast({
        title: "Export Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    }
  }, []);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
    toast({
      title: "Alerts Cleared",
      description: "All alerts have been cleared",
    });
  }, []);

  // Resolve alert
  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
    
    toast({
      title: "Alert Resolved",
      description: `Alert ${alertId} has been resolved`,
    });
  }, []);

  // Cleanup old logs
  const cleanupOldLogs = useCallback(() => {
    if (!llmLoggerRef.current) {
      return;
    }

    try {
      llmLoggerRef.current.cleanupOldLogs();
      
      toast({
        title: "Logs Cleaned Up",
        description: "Old logs have been cleaned up successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cleanup logs';
      setError(errorMessage);
      
      toast({
        title: "Cleanup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, []);

  // Get configuration
  const getConfig = useCallback((): LLMLoggingConfig | null => {
    return llmLoggerRef.current ? defaultConfig : null;
  }, []);

  // Check for alerts
  const checkForAlerts = (responseData: any) => {
    const newAlerts: Array<{
      id: string;
      type: 'latency' | 'cost' | 'quality' | 'error';
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      timestamp: string;
      resolved: boolean;
    }> = [];

    // High latency alert
    if (responseData.totalLatency > defaultConfig.alertThresholds.highLatency) {
      newAlerts.push({
        id: `latency_${Date.now()}`,
        type: 'latency',
        message: `High latency detected: ${responseData.totalLatency}ms`,
        severity: responseData.totalLatency > 10000 ? 'critical' : 'high',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    // High cost alert
    if (responseData.totalCost > defaultConfig.alertThresholds.highCost) {
      newAlerts.push({
        id: `cost_${Date.now()}`,
        type: 'cost',
        message: `High cost detected: $${responseData.totalCost.toFixed(4)}`,
        severity: responseData.totalCost > 5.0 ? 'critical' : 'high',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    // Low quality alert
    if ((responseData.confidence || 0) < defaultConfig.alertThresholds.lowQuality) {
      newAlerts.push({
        id: `quality_${Date.now()}`,
        type: 'quality',
        message: `Low quality detected: ${(responseData.confidence * 100).toFixed(1)}%`,
        severity: responseData.confidence < 0.5 ? 'critical' : 'medium',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    // Error alert
    if (responseData.error) {
      newAlerts.push({
        id: `error_${Date.now()}`,
        type: 'error',
        message: `Error detected: ${responseData.error}`,
        severity: 'high',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts]);
      
      // Show toast for critical alerts
      const criticalAlerts = newAlerts.filter(alert => alert.severity === 'critical');
      if (criticalAlerts.length > 0) {
        toast({
          title: "Critical Alert",
          description: criticalAlerts[0].message,
          variant: "destructive",
        });
      }
    }
  };

  return {
    // State
    isInitialized,
    isLoading,
    error,
    metrics,
    alerts,

    // Logging operations
    logRequest,
    logResponse,

    // Metrics and analytics
    getMetrics,
    getCostBreakdown,

    // Quality assessment
    getQualityAssessment,

    // Data export
    exportLogs,

    // Utility operations
    clearAlerts,
    resolveAlert,
    cleanupOldLogs,
    getConfig,
  };
};
