/**
 * Correlation Agent
 * Finds relationships and patterns between security events using AI reasoning
 */

import { SOCState, CorrelationResult } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

export class CorrelationAgent {
  private llm: ChatOpenAI;
  private promptTemplate: PromptTemplate;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 2000,
    });

    this.promptTemplate = PromptTemplate.fromTemplate(`
You are a cybersecurity correlation expert. Analyze security events and find relationships, patterns, and attack chains.

Context Data:
- Alerts: {alerts}
- Incidents: {incidents}
- Entities: {entities}
- Threat Intelligence: {threat_intelligence}
- Threat Analysis: {threat_analysis}

Correlation Requirements:
1. Find temporal correlations (events happening in sequence)
2. Identify spatial correlations (events from same source/location)
3. Detect behavioral correlations (similar attack patterns)
4. Discover attribution correlations (same threat actor)
5. Calculate confidence scores for each correlation
6. Provide recommendations based on correlations

Please provide correlation analysis in JSON format with the following structure:
{{
  "correlations": [
    {{
      "correlation_id": "corr_1",
      "correlated_events": ["alert_1", "alert_2", "incident_1"],
      "correlation_type": "temporal",
      "confidence": 0.85,
      "pattern": "Sequential login attempts from same IP",
      "description": "Multiple failed login attempts followed by successful login from suspicious IP",
      "recommendations": [
        "Investigate IP address for malicious activity",
        "Review authentication logs for additional patterns",
        "Consider implementing additional monitoring"
      ]
    }}
  ]
}}

Current Phase: {current_phase}
Request Type: {request_type}
    `);
  }

  async correlate(state: SOCState): Promise<Partial<SOCState>> {
    try {
      console.log('🔗 Correlation Agent: Starting correlation analysis...');
      
      const startTime = Date.now();
      
      // Prepare context data
      const contextData = {
        alerts: JSON.stringify(state.alerts, null, 2),
        incidents: JSON.stringify(state.incidents, null, 2),
        entities: JSON.stringify(state.entities, null, 2),
        threat_intelligence: JSON.stringify(state.threat_intelligence, null, 2),
        threat_analysis: JSON.stringify(state.threat_analysis, null, 2),
        current_phase: state.current_phase,
        request_type: state.request_type,
      };

      // Generate correlation analysis using LLM
      const prompt = await this.promptTemplate.format(contextData);
      const response = await this.llm.invoke(prompt);
      
      // Parse the response
      const correlationResult = this.parseCorrelationResponse(response.content as string);
      
      const duration = Date.now() - startTime;
      console.log(`🔗 Correlation Agent: Completed in ${duration}ms`);
      
      return {
        correlations: correlationResult,
        current_phase: 'reasoning',
        phase_durations: {
          ...state.phase_durations,
          correlation_analysis: duration,
        },
        confidence_scores: {
          ...state.confidence_scores,
          correlation_analysis: this.calculateOverallConfidence(correlationResult),
        },
      };
    } catch (error) {
      console.error('❌ Correlation Agent Error:', error);
      return {
        errors: [...(state.errors || []), `Correlation Analysis Error: ${error}`],
        current_phase: 'error',
      };
    }
  }

  private parseCorrelationResponse(response: string): CorrelationResult[] {
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return parsed.correlations || [];
    } catch (error) {
      console.error('Error parsing correlation response:', error);
      
      // Return empty correlations if parsing fails
      return [];
    }
  }

  private calculateOverallConfidence(correlations: CorrelationResult[]): number {
    if (correlations.length === 0) {
      return 0.0;
    }

    const totalConfidence = correlations.reduce((sum, corr) => sum + corr.confidence, 0);
    return totalConfidence / correlations.length;
  }

  // Helper method to determine if correlation analysis should be performed
  static shouldCorrelate(state: SOCState): boolean {
    const correlationTypes = ['correlation_analysis', 'incident_investigation', 'general_analysis'];
    return correlationTypes.includes(state.request_type) && 
           (state.alerts.length > 1 || state.incidents.length > 0) && 
           !state.correlations;
  }
}
