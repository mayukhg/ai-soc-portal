/**
 * LangGraph Service
 * Service layer for integrating LangGraph workflows with the SOC Portal
 * Enhanced with LangSmith tracing and monitoring capabilities
 */

import { SOCWorkflow } from './soc-workflow';
import { SOCState } from './types';
import { Alert, Incident, Entity, ThreatIntelligence } from './types';
import { LangSmithService, TraceMetadata } from '../langsmith/langsmith-service';

export class LangGraphService {
  private workflow: SOCWorkflow;
  private langSmithService?: LangSmithService;

  constructor(langSmithService?: LangSmithService) {
    this.workflow = new SOCWorkflow();
    this.langSmithService = langSmithService;
  }

  /**
   * Execute threat analysis workflow
   */
  async analyzeThreats(data: {
    alerts: Alert[];
    threatIntelligence: ThreatIntelligence[];
    entities: Entity[];
    incidents: Incident[];
    userId: string;
    sessionId: string;
  }): Promise<SOCState> {
    const initialState: SOCState = {
      // Input data
      alerts: data.alerts,
      threat_intelligence: data.threatIntelligence,
      entities: data.entities,
      incidents: data.incidents,
      
      // Workflow control
      current_phase: 'context_analysis',
      request_type: 'threat_analysis',
      user_id: data.userId,
      session_id: data.sessionId,
      
      // Initialize other required fields
      context_analysis: {},
      phase_durations: {},
      confidence_scores: {},
      reasoning_chains: {},
      validation_results: {},
      errors: [],
      warnings: [],
      human_input_required: false,
      start_time: new Date(),
    };

    return await this.workflow.executeWorkflow(initialState);
  }

  /**
   * Execute incident investigation workflow
   */
  async investigateIncident(data: {
    incident: Incident;
    relatedAlerts: Alert[];
    threatIntelligence: ThreatIntelligence[];
    entities: Entity[];
    userId: string;
    sessionId: string;
  }): Promise<SOCState> {
    const initialState: SOCState = {
      // Input data
      alerts: data.relatedAlerts,
      threat_intelligence: data.threatIntelligence,
      entities: data.entities,
      incidents: [data.incident],
      
      // Workflow control
      current_phase: 'context_analysis',
      request_type: 'incident_investigation',
      user_id: data.userId,
      session_id: data.sessionId,
      
      // Initialize other required fields
      context_analysis: {},
      phase_durations: {},
      confidence_scores: {},
      reasoning_chains: {},
      validation_results: {},
      errors: [],
      warnings: [],
      human_input_required: false,
      start_time: new Date(),
    };

    return await this.workflow.executeWorkflow(initialState);
  }

  /**
   * Execute risk assessment workflow
   */
  async assessRisk(data: {
    alerts: Alert[];
    incidents: Incident[];
    entities: Entity[];
    threatIntelligence: ThreatIntelligence[];
    userId: string;
    sessionId: string;
  }): Promise<SOCState> {
    const initialState: SOCState = {
      // Input data
      alerts: data.alerts,
      threat_intelligence: data.threatIntelligence,
      entities: data.entities,
      incidents: data.incidents,
      
      // Workflow control
      current_phase: 'context_analysis',
      request_type: 'risk_assessment',
      user_id: data.userId,
      session_id: data.sessionId,
      
      // Initialize other required fields
      context_analysis: {},
      phase_durations: {},
      confidence_scores: {},
      reasoning_chains: {},
      validation_results: {},
      errors: [],
      warnings: [],
      human_input_required: false,
      start_time: new Date(),
    };

    return await this.workflow.executeWorkflow(initialState);
  }

  /**
   * Execute correlation analysis workflow
   */
  async analyzeCorrelations(data: {
    alerts: Alert[];
    incidents: Incident[];
    entities: Entity[];
    threatIntelligence: ThreatIntelligence[];
    userId: string;
    sessionId: string;
  }): Promise<SOCState> {
    const initialState: SOCState = {
      // Input data
      alerts: data.alerts,
      threat_intelligence: data.threatIntelligence,
      entities: data.entities,
      incidents: data.incidents,
      
      // Workflow control
      current_phase: 'context_analysis',
      request_type: 'correlation_analysis',
      user_id: data.userId,
      session_id: data.sessionId,
      
      // Initialize other required fields
      context_analysis: {},
      phase_durations: {},
      confidence_scores: {},
      reasoning_chains: {},
      validation_results: {},
      errors: [],
      warnings: [],
      human_input_required: false,
      start_time: new Date(),
    };

    return await this.workflow.executeWorkflow(initialState);
  }

  /**
   * Execute automated response workflow
   */
  async executeAutomatedResponse(data: {
    alerts: Alert[];
    incidents: Incident[];
    entities: Entity[];
    threatIntelligence: ThreatIntelligence[];
    userId: string;
    sessionId: string;
  }): Promise<SOCState> {
    const initialState: SOCState = {
      // Input data
      alerts: data.alerts,
      threat_intelligence: data.threatIntelligence,
      entities: data.entities,
      incidents: data.incidents,
      
      // Workflow control
      current_phase: 'context_analysis',
      request_type: 'automated_response',
      user_id: data.userId,
      session_id: data.sessionId,
      
      // Initialize other required fields
      context_analysis: {},
      phase_durations: {},
      confidence_scores: {},
      reasoning_chains: {},
      validation_results: {},
      errors: [],
      warnings: [],
      human_input_required: false,
      start_time: new Date(),
    };

    return await this.workflow.executeWorkflow(initialState);
  }

  /**
   * Execute playbook workflow
   */
  async executePlaybook(data: {
    playbookId: string;
    alerts: Alert[];
    incidents: Incident[];
    entities: Entity[];
    threatIntelligence: ThreatIntelligence[];
    userId: string;
    sessionId: string;
  }): Promise<SOCState> {
    const initialState: SOCState = {
      // Input data
      alerts: data.alerts,
      threat_intelligence: data.threatIntelligence,
      entities: data.entities,
      incidents: data.incidents,
      
      // Workflow control
      current_phase: 'context_analysis',
      request_type: 'playbook_execution',
      user_id: data.userId,
      session_id: data.sessionId,
      
      // Initialize other required fields
      context_analysis: {},
      phase_durations: {},
      confidence_scores: {},
      reasoning_chains: {},
      validation_results: {},
      errors: [],
      warnings: [],
      human_input_required: false,
      start_time: new Date(),
    };

    return await this.workflow.executeWorkflow(initialState);
  }

  /**
   * Get workflow status and configuration
   */
  getWorkflowInfo() {
    return {
      name: 'SOC AI Agent Workflow',
      version: '1.0.0',
      description: 'AI-powered security operations workflow using LangGraph',
      configuration: this.workflow.getWorkflowConfig(),
      capabilities: [
        'threat_analysis',
        'risk_assessment',
        'correlation_analysis',
        'incident_investigation',
        'automated_response',
        'playbook_execution',
      ],
    };
  }

  /**
   * Validate workflow state
   */
  validateState(state: SOCState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!state.workflow_id) {
      errors.push('Missing workflow_id');
    }

    if (!state.user_id) {
      errors.push('Missing user_id');
    }

    if (!state.session_id) {
      errors.push('Missing session_id');
    }

    if (!state.request_type) {
      errors.push('Missing request_type');
    }

    // Check data consistency
    if (state.alerts.length === 0 && state.incidents.length === 0) {
      errors.push('No alerts or incidents provided for analysis');
    }

    // Check phase consistency
    const validPhases = [
      'context_analysis',
      'reasoning',
      'decision_making',
      'response_generation',
      'action_execution',
      'learning',
      'completed',
      'error',
    ];

    if (!validPhases.includes(state.current_phase)) {
      errors.push(`Invalid current_phase: ${state.current_phase}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get workflow metrics
   */
  getWorkflowMetrics(state: SOCState) {
    return {
      total_duration: state.total_duration || 0,
      phase_durations: state.phase_durations || {},
      confidence_scores: state.confidence_scores || {},
      error_count: state.errors?.length || 0,
      warning_count: state.warnings?.length || 0,
      human_input_required: state.human_input_required || false,
      completion_status: state.current_phase === 'completed' ? 'completed' : 'in_progress',
    };
  }

  /**
   * Execute workflow with LangSmith tracing
   * Enhanced version that traces each phase of the workflow
   */
  private async executeWorkflowWithTracing(
    initialState: SOCState,
    traceId?: string
  ): Promise<SOCState> {
    let currentState = { ...initialState };
    
    // Add workflow_id if missing
    if (!currentState.workflow_id) {
      currentState.workflow_id = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Execute workflow phases with tracing
    while (currentState.current_phase !== 'completed' && currentState.current_phase !== 'error') {
      const phaseStartTime = Date.now();
      
      // Start phase trace
      if (this.langSmithService && traceId) {
        await this.langSmithService.startPhaseTrace(
          traceId,
          currentState.current_phase,
          this.getAgentTypeForPhase(currentState.current_phase)
        );
      }

      try {
        // Execute the workflow step
        currentState = await this.workflow.executeWorkflow(currentState);
        
        const phaseEndTime = Date.now();
        const phaseDuration = phaseEndTime - phaseStartTime;
        
        // Complete phase trace
        if (this.langSmithService && traceId) {
          await this.langSmithService.completePhaseTrace(
            traceId,
            currentState.current_phase,
            {
              latencyMs: phaseDuration,
              inputTokens: this.estimateInputTokens(currentState),
              outputTokens: this.estimateOutputTokens(currentState),
            }
          );
        }

        // Log custom events for important phase transitions
        if (this.langSmithService && traceId) {
          await this.langSmithService.logCustomEvent(
            traceId,
            `phase_${currentState.current_phase}_completed`,
            {
              phase: currentState.current_phase,
              duration: phaseDuration,
              confidence: currentState.confidence_scores[currentState.current_phase] || 0,
              errors: currentState.errors.length,
              warnings: currentState.warnings.length,
            }
          );
        }

      } catch (error) {
        // Complete phase trace with error
        if (this.langSmithService && traceId) {
          await this.langSmithService.completePhaseTrace(
            traceId,
            currentState.current_phase,
            {
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          );
        }
        
        // Log error event
        if (this.langSmithService && traceId) {
          await this.langSmithService.logCustomEvent(
            traceId,
            `phase_${currentState.current_phase}_error`,
            {
              phase: currentState.current_phase,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            'error'
          );
        }
        
        throw error;
      }
    }

    return currentState;
  }

  /**
   * Determine severity based on alerts
   */
  private determineSeverity(alerts: Alert[]): 'low' | 'medium' | 'high' | 'critical' {
    if (alerts.length === 0) return 'low';
    
    const severities = alerts.map(alert => alert.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Get agent type for a given phase
   */
  private getAgentTypeForPhase(phase: string): string {
    const phaseAgentMap: Record<string, string> = {
      'context_analysis': 'threat-analysis-agent',
      'reasoning': 'risk-assessment-agent',
      'decision_making': 'decision-making-agent',
      'response_generation': 'response-generation-agent',
      'action_execution': 'action-execution-agent',
      'learning': 'correlation-agent',
    };
    
    return phaseAgentMap[phase] || 'unknown-agent';
  }

  /**
   * Estimate input tokens for a state
   */
  private estimateInputTokens(state: SOCState): number {
    let tokens = 0;
    
    // Count tokens from alerts
    tokens += state.alerts.reduce((sum, alert) => sum + this.estimateTextTokens(alert.description || ''), 0);
    
    // Count tokens from incidents
    tokens += state.incidents.reduce((sum, incident) => sum + this.estimateTextTokens(incident.description || ''), 0);
    
    // Count tokens from threat intelligence
    tokens += state.threat_intelligence.reduce((sum, ti) => sum + this.estimateTextTokens(ti.description || ''), 0);
    
    return tokens;
  }

  /**
   * Estimate output tokens for a state
   */
  private estimateOutputTokens(state: SOCState): number {
    let tokens = 0;
    
    // Count tokens from analysis results
    if (state.threat_analysis) {
      tokens += this.estimateTextTokens(JSON.stringify(state.threat_analysis));
    }
    
    if (state.risk_assessment) {
      tokens += this.estimateTextTokens(JSON.stringify(state.risk_assessment));
    }
    
    if (state.natural_language_response) {
      tokens += this.estimateTextTokens(state.natural_language_response.content || '');
    }
    
    return tokens;
  }

  /**
   * Estimate token count for text (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTextTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate total tokens for a state
   */
  private calculateTotalTokens(state: SOCState): number {
    return this.estimateInputTokens(state) + this.estimateOutputTokens(state);
  }

  /**
   * Calculate estimated cost for a state
   */
  private calculateCost(state: SOCState): number {
    const totalTokens = this.calculateTotalTokens(state);
    // Simplified cost calculation (would use actual model pricing)
    const inputTokens = this.estimateInputTokens(state);
    const outputTokens = this.estimateOutputTokens(state);
    const inputCost = inputTokens * 0.0000015; // $0.0015 per 1K tokens
    const outputCost = outputTokens * 0.000006; // $0.006 per 1K tokens
    return inputCost + outputCost;
  }

  /**
   * Set LangSmith service for tracing
   */
  setLangSmithService(langSmithService: LangSmithService): void {
    this.langSmithService = langSmithService;
  }

  /**
   * Get LangSmith service status
   */
  getLangSmithStatus(): { enabled: boolean; service?: any } {
    return {
      enabled: !!this.langSmithService,
      service: this.langSmithService?.getServiceStatus(),
    };
  }
}
