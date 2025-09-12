/**
 * Error Recovery Engine
 * Comprehensive error handling and recovery mechanisms for data ingestion
 */

import { Logger } from '../utils/logger';

export interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  maxRetryDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
  deadLetterQueue: boolean;
  fallbackStrategies: string[];
}

export interface ErrorContext {
  source: string;
  operation: string;
  timestamp: Date;
  error: Error;
  retryCount: number;
  metadata: Record<string, any>;
}

export interface RecoveryResult {
  success: boolean;
  recoveredData?: any[];
  error?: Error;
  recoveryStrategy: string;
  retryCount: number;
  processingTime: number;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date | null;
  nextAttemptTime: Date | null;
}

export class ErrorRecoveryEngine {
  private logger: Logger;
  private config: ErrorRecoveryConfig;
  private circuitBreakers: Map<string, CircuitBreakerState>;
  private deadLetterQueue: Map<string, ErrorContext[]>;
  private retryQueues: Map<string, ErrorContext[]>;

  constructor(config?: Partial<ErrorRecoveryConfig>) {
    this.logger = new Logger('ErrorRecoveryEngine');
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      maxRetryDelayMs: 30000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeoutMs: 60000,
      deadLetterQueue: true,
      fallbackStrategies: ['retry', 'skip', 'partial', 'cached'],
    };
    this.circuitBreakers = new Map();
    this.deadLetterQueue = new Map();
    this.retryQueues = new Map();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async handleError(
    error: Error,
    context: Omit<ErrorContext, 'error' | 'retryCount'>,
    operation: () => Promise<any>
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const errorContext: ErrorContext = {
      ...context,
      error,
      retryCount: 0,
    };

    try {
      this.logger.error(`Handling error for ${context.source}`, {
        operation: context.operation,
        error: error.message,
        metadata: context.metadata,
      });

      // Check circuit breaker
      if (this.isCircuitBreakerOpen(context.source)) {
        return await this.handleCircuitBreakerOpen(errorContext, operation);
      }

      // Try recovery strategies
      const recoveryResult = await this.executeRecoveryStrategies(errorContext, operation);
      
      if (recoveryResult.success) {
        this.resetCircuitBreaker(context.source);
        this.logger.info(`Error recovery successful for ${context.source}`, {
          strategy: recoveryResult.recoveryStrategy,
          retryCount: recoveryResult.retryCount,
        });
      } else {
        await this.handleRecoveryFailure(errorContext, recoveryResult.error);
      }

      return {
        ...recoveryResult,
        processingTime: Date.now() - startTime,
      };

    } catch (recoveryError) {
      this.logger.error(`Error recovery failed for ${context.source}`, {
        originalError: error.message,
        recoveryError: recoveryError.message,
      });

      await this.handleRecoveryFailure(errorContext, recoveryError);
      
      return {
        success: false,
        error: recoveryError,
        recoveryStrategy: 'failed',
        retryCount: errorContext.retryCount,
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async executeRecoveryStrategies(
    errorContext: ErrorContext,
    operation: () => Promise<any>
  ): Promise<RecoveryResult> {
    for (const strategy of this.config.fallbackStrategies) {
      try {
        const result = await this.executeRecoveryStrategy(strategy, errorContext, operation);
        if (result.success) {
          return result;
        }
      } catch (strategyError) {
        this.logger.warn(`Recovery strategy ${strategy} failed`, {
          source: errorContext.source,
          error: strategyError.message,
        });
      }
    }

    throw new Error('All recovery strategies failed');
  }

  private async executeRecoveryStrategy(
    strategy: string,
    errorContext: ErrorContext,
    operation: () => Promise<any>
  ): Promise<RecoveryResult> {
    switch (strategy) {
      case 'retry':
        return await this.retryStrategy(errorContext, operation);
      case 'skip':
        return await this.skipStrategy(errorContext);
      case 'partial':
        return await this.partialStrategy(errorContext, operation);
      case 'cached':
        return await this.cachedStrategy(errorContext);
      default:
        throw new Error(`Unknown recovery strategy: ${strategy}`);
    }
  }

  private async retryStrategy(
    errorContext: ErrorContext,
    operation: () => Promise<any>
  ): Promise<RecoveryResult> {
    if (errorContext.retryCount >= this.config.maxRetries) {
      throw new Error('Maximum retries exceeded');
    }

    const delay = this.calculateRetryDelay(errorContext.retryCount);
    await this.delay(delay);

    errorContext.retryCount++;
    this.updateCircuitBreaker(errorContext.source, false);

    try {
      const result = await operation();
      return {
        success: true,
        recoveredData: result,
        recoveryStrategy: 'retry',
        retryCount: errorContext.retryCount,
        processingTime: 0,
      };
    } catch (retryError) {
      this.updateCircuitBreaker(errorContext.source, true);
      throw retryError;
    }
  }

  private async skipStrategy(errorContext: ErrorContext): Promise<RecoveryResult> {
    this.logger.warn(`Skipping operation for ${errorContext.source}`, {
      operation: errorContext.operation,
      reason: 'skip_strategy',
    });

    return {
      success: true,
      recoveredData: [],
      recoveryStrategy: 'skip',
      retryCount: errorContext.retryCount,
      processingTime: 0,
    };
  }

  private async partialStrategy(
    errorContext: ErrorContext,
    operation: () => Promise<any>
  ): Promise<RecoveryResult> {
    try {
      // Try to get partial data
      const partialData = await this.getPartialData(errorContext);
      
      if (partialData && partialData.length > 0) {
        this.logger.info(`Recovered partial data for ${errorContext.source}`, {
          recordCount: partialData.length,
        });

        return {
          success: true,
          recoveredData: partialData,
          recoveryStrategy: 'partial',
          retryCount: errorContext.retryCount,
          processingTime: 0,
        };
      }
    } catch (partialError) {
      this.logger.warn(`Partial recovery failed for ${errorContext.source}`, {
        error: partialError.message,
      });
    }

    throw new Error('Partial recovery failed');
  }

  private async cachedStrategy(errorContext: ErrorContext): Promise<RecoveryResult> {
    try {
      const cachedData = await this.getCachedData(errorContext);
      
      if (cachedData && cachedData.length > 0) {
        this.logger.info(`Using cached data for ${errorContext.source}`, {
          recordCount: cachedData.length,
        });

        return {
          success: true,
          recoveredData: cachedData,
          recoveryStrategy: 'cached',
          retryCount: errorContext.retryCount,
          processingTime: 0,
        };
      }
    } catch (cacheError) {
      this.logger.warn(`Cache recovery failed for ${errorContext.source}`, {
        error: cacheError.message,
      });
    }

    throw new Error('Cache recovery failed');
  }

  private async handleCircuitBreakerOpen(
    errorContext: ErrorContext,
    operation: () => Promise<any>
  ): Promise<RecoveryResult> {
    const circuitBreaker = this.circuitBreakers.get(errorContext.source)!;
    
    if (circuitBreaker.nextAttemptTime && new Date() < circuitBreaker.nextAttemptTime) {
      this.logger.warn(`Circuit breaker open for ${errorContext.source}`, {
        nextAttemptTime: circuitBreaker.nextAttemptTime,
      });

      return {
        success: false,
        error: new Error('Circuit breaker is open'),
        recoveryStrategy: 'circuit_breaker',
        retryCount: errorContext.retryCount,
        processingTime: 0,
      };
    }

    // Try to close circuit breaker
    try {
      const result = await operation();
      this.resetCircuitBreaker(errorContext.source);
      
      return {
        success: true,
        recoveredData: result,
        recoveryStrategy: 'circuit_breaker_reset',
        retryCount: errorContext.retryCount,
        processingTime: 0,
      };
    } catch (error) {
      this.updateCircuitBreaker(errorContext.source, true);
      throw error;
    }
  }

  private async handleRecoveryFailure(
    errorContext: ErrorContext,
    error: Error
  ): Promise<void> {
    this.updateCircuitBreaker(errorContext.source, true);
    
    if (this.config.deadLetterQueue) {
      await this.addToDeadLetterQueue(errorContext);
    }

    this.logger.error(`Recovery failed for ${errorContext.source}`, {
      operation: errorContext.operation,
      error: error.message,
      retryCount: errorContext.retryCount,
    });
  }

  private calculateRetryDelay(retryCount: number): number {
    if (!this.config.exponentialBackoff) {
      return this.config.retryDelayMs;
    }

    const delay = this.config.retryDelayMs * Math.pow(2, retryCount);
    return Math.min(delay, this.config.maxRetryDelayMs);
  }

  private updateCircuitBreaker(source: string, isFailure: boolean): void {
    let circuitBreaker = this.circuitBreakers.get(source);
    
    if (!circuitBreaker) {
      circuitBreaker = {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: null,
        nextAttemptTime: null,
      };
      this.circuitBreakers.set(source, circuitBreaker);
    }

    if (isFailure) {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = new Date();
      
      if (circuitBreaker.failureCount >= this.config.circuitBreakerThreshold) {
        circuitBreaker.isOpen = true;
        circuitBreaker.nextAttemptTime = new Date(
          Date.now() + this.config.circuitBreakerTimeoutMs
        );
        
        this.logger.warn(`Circuit breaker opened for ${source}`, {
          failureCount: circuitBreaker.failureCount,
          nextAttemptTime: circuitBreaker.nextAttemptTime,
        });
      }
    } else {
      circuitBreaker.failureCount = Math.max(0, circuitBreaker.failureCount - 1);
    }
  }

  private resetCircuitBreaker(source: string): void {
    const circuitBreaker = this.circuitBreakers.get(source);
    if (circuitBreaker) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failureCount = 0;
      circuitBreaker.lastFailureTime = null;
      circuitBreaker.nextAttemptTime = null;
      
      this.logger.info(`Circuit breaker reset for ${source}`);
    }
  }

  private isCircuitBreakerOpen(source: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(source);
    return circuitBreaker?.isOpen || false;
  }

  private async getPartialData(errorContext: ErrorContext): Promise<any[]> {
    // This would implement partial data recovery logic
    // For example, getting data from a backup source or partial results
    
    switch (errorContext.source) {
      case 'siem':
        return await this.getPartialSIEMData(errorContext);
      case 'soar':
        return await this.getPartialSOARData(errorContext);
      case 'edr':
        return await this.getPartialEDRData(errorContext);
      default:
        return [];
    }
  }

  private async getPartialSIEMData(errorContext: ErrorContext): Promise<any[]> {
    // Implement partial SIEM data recovery
    this.logger.info('Attempting partial SIEM data recovery');
    return [];
  }

  private async getPartialSOARData(errorContext: ErrorContext): Promise<any[]> {
    // Implement partial SOAR data recovery
    this.logger.info('Attempting partial SOAR data recovery');
    return [];
  }

  private async getPartialEDRData(errorContext: ErrorContext): Promise<any[]> {
    // Implement partial EDR data recovery
    this.logger.info('Attempting partial EDR data recovery');
    return [];
  }

  private async getCachedData(errorContext: ErrorContext): Promise<any[]> {
    // This would implement cached data retrieval logic
    // For example, getting data from Redis cache or local storage
    
    this.logger.info(`Attempting cached data recovery for ${errorContext.source}`);
    return [];
  }

  private async addToDeadLetterQueue(errorContext: ErrorContext): Promise<void> {
    if (!this.deadLetterQueue.has(errorContext.source)) {
      this.deadLetterQueue.set(errorContext.source, []);
    }
    
    this.deadLetterQueue.get(errorContext.source)!.push(errorContext);
    
    this.logger.warn(`Added error to dead letter queue for ${errorContext.source}`, {
      queueSize: this.deadLetterQueue.get(errorContext.source)!.length,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Dead letter queue management
  async processDeadLetterQueue(source: string): Promise<void> {
    const queue = this.deadLetterQueue.get(source);
    if (!queue || queue.length === 0) return;

    this.logger.info(`Processing dead letter queue for ${source}`, {
      queueSize: queue.length,
    });

    // Process items in the dead letter queue
    for (const errorContext of queue) {
      try {
        // Attempt to reprocess the failed operation
        await this.reprocessFailedOperation(errorContext);
      } catch (reprocessError) {
        this.logger.error(`Failed to reprocess dead letter item for ${source}`, {
          error: reprocessError.message,
        });
      }
    }

    // Clear the queue after processing
    this.deadLetterQueue.set(source, []);
  }

  private async reprocessFailedOperation(errorContext: ErrorContext): Promise<void> {
    // This would implement the logic to reprocess failed operations
    this.logger.info(`Reprocessing failed operation for ${errorContext.source}`, {
      operation: errorContext.operation,
    });
  }

  // Statistics and monitoring
  getErrorStatistics(): any {
    const stats: any = {
      circuitBreakers: {},
      deadLetterQueues: {},
      retryQueues: {},
    };

    for (const [source, circuitBreaker] of this.circuitBreakers) {
      stats.circuitBreakers[source] = {
        isOpen: circuitBreaker.isOpen,
        failureCount: circuitBreaker.failureCount,
        lastFailureTime: circuitBreaker.lastFailureTime,
        nextAttemptTime: circuitBreaker.nextAttemptTime,
      };
    }

    for (const [source, queue] of this.deadLetterQueue) {
      stats.deadLetterQueues[source] = {
        size: queue.length,
        oldestItem: queue.length > 0 ? queue[0].timestamp : null,
      };
    }

    for (const [source, queue] of this.retryQueues) {
      stats.retryQueues[source] = {
        size: queue.length,
      };
    }

    return stats;
  }

  // Configuration management
  updateConfig(config: Partial<ErrorRecoveryConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Error recovery configuration updated', { config });
  }

  getConfig(): ErrorRecoveryConfig {
    return { ...this.config };
  }

  // Cleanup methods
  clearDeadLetterQueue(source?: string): void {
    if (source) {
      this.deadLetterQueue.delete(source);
      this.logger.info(`Cleared dead letter queue for ${source}`);
    } else {
      this.deadLetterQueue.clear();
      this.logger.info('Cleared all dead letter queues');
    }
  }

  clearRetryQueues(source?: string): void {
    if (source) {
      this.retryQueues.delete(source);
      this.logger.info(`Cleared retry queue for ${source}`);
    } else {
      this.retryQueues.clear();
      this.logger.info('Cleared all retry queues');
    }
  }

  resetCircuitBreakers(): void {
    this.circuitBreakers.clear();
    this.logger.info('Reset all circuit breakers');
  }
}
