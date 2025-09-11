/**
 * Risk Assessment Agent
 * Evaluates risk levels and impact using AI reasoning
 */

import { SOCState, RiskAssessment, RiskFactor, ImpactAssessment, LikelihoodAssessment } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

export class RiskAssessmentAgent {
  private llm: ChatOpenAI;
  private promptTemplate: PromptTemplate;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 2000,
    });

    this.promptTemplate = PromptTemplate.fromTemplate(`
You are a cybersecurity risk assessment expert. Evaluate the risk levels and potential impact of the security situation.

Context Data:
- Alerts: {alerts}
- Threat Analysis: {threat_analysis}
- Entities: {entities}
- Incidents: {incidents}
- Threat Intelligence: {threat_intelligence}

Risk Assessment Requirements:
1. Calculate overall risk score (0-100)
2. Identify and score individual risk factors
3. Assess potential impact on confidentiality, integrity, and availability
4. Evaluate likelihood of threat materialization
5. Provide risk mitigation recommendations
6. Assign confidence scores

Please provide a comprehensive risk assessment in JSON format with the following structure:
{{
  "overall_risk_score": 75,
  "risk_factors": [
    {{
      "factor": "Unpatched vulnerabilities",
      "score": 85,
      "weight": 0.3,
      "description": "Critical vulnerabilities present in key systems",
      "mitigation": ["Apply patches immediately", "Implement vulnerability scanning"]
    }}
  ],
  "impact_assessment": {{
    "confidentiality": 80,
    "integrity": 70,
    "availability": 60,
    "overall_impact": 70,
    "business_impact": "High risk of data breach and service disruption"
  }},
  "likelihood_assessment": {{
    "threat_capability": 75,
    "threat_intent": 80,
    "vulnerability_exploitability": 85,
    "overall_likelihood": 80,
    "reasoning": "High capability threat actors with clear intent targeting easily exploitable vulnerabilities"
  }},
  "recommendations": [
    "Immediate patching of critical vulnerabilities",
    "Enhanced monitoring of high-risk systems",
    "Implementation of additional security controls"
  ],
  "confidence": 0.85
}}

Current Phase: {current_phase}
Request Type: {request_type}
    `);
  }

  async assess(state: SOCState): Promise<Partial<SOCState>> {
    try {
      console.log('📊 Risk Assessment Agent: Starting assessment...');
      
      const startTime = Date.now();
      
      // Prepare context data
      const contextData = {
        alerts: JSON.stringify(state.alerts, null, 2),
        threat_analysis: JSON.stringify(state.threat_analysis, null, 2),
        entities: JSON.stringify(state.entities, null, 2),
        incidents: JSON.stringify(state.incidents, null, 2),
        threat_intelligence: JSON.stringify(state.threat_intelligence, null, 2),
        current_phase: state.current_phase,
        request_type: state.request_type,
      };

      // Generate risk assessment using LLM
      const prompt = await this.promptTemplate.format(contextData);
      const response = await this.llm.invoke(prompt);
      
      // Parse the response
      const assessmentResult = this.parseAssessmentResponse(response.content as string);
      
      const duration = Date.now() - startTime;
      console.log(`📊 Risk Assessment Agent: Completed in ${duration}ms`);
      
      return {
        risk_assessment: assessmentResult,
        current_phase: 'reasoning',
        phase_durations: {
          ...state.phase_durations,
          risk_assessment: duration,
        },
        confidence_scores: {
          ...state.confidence_scores,
          risk_assessment: assessmentResult.confidence,
        },
      };
    } catch (error) {
      console.error('❌ Risk Assessment Agent Error:', error);
      return {
        errors: [...(state.errors || []), `Risk Assessment Error: ${error}`],
        current_phase: 'error',
      };
    }
  }

  private parseAssessmentResponse(response: string): RiskAssessment {
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        overall_risk_score: parsed.overall_risk_score || 0,
        risk_factors: parsed.risk_factors || [],
        impact_assessment: parsed.impact_assessment || this.getDefaultImpactAssessment(),
        likelihood_assessment: parsed.likelihood_assessment || this.getDefaultLikelihoodAssessment(),
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 0.0,
      };
    } catch (error) {
      console.error('Error parsing risk assessment response:', error);
      
      // Return default assessment if parsing fails
      return {
        overall_risk_score: 50,
        risk_factors: [],
        impact_assessment: this.getDefaultImpactAssessment(),
        likelihood_assessment: this.getDefaultLikelihoodAssessment(),
        recommendations: ['Unable to assess risk - manual review required'],
        confidence: 0.0,
      };
    }
  }

  private getDefaultImpactAssessment(): ImpactAssessment {
    return {
      confidentiality: 50,
      integrity: 50,
      availability: 50,
      overall_impact: 50,
      business_impact: 'Unable to assess impact - manual review required',
    };
  }

  private getDefaultLikelihoodAssessment(): LikelihoodAssessment {
    return {
      threat_capability: 50,
      threat_intent: 50,
      vulnerability_exploitability: 50,
      overall_likelihood: 50,
      reasoning: 'Unable to assess likelihood - manual review required',
    };
  }

  // Helper method to determine if risk assessment should be performed
  static shouldAssess(state: SOCState): boolean {
    const assessmentTypes = ['risk_assessment', 'threat_analysis', 'general_analysis'];
    return assessmentTypes.includes(state.request_type) && 
           (state.alerts.length > 0 || state.incidents.length > 0) && 
           !state.risk_assessment;
  }
}
