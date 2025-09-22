/**
 * Logging-Enhanced Threat Analysis Agent
 * Enhanced threat analysis agent with comprehensive LLM operations logging
 * 
 * Features:
 * - Detailed request/response logging
 * - Token usage tracking
 * - Cost estimation
 * - Performance metrics
 * - Quality assessment
 * - Security monitoring
 */

import { SOCState, ThreatAnalysis, Threat } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMOperationsLogger, LLMRequestData, LLMResponseData } from '../../logging/llm-operations-logger';
import { Logger } from '../../data-ingestion/utils/logger';

export class LoggingEnhancedThreatAnalysisAgent {
  private llm: ChatOpenAI;
  private promptTemplate: PromptTemplate;
  private logger: Logger;
  private llmOperationsLogger: LLMOperationsLogger;

  constructor(llmOperationsLogger: LLMOperationsLogger) {
    this.logger = new Logger('LoggingEnhancedThreatAnalysisAgent');
    this.llmOperationsLogger = llmOperationsLogger;

    // Initialize OpenAI LLM
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 2000,
    });

    // Enhanced prompt template with logging context
    this.promptTemplate = PromptTemplate.fromTemplate(`
You are a cybersecurity threat analysis expert. Analyze the following security data and identify potential threats.

Context Data:
- Alerts: {alerts}
- Threat Intelligence: {threat_intelligence}
- Entities: {entities}
- Incidents: {incidents}

Analysis Requirements:
1. Identify all potential threats and attack vectors
2. Determine threat severity levels
3. Identify threat actors if possible
4. Suggest mitigation strategies
5. Provide confidence scores for each assessment
6. Include evidence-based reasoning

Please provide a comprehensive threat analysis in JSON format with the following structure:
{{
  "threats_identified": [
    {{
      "id": "threat_1",
      "type": "malware",
      "severity": "high",
      "description": "Description of the threat",
      "indicators": ["indicator1", "indicator2"],
      "attack_phase": "execution",
      "confidence": 0.85,
      "mitigation": ["action1", "action2"],
      "evidence": ["evidence1", "evidence2"],
      "reasoning": "Detailed reasoning for this assessment"
    }}
  ],
  "threat_level": "high",
  "attack_vectors": ["vector1", "vector2"],
  "threat_actors": ["actor1", "actor2"],
  "mitigation_strategies": ["strategy1", "strategy2"],
  "confidence": 0.8,
  "reasoning_chain": ["step1", "step2", "step3"],
  "analysis_metadata": {{
    "analysis_duration_ms": {analysis_duration},
    "data_sources_analyzed": {data_sources_count},
    "threat_indicators_found": {indicators_count},
    "confidence_factors": ["factor1", "factor2"]
  }}
}}

Current Phase: {current_phase}
Request Type: {request_type}
Timestamp: {timestamp}
    `);
  }

  /**
   * Analyze threats with comprehensive logging
   */
  async analyze(state: SOCState): Promise<Partial<SOCState>> {
    const requestId = await this.logRequest(state);
    
    try {
      this.logger.info('🔍 Logging-Enhanced Threat Analysis Agent: Starting analysis...', {
        requestId,
        agentType: 'threat_analysis',
        workflowPhase: state.current_phase,
      });
      
      const startTime = Date.now();
      
      // Prepare context data
      const contextData = {
        alerts: JSON.stringify(state.alerts, null, 2),
        threat_intelligence: JSON.stringify(state.threat_intelligence, null, 2),
        entities: JSON.stringify(state.entities, null, 2),
        incidents: JSON.stringify(state.incidents, null, 2),
        current_phase: state.current_phase,
        request_type: state.request_type,
        timestamp: new Date().toISOString(),
        analysis_duration: 0, // Will be updated after analysis
        data_sources_count: this.countDataSources(state),
        indicators_count: this.countThreatIndicators(state),
      };

      // Generate analysis using LLM
      const prompt = await this.promptTemplate.format(contextData);
      const response = await this.llm.invoke(prompt);
      
      const endTime = Date.now();
      const analysisDuration = endTime - startTime;
      
      // Log response with comprehensive metrics
      const responseId = await this.logResponse(requestId, {
        content: response.content as string,
        responseTokens: this.estimateTokens(response.content as string),
        responseLength: (response.content as string).length,
        responseHash: this.generateHash(response.content as string),
        modelName: 'gpt-4o-mini',
        finishReason: 'stop',
      });

      // Parse the response
      const analysisResult = this.parseThreatAnalysis(response.content as string, analysisDuration);
      
      this.logger.info('🔍 Logging-Enhanced Threat Analysis Agent: Completed analysis', {
        requestId,
        responseId,
        analysisDuration,
        threatsIdentified: analysisResult.threat_analysis?.threats_identified?.length || 0,
        confidence: analysisResult.threat_analysis?.confidence || 0,
      });
      
      return {
        ...analysisResult,
        current_phase: 'risk_assessment',
        phase_durations: {
          ...state.phase_durations,
          threat_analysis: analysisDuration,
        },
        confidence_scores: {
          ...state.confidence_scores,
          threat_analysis: analysisResult.threat_analysis?.confidence || 0,
        },
        // Add logging metadata
        logging_metadata: {
          requestId,
          responseId,
          analysisDuration,
          tokensUsed: this.estimateTokens(prompt) + this.estimateTokens(response.content as string),
          modelUsed: 'gpt-4o-mini',
          qualityScore: analysisResult.threat_analysis?.confidence || 0,
        },
      };
    } catch (error) {
      this.logger.error('❌ Logging-Enhanced Threat Analysis Agent Error:', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      return {
        errors: [...(state.errors || []), `Logging-Enhanced Threat Analysis Error: ${error}`],
        current_phase: 'error',
        logging_metadata: {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Log LLM request with detailed tracking
   */
  private async logRequest(state: SOCState): Promise<string> {
    const prompt = await this.promptTemplate.format({
      alerts: JSON.stringify(state.alerts, null, 2),
      threat_intelligence: JSON.stringify(state.threat_intelligence, null, 2),
      entities: JSON.stringify(state.entities, null, 2),
      incidents: JSON.stringify(state.incidents, null, 2),
      current_phase: state.current_phase,
      request_type: state.request_type,
      timestamp: new Date().toISOString(),
      analysis_duration: 0,
      data_sources_count: this.countDataSources(state),
      indicators_count: this.countThreatIndicators(state),
    });

    const requestData: Omit<LLMRequestData, 'requestId' | 'timestamp' | 'startTime'> = {
      sessionId: state.sessionId || 'unknown',
      userId: state.userId,
      modelName: 'gpt-4o-mini',
      modelVersion: 'latest',
      temperature: 0.1,
      maxTokens: 2000,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      prompt,
      promptTokens: this.estimateTokens(prompt),
      promptLength: prompt.length,
      promptHash: this.generateHash(prompt),
      agentType: 'threat_analysis',
      workflowPhase: state.current_phase,
      requestType: state.request_type,
      severity: this.determineSeverity(state),
      tags: this.generateTags(state),
      customAttributes: {
        alertsCount: state.alerts?.length || 0,
        threatIntelligenceCount: state.threat_intelligence?.length || 0,
        entitiesCount: state.entities?.length || 0,
        incidentsCount: state.incidents?.length || 0,
        dataSourcesCount: this.countDataSources(state),
        threatIndicatorsCount: this.countThreatIndicators(state),
      },
      containsPII: this.detectPII(prompt),
      dataClassification: this.classifyData(state),
      complianceFlags: this.getComplianceFlags(state),
    };

    return await this.llmOperationsLogger.logRequest(requestData);
  }

  /**
   * Log LLM response with comprehensive metrics
   */
  private async logResponse(
    requestId: string,
    responseData: Omit<LLMResponseData, 'requestId' | 'responseId' | 'timestamp' | 'endTime' | 'totalLatency' | 'processingTime'>
  ): Promise<string> {
    return await this.llmOperationsLogger.logResponse(requestId, responseData);
  }

  /**
   * Parse LLM response into structured threat analysis
   */
  private parseThreatAnalysis(response: string, analysisDuration: number): Partial<SOCState> {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysisData = JSON.parse(jsonMatch[0]);
      
      // Enhance analysis with logging metadata
      const enhancedAnalysis: ThreatAnalysis = {
        threats_identified: analysisData.threats_identified || [],
        threat_level: analysisData.threat_level || 'medium',
        attack_vectors: analysisData.attack_vectors || [],
        threat_actors: analysisData.threat_actors || [],
        mitigation_strategies: analysisData.mitigation_strategies || [],
        confidence: analysisData.confidence || 0,
        reasoning_chain: analysisData.reasoning_chain || [],
        analysis_metadata: {
          ...analysisData.analysis_metadata,
          analysis_duration_ms: analysisDuration,
          logging_enabled: true,
          enhanced_analysis: true,
        },
      };
      
      return {
        threat_analysis: enhancedAnalysis,
      };
    } catch (error) {
      this.logger.error('Error parsing threat analysis response:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 500), // Log first 500 chars for debugging
      });
      
      return {
        errors: [`Threat Analysis Parsing Error: ${error}`],
      };
    }
  }

  // Helper methods

  private countDataSources(state: SOCState): number {
    let count = 0;
    if (state.alerts && state.alerts.length > 0) count++;
    if (state.threat_intelligence && state.threat_intelligence.length > 0) count++;
    if (state.entities && state.entities.length > 0) count++;
    if (state.incidents && state.incidents.length > 0) count++;
    return count;
  }

  private countThreatIndicators(state: SOCState): number {
    let count = 0;
    if (state.threat_intelligence) {
      count += state.threat_intelligence.length;
    }
    if (state.alerts) {
      count += state.alerts.length;
    }
    return count;
  }

  private determineSeverity(state: SOCState): 'low' | 'medium' | 'high' | 'critical' {
    // Determine severity based on input data
    const hasCriticalAlerts = state.alerts?.some(alert => alert.severity === 'critical');
    const hasCriticalIncidents = state.incidents?.some(incident => incident.severity === 'critical');
    const hasHighThreatIntelligence = state.threat_intelligence?.some(ti => ti.threat_level === 'critical');

    if (hasCriticalAlerts || hasCriticalIncidents || hasHighThreatIntelligence) {
      return 'critical';
    }

    const hasHighAlerts = state.alerts?.some(alert => alert.severity === 'high');
    const hasHighIncidents = state.incidents?.some(incident => incident.severity === 'high');
    const hasMediumThreatIntelligence = state.threat_intelligence?.some(ti => ti.threat_level === 'high');

    if (hasHighAlerts || hasHighIncidents || hasMediumThreatIntelligence) {
      return 'high';
    }

    return 'medium';
  }

  private generateTags(state: SOCState): string[] {
    const tags: string[] = ['threat_analysis', 'ai_agent'];
    
    if (state.alerts && state.alerts.length > 0) tags.push('has_alerts');
    if (state.threat_intelligence && state.threat_intelligence.length > 0) tags.push('has_threat_intelligence');
    if (state.entities && state.entities.length > 0) tags.push('has_entities');
    if (state.incidents && state.incidents.length > 0) tags.push('has_incidents');
    
    return tags;
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

  private classifyData(state: SOCState): 'public' | 'internal' | 'confidential' | 'restricted' {
    // Simple data classification based on severity
    const severity = this.determineSeverity(state);
    
    switch (severity) {
      case 'critical': return 'restricted';
      case 'high': return 'confidential';
      case 'medium': return 'internal';
      default: return 'public';
    }
  }

  private getComplianceFlags(state: SOCState): string[] {
    const flags: string[] = [];
    
    if (this.detectPII(JSON.stringify(state))) {
      flags.push('contains_pii');
    }
    
    if (state.alerts?.some(alert => alert.severity === 'critical')) {
      flags.push('critical_security_event');
    }
    
    return flags;
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
}
