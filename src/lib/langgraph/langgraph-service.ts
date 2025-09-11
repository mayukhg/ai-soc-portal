/**
 * LangGraph Service
 * Service layer for integrating LangGraph workflows with the SOC Portal
 */

import { SOCWorkflow } from './soc-workflow';
import { SOCState } from './types';
import { Alert, Incident, Entity, ThreatIntelligence } from './types';

export class LangGraphService {
  private workflow: SOCWorkflow;

  constructor() {
    this.workflow = new SOCWorkflow();
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
}
