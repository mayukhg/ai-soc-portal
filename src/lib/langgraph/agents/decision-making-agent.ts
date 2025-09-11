/**
 * Decision Making Agent
 * Makes intelligent decisions based on analysis results using AI reasoning
 */

import { SOCState, ThreatClassification, RiskPrioritization, ResponseStrategy, ResourceAllocation, EscalationDecision } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

export class DecisionMakingAgent {
  private llm: ChatOpenAI;
  private promptTemplate: PromptTemplate;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 2000,
    });

    this.promptTemplate = PromptTemplate.fromTemplate(`
You are a cybersecurity decision-making expert. Make intelligent decisions based on analysis results.

Analysis Results:
- Threat Analysis: {threat_analysis}
- Risk Assessment: {risk_assessment}
- Correlations: {correlations}
- Predictions: {predictions}

Decision Requirements:
1. Classify threats by type, severity, and attack phase
2. Prioritize risks based on impact and likelihood
3. Determine appropriate response strategy
4. Allocate resources efficiently
5. Decide on escalation requirements
6. Provide confidence scores for each decision

Please provide decision-making results in JSON format with the following structure:
{{
  "threat_classification": {{
    "threat_types": ["malware", "phishing", "insider_threat"],
    "severity_levels": ["high", "medium", "low"],
    "attack_phases": ["execution", "persistence", "lateral_movement"],
    "threat_actors": ["apt_group_1", "criminal_organization"],
    "confidence": 0.85
  }},
  "risk_prioritization": {{
    "high_priority_risks": [
      {{
        "factor": "Critical system compromise",
        "score": 95,
        "weight": 0.4,
        "description": "High-value systems at risk",
        "mitigation": ["Immediate containment", "System isolation"]
      }}
    ],
    "medium_priority_risks": [],
    "low_priority_risks": [],
    "priority_scores": {{"critical_system": 95, "data_access": 75}},
    "recommended_actions": ["Contain critical systems", "Monitor data access"]
  }},
  "response_strategy": {{
    "strategy_type": "contain",
    "actions": [
      {{
        "action_id": "action_1",
        "action_type": "automated",
        "description": "Isolate compromised systems",
        "priority": "critical",
        "estimated_duration": "15 minutes",
        "required_skills": ["incident_response", "system_administration"],
        "dependencies": ["network_access", "system_credentials"]
      }}
    ],
    "timeline": "Immediate response required",
    "resources_required": ["incident_response_team", "network_engineers"],
    "success_criteria": ["Systems isolated", "Threat contained", "Data protected"],
    "confidence": 0.8
  }},
  "resource_allocation": {{
    "human_resources": [
      {{
        "role": "incident_response_lead",
        "skill_level": "senior",
        "availability": 1.0,
        "cost_per_hour": 150,
        "estimated_hours": 8
      }}
    ],
    "technical_resources": [
      {{
        "resource_type": "forensic_workstation",
        "quantity": 2,
        "cost_per_unit": 500,
        "availability": 1.0,
        "specifications": "High-performance analysis workstation"
      }}
    ],
    "budget_impact": 2500,
    "timeline": "4-8 hours",
    "constraints": ["Limited senior staff availability", "Budget constraints"]
  }},
  "escalation_decision": {{
    "should_escalate": true,
    "escalation_level": "manager",
    "escalation_reason": "Critical system compromise requires management oversight",
    "urgency": "critical",
    "timeline": "Immediate",
    "stakeholders": ["security_manager", "it_director", "legal_team"]
  }}
}}

Current Phase: {current_phase}
Request Type: {request_type}
    `);
  }

  async makeDecisions(state: SOCState): Promise<Partial<SOCState>> {
    try {
      console.log('🎯 Decision Making Agent: Starting decision process...');
      
      const startTime = Date.now();
      
      // Prepare context data
      const contextData = {
        threat_analysis: JSON.stringify(state.threat_analysis, null, 2),
        risk_assessment: JSON.stringify(state.risk_assessment, null, 2),
        correlations: JSON.stringify(state.correlations, null, 2),
        predictions: JSON.stringify(state.predictions, null, 2),
        current_phase: state.current_phase,
        request_type: state.request_type,
      };

      // Generate decisions using LLM
      const prompt = await this.promptTemplate.format(contextData);
      const response = await this.llm.invoke(prompt);
      
      // Parse the response
      const decisionResult = this.parseDecisionResponse(response.content as string);
      
      const duration = Date.now() - startTime;
      console.log(`🎯 Decision Making Agent: Completed in ${duration}ms`);
      
      return {
        ...decisionResult,
        current_phase: 'response_generation',
        phase_durations: {
          ...state.phase_durations,
          decision_making: duration,
        },
        confidence_scores: {
          ...state.confidence_scores,
          threat_classification: decisionResult.threat_classification?.confidence || 0,
          risk_prioritization: this.calculateRiskPrioritizationConfidence(decisionResult.risk_prioritization),
          response_strategy: decisionResult.response_strategy?.confidence || 0,
        },
      };
    } catch (error) {
      console.error('❌ Decision Making Agent Error:', error);
      return {
        errors: [...(state.errors || []), `Decision Making Error: ${error}`],
        current_phase: 'error',
      };
    }
  }

  private parseDecisionResponse(response: string): Partial<SOCState> {
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        threat_classification: parsed.threat_classification,
        risk_prioritization: parsed.risk_prioritization,
        response_strategy: parsed.response_strategy,
        resource_allocation: parsed.resource_allocation,
        escalation_decision: parsed.escalation_decision,
      };
    } catch (error) {
      console.error('Error parsing decision response:', error);
      
      // Return default decisions if parsing fails
      return {
        threat_classification: {
          threat_types: [],
          severity_levels: [],
          attack_phases: [],
          threat_actors: [],
          confidence: 0.0,
        },
        risk_prioritization: {
          high_priority_risks: [],
          medium_priority_risks: [],
          low_priority_risks: [],
          priority_scores: {},
          recommended_actions: ['Manual review required'],
        },
        response_strategy: {
          strategy_type: 'investigate',
          actions: [],
          timeline: 'Manual review required',
          resources_required: [],
          success_criteria: [],
          confidence: 0.0,
        },
        escalation_decision: {
          should_escalate: true,
          escalation_level: 'manager',
          escalation_reason: 'Unable to make automated decisions - manual review required',
          urgency: 'medium',
          timeline: 'As soon as possible',
          stakeholders: ['security_team'],
        },
      };
    }
  }

  private calculateRiskPrioritizationConfidence(riskPrioritization?: RiskPrioritization): number {
    if (!riskPrioritization) return 0.0;
    
    const totalRisks = riskPrioritization.high_priority_risks.length + 
                      riskPrioritization.medium_priority_risks.length + 
                      riskPrioritization.low_priority_risks.length;
    
    if (totalRisks === 0) return 0.0;
    
    // Calculate average confidence based on risk scores
    const allRisks = [
      ...riskPrioritization.high_priority_risks,
      ...riskPrioritization.medium_priority_risks,
      ...riskPrioritization.low_priority_risks,
    ];
    
    const totalScore = allRisks.reduce((sum, risk) => sum + risk.score, 0);
    return Math.min(totalScore / (totalRisks * 100), 1.0);
  }

  // Helper method to determine if decision making should be performed
  static shouldMakeDecisions(state: SOCState): boolean {
    return state.current_phase === 'reasoning' && 
           (state.threat_analysis || state.risk_assessment || state.correlations) &&
           !state.threat_classification;
  }
}
