/**
 * Agent Logging Wrapper
 * Wrapper service to add comprehensive logging to existing LangChain agents
 * 
 * Features:
 * - Automatic request/response logging
 * - Performance metrics tracking
 * - Cost estimation
 * - Quality assessment
 * - Error tracking and monitoring
 */

import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage } from '@langchain/core/messages';
import { LLMOperationsLogger, LLMRequestData, LLMResponseData } from './llm-operations-logger';
import { Logger } from '../data-ingestion/utils/logger';

export interface AgentLoggingConfig {
  enableLogging: boolean;
  enableCostTracking: boolean;
  enableQualityAssessment: boolean;
  enablePerformanceMetrics: boolean;
  samplingRate: number; // 0.0 to 1.0
  logRetentionDays: number;
}

export class AgentLoggingWrapper {
  private llmOperationsLogger: LLMOperationsLogger;
  private logger: Logger;
  private config: AgentLoggingConfig;

  constructor(llmOperationsLogger: LLMOperationsLogger, config: AgentLoggingConfig) {
    this.llmOperationsLogger = llmOperationsLogger;
    this.logger = new Logger('AgentLoggingWrapper');
    this.config = config;
  }

  /**
   * Wrap LLM invoke method with comprehensive logging
   */
  async wrapLLMInvoke(
    llm: ChatOpenAI,
    messages: BaseMessage[],
    options: {
      agentType: string;
      workflowPhase: string;
      requestType: string;
      sessionId?: string;
      userId?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      tags?: string[];
      customAttributes?: Record<string, any>;
    }
  ): Promise<any> {
    if (!this.config.enableLogging) {
      return await llm.invoke(messages);
    }

    // Apply sampling
    if (Math.random() > this.config.samplingRate) {
      return await llm.invoke(messages);
    }

    const startTime = Date.now();
    let requestId: string;
    let responseId: string;

    try {
      // Prepare request data
      const prompt = this.messagesToString(messages);
      const requestData: Omit<LLMRequestData, 'requestId' | 'timestamp' | 'startTime'> = {
        sessionId: options.sessionId || 'unknown',
        userId: options.userId,
        modelName: llm.modelName || 'unknown',
        modelVersion: 'latest',
        temperature: llm.temperature || 0.1,
        maxTokens: llm.maxTokens || 1000,
        topP: llm.topP || 1.0,
        frequencyPenalty: llm.frequencyPenalty || 0.0,
        presencePenalty: llm.presencePenalty || 0.0,
        prompt,
        promptTokens: this.estimateTokens(prompt),
        promptLength: prompt.length,
        promptHash: this.generateHash(prompt),
        agentType: options.agentType,
        workflowPhase: options.workflowPhase,
        requestType: options.requestType,
        severity: options.severity || 'medium',
        tags: options.tags || [],
        customAttributes: options.customAttributes || {},
        containsPII: this.detectPII(prompt),
        dataClassification: this.classifyData(options.severity || 'medium'),
        complianceFlags: this.getComplianceFlags(prompt, options),
      };

      // Log request
      requestId = await this.llmOperationsLogger.logRequest(requestData);

      this.logger.info('LLM Request logged', {
        requestId,
        agentType: options.agentType,
        workflowPhase: options.workflowPhase,
        modelName: llm.modelName,
        promptTokens: requestData.promptTokens,
      });

      // Invoke LLM
      const response = await llm.invoke(messages);
      const endTime = Date.now();
      const totalLatency = endTime - startTime;

      // Prepare response data
      const responseContent = this.extractResponseContent(response);
      const responseData: Omit<LLMResponseData, 'requestId' | 'responseId' | 'timestamp' | 'endTime' | 'totalLatency' | 'processingTime'> = {
        content: responseContent,
        responseTokens: this.estimateTokens(responseContent),
        responseLength: responseContent.length,
        responseHash: this.generateHash(responseContent),
        modelName: llm.modelName || 'unknown',
        finishReason: this.extractFinishReason(response),
      };

      // Log response
      responseId = await this.llmOperationsLogger.logResponse(requestId, responseData);

      this.logger.info('LLM Response logged', {
        requestId,
        responseId,
        agentType: options.agentType,
        workflowPhase: options.workflowPhase,
        totalLatency,
        responseTokens: responseData.responseTokens,
        finishReason: responseData.finishReason,
      });

      return response;

    } catch (error) {
      const endTime = Date.now();
      const totalLatency = endTime - startTime;

      this.logger.error('LLM Operation failed', {
        requestId: requestId || 'unknown',
        agentType: options.agentType,
        workflowPhase: options.workflowPhase,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalLatency,
      });

      // Log error response if we have a request ID
      if (requestId) {
        try {
          await this.llmOperationsLogger.logResponse(requestId, {
            content: '',
            responseTokens: 0,
            responseLength: 0,
            responseHash: '',
            modelName: llm.modelName || 'unknown',
            finishReason: 'stop',
            error: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'LLM_INVOKE_ERROR',
            retryCount: 0,
          });
        } catch (logError) {
          this.logger.error('Failed to log error response', {
            originalError: error instanceof Error ? error.message : 'Unknown error',
            logError: logError instanceof Error ? logError.message : 'Unknown log error',
          });
        }
      }

      throw error;
    }
  }

  /**
   * Wrap prompt template format with logging
   */
  async wrapPromptFormat(
    promptTemplate: any,
    values: Record<string, any>,
    options: {
      agentType: string;
      workflowPhase: string;
      requestType: string;
      sessionId?: string;
      userId?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      tags?: string[];
      customAttributes?: Record<string, any>;
    }
  ): Promise<string> {
    const startTime = Date.now();

    try {
      const formattedPrompt = await promptTemplate.format(values);
      const endTime = Date.now();
      const formatDuration = endTime - startTime;

      this.logger.info('Prompt formatted', {
        agentType: options.agentType,
        workflowPhase: options.workflowPhase,
        formatDuration,
        promptLength: formattedPrompt.length,
        valuesCount: Object.keys(values).length,
      });

      return formattedPrompt;

    } catch (error) {
      this.logger.error('Prompt formatting failed', {
        agentType: options.agentType,
        workflowPhase: options.workflowPhase,
        error: error instanceof Error ? error.message : 'Unknown error',
        valuesCount: Object.keys(values).length,
      });

      throw error;
    }
  }

  /**
   * Create a logged version of an agent method
   */
  createLoggedAgentMethod<T extends any[], R>(
    originalMethod: (...args: T) => Promise<R>,
    agentType: string,
    methodName: string
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const startTime = Date.now();
      const methodId = `method_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.logger.info('Agent method started', {
        methodId,
        agentType,
        methodName,
        argsCount: args.length,
      });

      try {
        const result = await originalMethod(...args);
        const endTime = Date.now();
        const duration = endTime - startTime;

        this.logger.info('Agent method completed', {
          methodId,
          agentType,
          methodName,
          duration,
          success: true,
        });

        return result;

      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        this.logger.error('Agent method failed', {
          methodId,
          agentType,
          methodName,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });

        throw error;
      }
    };
  }

  /**
   * Get comprehensive metrics for an agent
   */
  async getAgentMetrics(
    agentType: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalRequests: number;
    averageLatency: number;
    successRate: number;
    totalCost: number;
    averageQuality: number;
    errorCount: number;
    mostCommonErrors: Array<{ error: string; count: number }>;
  }> {
    try {
      const metrics = this.llmOperationsLogger.getMetrics(timeRange);
      const costBreakdown = this.llmOperationsLogger.getCostBreakdown(timeRange);

      // Filter metrics by agent type (this would require additional filtering logic)
      return {
        totalRequests: 0, // Would need to filter by agent type
        averageLatency: metrics.averageLatency,
        successRate: metrics.successRate,
        totalCost: costBreakdown.costByAgent[agentType] || 0,
        averageQuality: metrics.averageConfidence,
        errorCount: 0, // Would need to filter by agent type
        mostCommonErrors: metrics.commonErrors,
      };

    } catch (error) {
      this.logger.error('Failed to get agent metrics', {
        agentType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        totalRequests: 0,
        averageLatency: 0,
        successRate: 0,
        totalCost: 0,
        averageQuality: 0,
        errorCount: 0,
        mostCommonErrors: [],
      };
    }
  }

  // Helper methods

  private messagesToString(messages: BaseMessage[]): string {
    return messages.map(msg => `${msg._getType()}: ${msg.content}`).join('\n');
  }

  private extractResponseContent(response: any): string {
    if (typeof response === 'string') {
      return response;
    }
    if (response && typeof response.content === 'string') {
      return response.content;
    }
    if (response && response.text) {
      return response.text;
    }
    return JSON.stringify(response);
  }

  private extractFinishReason(response: any): 'stop' | 'length' | 'content_filter' | 'function_call' | 'tool_calls' {
    if (response && response.finish_reason) {
      return response.finish_reason;
    }
    return 'stop';
  }

  private estimateTokens(text: string): number {
    // Simple token estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private generateHash(text: string): string {
    // Simple hash function for deduplication
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private detectPII(text: string): boolean {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}-\d{4}-\d{4}-\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone
    ];
    
    return piiPatterns.some(pattern => pattern.test(text));
  }

  private classifyData(severity: string): 'public' | 'internal' | 'confidential' | 'restricted' {
    switch (severity) {
      case 'critical': return 'restricted';
      case 'high': return 'confidential';
      case 'medium': return 'internal';
      default: return 'public';
    }
  }

  private getComplianceFlags(text: string, options: any): string[] {
    const flags: string[] = [];
    
    if (this.detectPII(text)) {
      flags.push('contains_pii');
    }
    
    if (options.severity === 'critical') {
      flags.push('critical_security_event');
    }
    
    return flags;
  }
}
