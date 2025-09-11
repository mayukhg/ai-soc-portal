/**
 * SOC Workflow using LangGraph
 * Main orchestration workflow for AI agents in the SOC Portal
 */

import { StateGraph, END } from 'langgraph';
import { SOCState } from './types';
import { ThreatAnalysisAgent } from './agents/threat-analysis-agent';
import { RiskAssessmentAgent } from './agents/risk-assessment-agent';
import { CorrelationAgent } from './agents/correlation-agent';
import { DecisionMakingAgent } from './agents/decision-making-agent';
import { ResponseGenerationAgent } from './agents/response-generation-agent';
import { ActionExecutionAgent } from './agents/action-execution-agent';

export class SOCWorkflow {
  private workflow: StateGraph<SOCState>;
  private threatAnalysisAgent: ThreatAnalysisAgent;
  private riskAssessmentAgent: RiskAssessmentAgent;
  private correlationAgent: CorrelationAgent;
  private decisionMakingAgent: DecisionMakingAgent;
  private responseGenerationAgent: ResponseGenerationAgent;
  private actionExecutionAgent: ActionExecutionAgent;

  constructor() {
    // Initialize agents
    this.threatAnalysisAgent = new ThreatAnalysisAgent();
    this.riskAssessmentAgent = new RiskAssessmentAgent();
    this.correlationAgent = new CorrelationAgent();
    this.decisionMakingAgent = new DecisionMakingAgent();
    this.responseGenerationAgent = new ResponseGenerationAgent();
    this.actionExecutionAgent = new ActionExecutionAgent();

    // Create the workflow
    this.workflow = new StateGraph<SOCState>({
      channels: {
        // Input data channels
        alerts: { reducer: (x, y) => y ?? x },
        threat_intelligence: { reducer: (x, y) => y ?? x },
        incidents: { reducer: (x, y) => y ?? x },
        entities: { reducer: (x, y) => y ?? x },
        
        // Context and analysis channels
        context_analysis: { reducer: (x, y) => y ?? x },
        threat_analysis: { reducer: (x, y) => y ?? x },
        risk_assessment: { reducer: (x, y) => y ?? x },
        correlations: { reducer: (x, y) => y ?? x },
        predictions: { reducer: (x, y) => y ?? x },
        
        // Decision making channels
        threat_classification: { reducer: (x, y) => y ?? x },
        risk_prioritization: { reducer: (x, y) => y ?? x },
        response_strategy: { reducer: (x, y) => y ?? x },
        resource_allocation: { reducer: (x, y) => y ?? x },
        escalation_decision: { reducer: (x, y) => y ?? x },
        
        // Response generation channels
        natural_language_response: { reducer: (x, y) => y ?? x },
        report: { reducer: (x, y) => y ?? x },
        alert_notifications: { reducer: (x, y) => y ?? x },
        recommendations: { reducer: (x, y) => y ?? x },
        playbook_suggestions: { reducer: (x, y) => y ?? x },
        
        // Action execution channels
        execution_results: { reducer: (x, y) => y ?? x },
        
        // Learning and feedback channels
        learning_feedback: { reducer: (x, y) => y ?? x },
        model_performance: { reducer: (x, y) => y ?? x },
        
        // Workflow control channels
        current_phase: { reducer: (x, y) => y ?? x },
        workflow_id: { reducer: (x, y) => y ?? x },
        request_type: { reducer: (x, y) => y ?? x },
        user_id: { reducer: (x, y) => y ?? x },
        session_id: { reducer: (x, y) => y ?? x },
        
        // Error handling channels
        errors: { reducer: (x, y) => [...(x || []), ...(y || [])] },
        warnings: { reducer: (x, y) => [...(x || []), ...(y || [])] },
        
        // Monitoring and validation channels
        confidence_scores: { reducer: (x, y) => ({ ...x, ...y }) },
        reasoning_chains: { reducer: (x, y) => ({ ...x, ...y }) },
        validation_results: { reducer: (x, y) => ({ ...x, ...y }) },
        
        // Human-in-the-loop channels
        human_input_required: { reducer: (x, y) => y ?? x },
        human_input_prompt: { reducer: (x, y) => y ?? x },
        human_input_response: { reducer: (x, y) => y ?? x },
        human_input_timestamp: { reducer: (x, y) => y ?? x },
        
        // Performance metrics channels
        start_time: { reducer: (x, y) => y ?? x },
        end_time: { reducer: (x, y) => y ?? x },
        total_duration: { reducer: (x, y) => y ?? x },
        phase_durations: { reducer: (x, y) => ({ ...x, ...y }) },
      },
    });

    this.setupWorkflow();
  }

  private setupWorkflow() {
    // Add nodes (agents)
    this.workflow.addNode('threat_analysis', this.threatAnalysisAgent.analyze.bind(this.threatAnalysisAgent));
    this.workflow.addNode('risk_assessment', this.riskAssessmentAgent.assess.bind(this.riskAssessmentAgent));
    this.workflow.addNode('correlation_analysis', this.correlationAgent.correlate.bind(this.correlationAgent));
    this.workflow.addNode('decision_making', this.decisionMakingAgent.makeDecisions.bind(this.decisionMakingAgent));
    this.workflow.addNode('response_generation', this.responseGenerationAgent.generateResponses.bind(this.responseGenerationAgent));
    this.workflow.addNode('action_execution', this.actionExecutionAgent.executeActions.bind(this.actionExecutionAgent));
    this.workflow.addNode('human_review', this.humanReviewNode.bind(this));
    this.workflow.addNode('error_handling', this.errorHandlingNode.bind(this));

    // Set entry point
    this.workflow.setEntryPoint('threat_analysis');

    // Add conditional edges
    this.workflow.addConditionalEdges(
      'threat_analysis',
      this.shouldContinueToRiskAssessment,
      {
        'risk_assessment': 'risk_assessment',
        'correlation_analysis': 'correlation_analysis',
        'decision_making': 'decision_making',
        'error_handling': 'error_handling',
        'end': END,
      }
    );

    this.workflow.addConditionalEdges(
      'risk_assessment',
      this.shouldContinueToCorrelation,
      {
        'correlation_analysis': 'correlation_analysis',
        'decision_making': 'decision_making',
        'error_handling': 'error_handling',
        'end': END,
      }
    );

    this.workflow.addConditionalEdges(
      'correlation_analysis',
      this.shouldContinueToDecisionMaking,
      {
        'decision_making': 'decision_making',
        'error_handling': 'error_handling',
        'end': END,
      }
    );

    this.workflow.addConditionalEdges(
      'decision_making',
      this.shouldContinueToResponseGeneration,
      {
        'response_generation': 'response_generation',
        'human_review': 'human_review',
        'error_handling': 'error_handling',
        'end': END,
      }
    );

    this.workflow.addConditionalEdges(
      'response_generation',
      this.shouldContinueToActionExecution,
      {
        'action_execution': 'action_execution',
        'error_handling': 'error_handling',
        'end': END,
      }
    );

    this.workflow.addConditionalEdges(
      'action_execution',
      this.shouldCompleteWorkflow,
      {
        'end': END,
        'error_handling': 'error_handling',
      }
    );

    this.workflow.addConditionalEdges(
      'human_review',
      this.shouldContinueAfterHumanReview,
      {
        'response_generation': 'response_generation',
        'action_execution': 'action_execution',
        'error_handling': 'error_handling',
        'end': END,
      }
    );

    this.workflow.addConditionalEdges(
      'error_handling',
      this.shouldRetryOrEnd,
      {
        'threat_analysis': 'threat_analysis',
        'end': END,
      }
    );
  }

  // Conditional edge functions
  private shouldContinueToRiskAssessment(state: SOCState): string {
    if (state.errors && state.errors.length > 0) {
      return 'error_handling';
    }

    if (RiskAssessmentAgent.shouldAssess(state)) {
      return 'risk_assessment';
    }

    if (CorrelationAgent.shouldCorrelate(state)) {
      return 'correlation_analysis';
    }

    if (DecisionMakingAgent.shouldMakeDecisions(state)) {
      return 'decision_making';
    }

    return 'end';
  }

  private shouldContinueToCorrelation(state: SOCState): string {
    if (state.errors && state.errors.length > 0) {
      return 'error_handling';
    }

    if (CorrelationAgent.shouldCorrelate(state)) {
      return 'correlation_analysis';
    }

    if (DecisionMakingAgent.shouldMakeDecisions(state)) {
      return 'decision_making';
    }

    return 'end';
  }

  private shouldContinueToDecisionMaking(state: SOCState): string {
    if (state.errors && state.errors.length > 0) {
      return 'error_handling';
    }

    if (DecisionMakingAgent.shouldMakeDecisions(state)) {
      return 'decision_making';
    }

    return 'end';
  }

  private shouldContinueToResponseGeneration(state: SOCState): string {
    if (state.errors && state.errors.length > 0) {
      return 'error_handling';
    }

    // Check if human review is required
    if (this.requiresHumanReview(state)) {
      return 'human_review';
    }

    if (ResponseGenerationAgent.shouldGenerateResponses(state)) {
      return 'response_generation';
    }

    return 'end';
  }

  private shouldContinueToActionExecution(state: SOCState): string {
    if (state.errors && state.errors.length > 0) {
      return 'error_handling';
    }

    if (ActionExecutionAgent.shouldExecuteActions(state)) {
      return 'action_execution';
    }

    return 'end';
  }

  private shouldCompleteWorkflow(state: SOCState): string {
    if (state.errors && state.errors.length > 0) {
      return 'error_handling';
    }

    return 'end';
  }

  private shouldContinueAfterHumanReview(state: SOCState): string {
    if (state.errors && state.errors.length > 0) {
      return 'error_handling';
    }

    if (ResponseGenerationAgent.shouldGenerateResponses(state)) {
      return 'response_generation';
    }

    if (ActionExecutionAgent.shouldExecuteActions(state)) {
      return 'action_execution';
    }

    return 'end';
  }

  private shouldRetryOrEnd(state: SOCState): string {
    // Simple retry logic - could be enhanced
    const errorCount = state.errors?.length || 0;
    if (errorCount < 3) {
      return 'threat_analysis';
    }

    return 'end';
  }

  // Helper methods
  private requiresHumanReview(state: SOCState): boolean {
    // Check if escalation is required
    if (state.escalation_decision?.should_escalate) {
      return true;
    }

    // Check if confidence is too low
    const overallConfidence = this.calculateOverallConfidence(state);
    if (overallConfidence < 0.5) {
      return true;
    }

    // Check if critical decisions need human approval
    if (state.response_strategy?.strategy_type === 'escalate') {
      return true;
    }

    return false;
  }

  private calculateOverallConfidence(state: SOCState): number {
    const scores = Object.values(state.confidence_scores || {});
    if (scores.length === 0) return 0.0;
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  // Node implementations
  private async humanReviewNode(state: SOCState): Promise<Partial<SOCState>> {
    console.log('👤 Human Review Node: Waiting for human input...');
    
    return {
      human_input_required: true,
      human_input_prompt: 'Please review the analysis results and provide feedback or approval.',
      current_phase: 'human_review',
    };
  }

  private async errorHandlingNode(state: SOCState): Promise<Partial<SOCState>> {
    console.log('⚠️ Error Handling Node: Processing errors...');
    
    return {
      current_phase: 'error',
      warnings: [...(state.warnings || []), 'Workflow encountered errors and may need manual intervention'],
    };
  }

  // Public methods
  async executeWorkflow(initialState: SOCState): Promise<SOCState> {
    console.log('🚀 Starting SOC Workflow execution...');
    
    const startTime = Date.now();
    const workflowId = `workflow_${Date.now()}`;
    
    const stateWithMetadata = {
      ...initialState,
      workflow_id: workflowId,
      start_time: new Date(startTime),
      current_phase: 'context_analysis',
      phase_durations: {},
      confidence_scores: {},
      reasoning_chains: {},
      validation_results: {},
      errors: [],
      warnings: [],
    };

    try {
      const compiledWorkflow = this.workflow.compile();
      const result = await compiledWorkflow.invoke(stateWithMetadata);
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      console.log(`✅ SOC Workflow completed in ${totalDuration}ms`);
      
      return {
        ...result,
        end_time: new Date(endTime),
        total_duration: totalDuration,
        current_phase: 'completed',
      };
    } catch (error) {
      console.error('❌ SOC Workflow execution failed:', error);
      
      return {
        ...stateWithMetadata,
        end_time: new Date(),
        total_duration: Date.now() - startTime,
        current_phase: 'error',
        errors: [...(stateWithMetadata.errors || []), `Workflow execution failed: ${error}`],
      };
    }
  }

  // Get workflow configuration
  getWorkflowConfig() {
    return {
      nodes: [
        'threat_analysis',
        'risk_assessment', 
        'correlation_analysis',
        'decision_making',
        'response_generation',
        'action_execution',
        'human_review',
        'error_handling',
      ],
      entryPoint: 'threat_analysis',
      conditionalEdges: [
        'threat_analysis -> risk_assessment/correlation_analysis/decision_making/error_handling/end',
        'risk_assessment -> correlation_analysis/decision_making/error_handling/end',
        'correlation_analysis -> decision_making/error_handling/end',
        'decision_making -> response_generation/human_review/error_handling/end',
        'response_generation -> action_execution/error_handling/end',
        'action_execution -> end/error_handling',
        'human_review -> response_generation/action_execution/error_handling/end',
        'error_handling -> threat_analysis/end',
      ],
    };
  }
}
