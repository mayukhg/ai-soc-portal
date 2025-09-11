/**
 * Response Generation Agent
 * Generates natural language responses, reports, and recommendations using AI
 */

import { SOCState, NaturalLanguageResponse, Report, AlertNotification, Recommendation, PlaybookSuggestion } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

export class ResponseGenerationAgent {
  private llm: ChatOpenAI;
  private promptTemplate: PromptTemplate;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 3000,
    });

    this.promptTemplate = PromptTemplate.fromTemplate(`
You are a cybersecurity response generation expert. Generate comprehensive responses, reports, and recommendations.

Analysis Results:
- Threat Analysis: {threat_analysis}
- Risk Assessment: {risk_assessment}
- Correlations: {correlations}
- Decisions: {decisions}

Response Requirements:
1. Generate natural language analysis summary
2. Create executive report
3. Generate alert notifications
4. Provide actionable recommendations
5. Suggest relevant playbooks
6. Adapt tone and detail level for different audiences

Please provide response generation results in JSON format with the following structure:
{{
  "natural_language_response": {{
    "response_type": "analysis",
    "content": "Based on the analysis, we have identified a high-severity malware threat targeting critical systems. The attack appears to be in the execution phase with potential for lateral movement.",
    "tone": "technical",
    "audience": "analyst",
    "confidence": 0.85
  }},
  "report": {{
    "report_id": "report_{timestamp}",
    "title": "Security Incident Analysis Report",
    "type": "incident",
    "content": "Executive Summary: Critical security incident detected...",
    "format": "html",
    "generated_at": "{timestamp}",
    "generated_by": "ai_system",
    "recipients": ["security_team", "management"],
    "status": "draft"
  }},
  "alert_notifications": [
    {{
      "alert_id": "alert_1",
      "notification_type": "email",
      "recipients": ["security@company.com"],
      "message": "High-severity security incident requires immediate attention",
      "priority": "critical",
      "sent_at": "{timestamp}",
      "status": "pending"
    }}
  ],
  "recommendations": [
    {{
      "recommendation_id": "rec_1",
      "type": "immediate",
      "priority": "critical",
      "description": "Isolate compromised systems immediately",
      "rationale": "Prevent lateral movement and data exfiltration",
      "implementation_steps": [
        "Disconnect affected systems from network",
        "Preserve system state for forensic analysis",
        "Notify incident response team"
      ],
      "estimated_effort": "30 minutes",
      "expected_benefit": "Prevent further compromise",
      "dependencies": ["network_access", "system_credentials"]
    }}
  ],
  "playbook_suggestions": [
    {{
      "playbook_id": "playbook_1",
      "name": "Malware Incident Response",
      "description": "Standard response procedure for malware incidents",
      "applicable_scenarios": ["malware_detection", "system_compromise"],
      "steps": [
        {{
          "step_id": "step_1",
          "order": 1,
          "action": "Contain the threat",
          "description": "Isolate affected systems",
          "type": "automated",
          "estimated_duration": "15 minutes",
          "required_tools": ["network_management", "system_administration"],
          "expected_outcome": "Systems isolated"
        }}
      ],
      "estimated_duration": "2-4 hours",
      "required_skills": ["incident_response", "malware_analysis"],
      "success_criteria": ["Threat contained", "Systems secured", "Evidence preserved"],
      "confidence": 0.9
    }}
  ]
}}

Current Phase: {current_phase}
Request Type: {request_type}
    `);
  }

  async generateResponses(state: SOCState): Promise<Partial<SOCState>> {
    try {
      console.log('📝 Response Generation Agent: Starting response generation...');
      
      const startTime = Date.now();
      
      // Prepare context data
      const contextData = {
        threat_analysis: JSON.stringify(state.threat_analysis, null, 2),
        risk_assessment: JSON.stringify(state.risk_assessment, null, 2),
        correlations: JSON.stringify(state.correlations, null, 2),
        decisions: JSON.stringify({
          threat_classification: state.threat_classification,
          risk_prioritization: state.risk_prioritization,
          response_strategy: state.response_strategy,
          escalation_decision: state.escalation_decision,
        }, null, 2),
        current_phase: state.current_phase,
        request_type: state.request_type,
        timestamp: new Date().toISOString(),
      };

      // Generate responses using LLM
      const prompt = await this.promptTemplate.format(contextData);
      const response = await this.llm.invoke(prompt);
      
      // Parse the response
      const responseResult = this.parseResponseGeneration(response.content as string);
      
      const duration = Date.now() - startTime;
      console.log(`📝 Response Generation Agent: Completed in ${duration}ms`);
      
      return {
        ...responseResult,
        current_phase: 'action_execution',
        phase_durations: {
          ...state.phase_durations,
          response_generation: duration,
        },
        confidence_scores: {
          ...state.confidence_scores,
          response_generation: responseResult.natural_language_response?.confidence || 0,
        },
      };
    } catch (error) {
      console.error('❌ Response Generation Agent Error:', error);
      return {
        errors: [...(state.errors || []), `Response Generation Error: ${error}`],
        current_phase: 'error',
      };
    }
  }

  private parseResponseGeneration(response: string): Partial<SOCState> {
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        natural_language_response: parsed.natural_language_response,
        report: parsed.report,
        alert_notifications: parsed.alert_notifications || [],
        recommendations: parsed.recommendations || [],
        playbook_suggestions: parsed.playbook_suggestions || [],
      };
    } catch (error) {
      console.error('Error parsing response generation:', error);
      
      // Return default responses if parsing fails
      return {
        natural_language_response: {
          response_type: 'analysis',
          content: 'Unable to generate response - manual review required',
          tone: 'formal',
          audience: 'analyst',
          confidence: 0.0,
        },
        report: {
          report_id: `report_${Date.now()}`,
          title: 'Security Analysis Report',
          type: 'incident',
          content: 'Manual review required - automated analysis failed',
          format: 'html',
          generated_at: new Date(),
          generated_by: 'ai_system',
          recipients: ['security_team'],
          status: 'draft',
        },
        alert_notifications: [],
        recommendations: [{
          recommendation_id: `rec_${Date.now()}`,
          type: 'immediate',
          priority: 'high',
          description: 'Manual review required',
          rationale: 'Automated analysis failed',
          implementation_steps: ['Review analysis results manually', 'Determine appropriate response'],
          estimated_effort: '1-2 hours',
          expected_benefit: 'Accurate analysis and response',
          dependencies: ['human_analyst'],
        }],
        playbook_suggestions: [],
      };
    }
  }

  // Helper method to determine if response generation should be performed
  static shouldGenerateResponses(state: SOCState): boolean {
    return state.current_phase === 'response_generation' && 
           (state.threat_classification || state.risk_prioritization || state.response_strategy) &&
           !state.natural_language_response;
  }
}
