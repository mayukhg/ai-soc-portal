/**
 * Threat Analysis Agent
 * Analyzes security threats and attack vectors using AI reasoning
 */

import { SOCState, ThreatAnalysis, Threat } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

export class ThreatAnalysisAgent {
  private llm: ChatOpenAI;
  private promptTemplate: PromptTemplate;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 2000,
    });

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
      "mitigation": ["action1", "action2"]
    }}
  ],
  "threat_level": "high",
  "attack_vectors": ["vector1", "vector2"],
  "threat_actors": ["actor1", "actor2"],
  "mitigation_strategies": ["strategy1", "strategy2"],
  "confidence": 0.8,
  "reasoning_chain": ["step1", "step2", "step3"]
}}

Current Phase: {current_phase}
Request Type: {request_type}
    `);
  }

  async analyze(state: SOCState): Promise<Partial<SOCState>> {
    try {
      console.log('🔍 Threat Analysis Agent: Starting analysis...');
      
      const startTime = Date.now();
      
      // Prepare context data
      const contextData = {
        alerts: JSON.stringify(state.alerts, null, 2),
        threat_intelligence: JSON.stringify(state.threat_intelligence, null, 2),
        entities: JSON.stringify(state.entities, null, 2),
        incidents: JSON.stringify(state.incidents, null, 2),
        current_phase: state.current_phase,
        request_type: state.request_type,
      };

      // Generate threat analysis using LLM
      const prompt = await this.promptTemplate.format(contextData);
      const response = await this.llm.invoke(prompt);
      
      // Parse the response
      const analysisResult = this.parseAnalysisResponse(response.content as string);
      
      const duration = Date.now() - startTime;
      console.log(`🔍 Threat Analysis Agent: Completed in ${duration}ms`);
      
      return {
        threat_analysis: analysisResult,
        current_phase: 'reasoning',
        phase_durations: {
          ...state.phase_durations,
          threat_analysis: duration,
        },
        confidence_scores: {
          ...state.confidence_scores,
          threat_analysis: analysisResult.confidence,
        },
        reasoning_chains: {
          ...state.reasoning_chains,
          threat_analysis: analysisResult.reasoning_chain,
        },
      };
    } catch (error) {
      console.error('❌ Threat Analysis Agent Error:', error);
      return {
        errors: [...(state.errors || []), `Threat Analysis Error: ${error}`],
        current_phase: 'error',
      };
    }
  }

  private parseAnalysisResponse(response: string): ThreatAnalysis {
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        threats_identified: parsed.threats_identified || [],
        threat_level: parsed.threat_level || 'low',
        attack_vectors: parsed.attack_vectors || [],
        threat_actors: parsed.threat_actors || [],
        mitigation_strategies: parsed.mitigation_strategies || [],
        confidence: parsed.confidence || 0.0,
        reasoning_chain: parsed.reasoning_chain || [],
      };
    } catch (error) {
      console.error('Error parsing threat analysis response:', error);
      
      // Return default analysis if parsing fails
      return {
        threats_identified: [],
        threat_level: 'low',
        attack_vectors: [],
        threat_actors: [],
        mitigation_strategies: [],
        confidence: 0.0,
        reasoning_chain: ['Failed to parse analysis response'],
      };
    }
  }

  // Helper method to determine if threat analysis should be performed
  static shouldAnalyze(state: SOCState): boolean {
    const analysisTypes = ['threat_analysis', 'incident_investigation', 'general_analysis'];
    return analysisTypes.includes(state.request_type) && 
           state.alerts.length > 0 && 
           !state.threat_analysis;
  }
}
