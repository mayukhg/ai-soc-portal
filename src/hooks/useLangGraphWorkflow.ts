/**
 * React Hook for LangGraph Workflow Integration
 * Provides easy integration of LangGraph workflows with React components
 */

import { useState, useCallback, useRef } from 'react';
import { LangGraphService } from '../lib/langgraph/langgraph-service';
import { SOCState } from '../lib/langgraph/types';
import { Alert, Incident, Entity, ThreatIntelligence } from '../lib/langgraph/types';
import { useLangSmith } from './useLangSmith';

export interface UseLangGraphWorkflowOptions {
  onWorkflowComplete?: (result: SOCState) => void;
  onWorkflowError?: (error: Error) => void;
  onPhaseChange?: (phase: string) => void;
  onHumanInputRequired?: (prompt: string) => void;
}

export interface UseLangGraphWorkflowReturn {
  // Workflow execution
  executeThreatAnalysis: (data: ThreatAnalysisData) => Promise<void>;
  executeIncidentInvestigation: (data: IncidentInvestigationData) => Promise<void>;
  executeRiskAssessment: (data: RiskAssessmentData) => Promise<void>;
  executeCorrelationAnalysis: (data: CorrelationAnalysisData) => Promise<void>;
  executeAutomatedResponse: (data: AutomatedResponseData) => Promise<void>;
  executePlaybook: (data: PlaybookData) => Promise<void>;
  
  // Workflow control
  provideHumanInput: (input: string) => void;
  cancelWorkflow: () => void;
  
  // Workflow state
  currentState: SOCState | null;
  isExecuting: boolean;
  currentPhase: string;
  progress: number;
  errors: string[];
  warnings: string[];
  
  // Workflow info
  workflowInfo: any;
  metrics: any;
}

export interface ThreatAnalysisData {
  alerts: Alert[];
  threatIntelligence: ThreatIntelligence[];
  entities: Entity[];
  incidents: Incident[];
  userId: string;
  sessionId: string;
}

export interface IncidentInvestigationData {
  incident: Incident;
  relatedAlerts: Alert[];
  threatIntelligence: ThreatIntelligence[];
  entities: Entity[];
  userId: string;
  sessionId: string;
}

export interface RiskAssessmentData {
  alerts: Alert[];
  incidents: Incident[];
  entities: Entity[];
  threatIntelligence: ThreatIntelligence[];
  userId: string;
  sessionId: string;
}

export interface CorrelationAnalysisData {
  alerts: Alert[];
  incidents: Incident[];
  entities: Entity[];
  threatIntelligence: ThreatIntelligence[];
  userId: string;
  sessionId: string;
}

export interface AutomatedResponseData {
  alerts: Alert[];
  incidents: Incident[];
  entities: Entity[];
  threatIntelligence: ThreatIntelligence[];
  userId: string;
  sessionId: string;
}

export interface PlaybookData {
  playbookId: string;
  alerts: Alert[];
  incidents: Incident[];
  entities: Entity[];
  threatIntelligence: ThreatIntelligence[];
  userId: string;
  sessionId: string;
}

export function useLangGraphWorkflow(options: UseLangGraphWorkflowOptions = {}): UseLangGraphWorkflowReturn {
  const [currentState, setCurrentState] = useState<SOCState | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('idle');
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  const serviceRef = useRef<LangGraphService | null>(null);
  const currentWorkflowRef = useRef<Promise<SOCState> | null>(null);

  // Initialize LangSmith for tracing
  const langSmith = useLangSmith();

  // Initialize service with LangSmith integration
  if (!serviceRef.current) {
    serviceRef.current = new LangGraphService();
    // Set LangSmith service if available
    if (langSmith.isEnabled) {
      // Note: We'll need to modify LangGraphService to accept LangSmith service
      // For now, we'll handle tracing in the workflow execution
    }
  }

  const service = serviceRef.current;

  // Calculate progress based on current phase
  const calculateProgress = (phase: string): number => {
    const phaseOrder = [
      'context_analysis',
      'reasoning',
      'decision_making',
      'response_generation',
      'action_execution',
      'learning',
      'completed',
    ];
    
    const phaseIndex = phaseOrder.indexOf(phase);
    return phaseIndex >= 0 ? (phaseIndex / (phaseOrder.length - 1)) * 100 : 0;
  };

  // Execute workflow with common logic and LangSmith tracing
  const executeWorkflow = useCallback(async (
    workflowFunction: () => Promise<SOCState>,
    workflowType: 'threat_analysis' | 'incident_response' | 'risk_assessment' | 'correlation_analysis',
    data: any
  ) => {
    if (isExecuting) {
      console.warn('Workflow already executing');
      return;
    }

    setIsExecuting(true);
    setCurrentPhase('starting');
    setProgress(0);
    setErrors([]);
    setWarnings([]);

    let traceId: string | null = null;

    try {
      // Start LangSmith trace if enabled
      if (langSmith.isEnabled) {
        traceId = await langSmith.startWorkflowTrace(workflowType, {
          userId: data.userId,
          sessionId: data.sessionId,
          severity: data.severity || 'medium',
          tags: [workflowType, 'langgraph'],
          customAttributes: {
            alertCount: data.alerts?.length || 0,
            incidentCount: data.incidents?.length || 0,
            entityCount: data.entities?.length || 0,
          }
        });
      }

      // Start phase trace
      if (traceId) {
        await langSmith.startPhaseTrace('workflow_execution', 'langgraph-service');
      }

      const result = await workflowFunction();
      
      setCurrentState(result);
      setCurrentPhase(result.current_phase);
      setProgress(calculateProgress(result.current_phase));
      setErrors(result.errors || []);
      setWarnings(result.warnings || []);
      
      // Complete phase trace
      if (traceId) {
        await langSmith.completePhaseTrace('workflow_execution', {
          latencyMs: result.end_time ? result.end_time.getTime() - result.start_time.getTime() : 0,
          inputTokens: result.total_input_tokens || 0,
          outputTokens: result.total_output_tokens || 0,
        });
      }
      
      // Handle phase changes
      if (options.onPhaseChange) {
        options.onPhaseChange(result.current_phase);
      }
      
      // Handle human input requirement
      if (result.human_input_required && options.onHumanInputRequired) {
        options.onHumanInputRequired(result.human_input_prompt || 'Human input required');
      }
      
      // Handle workflow completion
      if (result.current_phase === 'completed' && options.onWorkflowComplete) {
        options.onWorkflowComplete(result);
      }

      // Complete LangSmith trace
      if (traceId) {
        await langSmith.completeWorkflowTrace('completed', {
          latencyMs: result.end_time ? result.end_time.getTime() - result.start_time.getTime() : 0,
          tokenCount: (result.total_input_tokens || 0) + (result.total_output_tokens || 0),
          costEstimate: result.total_cost || 0,
          successRate: result.errors?.length === 0 ? 1 : 0,
        });
      }
      
    } catch (error) {
      console.error('Workflow execution error:', error);
      setErrors([error instanceof Error ? error.message : 'Unknown error']);
      
      // Complete LangSmith trace with error
      if (traceId) {
        await langSmith.completeWorkflowTrace('failed', {
          errorRate: 1,
          successRate: 0,
        });
      }
      
      if (options.onWorkflowError) {
        options.onWorkflowError(error instanceof Error ? error : new Error('Unknown error'));
      }
    } finally {
      setIsExecuting(false);
      currentWorkflowRef.current = null;
    }
  }, [isExecuting, options, langSmith]);

  // Workflow execution methods
  const executeThreatAnalysis = useCallback(async (data: ThreatAnalysisData) => {
    currentWorkflowRef.current = service.analyzeThreats(data);
    await executeWorkflow(
      () => currentWorkflowRef.current!,
      'threat_analysis',
      data
    );
  }, [service, executeWorkflow]);

  const executeIncidentInvestigation = useCallback(async (data: IncidentInvestigationData) => {
    currentWorkflowRef.current = service.investigateIncident(data);
    await executeWorkflow(
      () => currentWorkflowRef.current!,
      'incident_response',
      data
    );
  }, [service, executeWorkflow]);

  const executeRiskAssessment = useCallback(async (data: RiskAssessmentData) => {
    currentWorkflowRef.current = service.assessRisk(data);
    await executeWorkflow(
      () => currentWorkflowRef.current!,
      'risk_assessment',
      data
    );
  }, [service, executeWorkflow]);

  const executeCorrelationAnalysis = useCallback(async (data: CorrelationAnalysisData) => {
    currentWorkflowRef.current = service.analyzeCorrelations(data);
    await executeWorkflow(
      () => currentWorkflowRef.current!,
      'correlation_analysis',
      data
    );
  }, [service, executeWorkflow]);

  const executeAutomatedResponse = useCallback(async (data: AutomatedResponseData) => {
    currentWorkflowRef.current = service.executeAutomatedResponse(data);
    await executeWorkflow(
      () => currentWorkflowRef.current!,
      'incident_response',
      data
    );
  }, [service, executeWorkflow]);

  const executePlaybook = useCallback(async (data: PlaybookData) => {
    currentWorkflowRef.current = service.executePlaybook(data);
    await executeWorkflow(
      () => currentWorkflowRef.current!,
      'incident_response',
      data
    );
  }, [service, executeWorkflow]);

  // Workflow control methods
  const provideHumanInput = useCallback((input: string) => {
    if (currentState && currentState.human_input_required) {
      // Update the current state with human input
      const updatedState = {
        ...currentState,
        human_input_response: input,
        human_input_timestamp: new Date(),
        human_input_required: false,
      };
      
      setCurrentState(updatedState);
      
      // Continue workflow execution if possible
      if (currentWorkflowRef.current) {
        // Note: In a real implementation, you would need to resume the workflow
        // with the human input. This would require additional infrastructure.
        console.log('Human input provided:', input);
      }
    }
  }, [currentState]);

  const cancelWorkflow = useCallback(() => {
    if (isExecuting) {
      setIsExecuting(false);
      setCurrentPhase('cancelled');
      setProgress(0);
      currentWorkflowRef.current = null;
      
      if (currentState) {
        setCurrentState({
          ...currentState,
          current_phase: 'cancelled',
          end_time: new Date(),
        });
      }
    }
  }, [isExecuting, currentState]);

  // Get workflow info and metrics
  const workflowInfo = service.getWorkflowInfo();
  const metrics = currentState ? service.getWorkflowMetrics(currentState) : null;

  return {
    // Workflow execution
    executeThreatAnalysis,
    executeIncidentInvestigation,
    executeRiskAssessment,
    executeCorrelationAnalysis,
    executeAutomatedResponse,
    executePlaybook,
    
    // Workflow control
    provideHumanInput,
    cancelWorkflow,
    
    // Workflow state
    currentState,
    isExecuting,
    currentPhase,
    progress,
    errors,
    warnings,
    
    // Workflow info
    workflowInfo,
    metrics,
  };
}
