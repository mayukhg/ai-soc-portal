/**
 * Orchestrator Agent
 * 
 * The Orchestrator Agent serves as the central coordinator for all agents in the
 * SOC Nexus system. It manages agent communication, workflow orchestration,
 * and system-wide state management.
 */

import { BaseAgent } from './BaseAgent';
import { 
  AgentType, 
  AgentCapability, 
  AgentMessage, 
  MessageType, 
  MessagePriority,
  AgentTask,
  TaskStatus,
  WorkflowData,
  WorkflowStatus,
  WorkflowStep,
  StepStatus,
  SystemState,
  LogLevel
} from '../types/agent';

export class OrchestratorAgent extends BaseAgent {
  private agents: Map<string, any>; // Map of agent instances
  private workflows: Map<string, WorkflowData>;
  private systemState: SystemState;
  private messageRouter: Map<string, string>; // Maps message types to agent IDs

  constructor() {
    const capabilities: AgentCapability[] = [
      {
        name: 'route_message',
        description: 'Route messages to appropriate agents',
        parameters: { messageType: 'string', recipient: 'string' },
        returnType: 'boolean'
      },
      {
        name: 'create_workflow',
        description: 'Create and manage multi-agent workflows',
        parameters: { name: 'string', steps: 'array' },
        returnType: 'string'
      },
      {
        name: 'monitor_system',
        description: 'Monitor overall system health and performance',
        parameters: {},
        returnType: 'object'
      },
      {
        name: 'coordinate_response',
        description: 'Coordinate incident response across multiple agents',
        parameters: { incidentId: 'string', responseType: 'string' },
        returnType: 'object'
      }
    ];

    super('orchestrator', 'Orchestrator Agent', AgentType.ORCHESTRATOR, capabilities);

    this.agents = new Map();
    this.workflows = new Map();
    this.messageRouter = new Map();
    this.systemState = {
      agents: new Map(),
      incidents: new Map(),
      threats: new Map(),
      workflows: new Map(),
      systemHealth: {
        overall: 'healthy',
        agents: new Map(),
        services: new Map(),
        lastCheck: new Date()
      },
      configuration: {
        maxAgents: 50,
        messageTimeout: 30000,
        heartbeatInterval: 5000,
        logRetention: 30,
        backupInterval: 3600,
        securitySettings: {
          encryptionEnabled: true,
          authenticationRequired: true,
          auditLogging: true,
          rateLimiting: true,
          maxRetries: 3
        }
      }
    };

    this.registerOrchestratorHandlers();
  }

  /**
   * Register an agent with the orchestrator
   */
  public registerAgent(agentId: string, agent: any): void {
    this.agents.set(agentId, agent);
    this.log(LogLevel.INFO, `Agent registered: ${agentId}`);
    
    // Update system state
    this.systemState.agents.set(agentId, agent.getState());
    
    // Emit agent registered event
    this.emitEvent('agent_registered', { agentId, agent: agent.getIdentity() });
  }

  /**
   * Unregister an agent from the orchestrator
   */
  public unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.systemState.agents.delete(agentId);
    this.log(LogLevel.INFO, `Agent unregistered: ${agentId}`);
    
    // Emit agent unregistered event
    this.emitEvent('agent_unregistered', { agentId });
  }

  /**
   * Route a message to the appropriate agent
   */
  public async routeMessage(message: AgentMessage): Promise<void> {
    const targetAgent = this.messageRouter.get(message.type) || 
                       this.findAgentByCapability(message.payload.action);
    
    if (targetAgent && this.agents.has(targetAgent)) {
      const agent = this.agents.get(targetAgent);
      await agent.processMessage(message);
      this.log(LogLevel.DEBUG, `Message routed to ${targetAgent}`);
    } else {
      this.log(LogLevel.WARN, `No agent found to handle message type: ${message.type}`);
      // Broadcast to all agents as fallback
      await this.broadcastMessage(message);
    }
  }

  /**
   * Create a new workflow
   */
  public async createWorkflow(name: string, description: string, steps: WorkflowStep[]): Promise<string> {
    const workflowId = this.generateId();
    const workflow: WorkflowData = {
      id: workflowId,
      name,
      description,
      steps,
      status: WorkflowStatus.PENDING,
      context: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workflows.set(workflowId, workflow);
    this.systemState.workflows.set(workflowId, workflow);
    
    this.log(LogLevel.INFO, `Workflow created: ${name} (${workflowId})`);
    return workflowId;
  }

  /**
   * Execute a workflow
   */
  public async executeWorkflow(workflowId: string, context: Record<string, any> = {}): Promise<any> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    this.log(LogLevel.INFO, `Executing workflow: ${workflow.name}`);
    
    // Update workflow status
    workflow.status = WorkflowStatus.RUNNING;
    workflow.context = { ...workflow.context, ...context };
    workflow.updatedAt = new Date();

    const results: any[] = [];

    try {
      // Execute steps sequentially
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        workflow.currentStep = i;
        
        this.log(LogLevel.INFO, `Executing step ${i + 1}/${workflow.steps.length}: ${step.name}`);
        
        // Check dependencies
        if (step.dependencies) {
          const dependenciesMet = step.dependencies.every(dep => 
            results.some(r => r.stepId === dep && r.status === 'completed')
          );
          
          if (!dependenciesMet) {
            step.status = StepStatus.SKIPPED;
            this.log(LogLevel.WARN, `Step ${step.name} skipped due to unmet dependencies`);
            continue;
          }
        }

        // Execute step
        step.status = StepStatus.RUNNING;
        const result = await this.executeWorkflowStep(step, workflow.context);
        
        step.status = StepStatus.COMPLETED;
        results.push({
          stepId: step.id,
          name: step.name,
          status: 'completed',
          result
        });
      }

      // Mark workflow as completed
      workflow.status = WorkflowStatus.COMPLETED;
      workflow.updatedAt = new Date();
      
      this.log(LogLevel.INFO, `Workflow completed: ${workflow.name}`);
      return results;
    } catch (error) {
      this.log(LogLevel.ERROR, `Workflow failed: ${workflow.name} - ${error}`);
      
      // Mark workflow as failed
      workflow.status = WorkflowStatus.FAILED;
      workflow.updatedAt = new Date();
      
      throw error;
    }
  }

  /**
   * Get system health status
   */
  public async getSystemHealth(): Promise<any> {
    const health = {
      overall: 'healthy',
      agents: new Map(),
      services: new Map(),
      timestamp: new Date()
    };

    // Check agent health
    for (const [agentId, agent] of this.agents) {
      try {
        const agentState = agent.getState();
        const isHealthy = agentState.identity.status === 'active' && 
                         agentState.performance.uptime > 0;
        
        health.agents.set(agentId, isHealthy ? 'healthy' : 'unhealthy');
        
        if (!isHealthy) {
          health.overall = 'degraded';
        }
      } catch (error) {
        health.agents.set(agentId, 'unhealthy');
        health.overall = 'degraded';
      }
    }

    // Update system state
    this.systemState.systemHealth = health;
    
    return health;
  }

  /**
   * Coordinate incident response across multiple agents
   */
  public async coordinateIncidentResponse(incidentId: string, responseType: string): Promise<any> {
    this.log(LogLevel.INFO, `Coordinating response for incident: ${incidentId}`);
    
    const workflowSteps: WorkflowStep[] = [
      {
        id: 'analysis',
        name: 'Incident Analysis',
        agent: 'incident_analysis',
        action: 'analyze_incident',
        parameters: { incidentId },
        status: StepStatus.PENDING
      },
      {
        id: 'threat_assessment',
        name: 'Threat Assessment',
        agent: 'threat_detection',
        action: 'assess_threat',
        parameters: { incidentId },
        status: StepStatus.PENDING,
        dependencies: ['analysis']
      },
      {
        id: 'response_planning',
        name: 'Response Planning',
        agent: 'response_planning',
        action: 'plan_response',
        parameters: { incidentId, responseType },
        status: StepStatus.PENDING,
        dependencies: ['threat_assessment']
      },
      {
        id: 'communication',
        name: 'Communication',
        agent: 'communication',
        action: 'notify_stakeholders',
        parameters: { incidentId },
        status: StepStatus.PENDING,
        dependencies: ['response_planning']
      }
    ];

    const workflowId = await this.createWorkflow(
      `Incident Response - ${incidentId}`,
      `Automated response workflow for incident ${incidentId}`,
      workflowSteps
    );

    return await this.executeWorkflow(workflowId, { incidentId, responseType });
  }

  /**
   * Broadcast a message to all registered agents
   */
  public async broadcastMessage(message: AgentMessage): Promise<void> {
    this.log(LogLevel.INFO, `Broadcasting message to ${this.agents.size} agents`);
    
    const promises = Array.from(this.agents.values()).map(agent =>
      agent.processMessage(message)
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Find an agent by capability
   */
  private findAgentByCapability(capability: string): string | undefined {
    for (const [agentId, agent] of this.agents) {
      const capabilities = agent.getIdentity().capabilities;
      if (capabilities.some(cap => cap.name === capability)) {
        return agentId;
      }
    }
    return undefined;
  }

  /**
   * Execute a single workflow step
   */
  private async executeWorkflowStep(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    const agent = this.agents.get(step.agent);
    if (!agent) {
      throw new Error(`Agent not found: ${step.agent}`);
    }

    const task: AgentTask = {
      id: this.generateId(),
      type: step.action,
      description: step.name,
      parameters: { ...step.parameters, ...context },
      status: TaskStatus.PENDING,
      startTime: new Date()
    };

    return await agent.executeTask(task);
  }

  /**
   * Register orchestrator-specific message and task handlers
   */
  private registerOrchestratorHandlers(): void {
    // Message handlers
    this.registerMessageHandler('register_agent', async (message) => {
      const { agentId, agentType } = message.payload;
      this.messageRouter.set(agentType, agentId);
      return { success: true, agentId };
    });

    this.registerMessageHandler('get_system_status', async () => {
      return {
        agents: this.agents.size,
        workflows: this.workflows.size,
        systemHealth: await this.getSystemHealth()
      };
    });

    this.registerMessageHandler('create_workflow', async (message) => {
      const { name, description, steps } = message.payload;
      const workflowId = await this.createWorkflow(name, description, steps);
      return { workflowId };
    });

    this.registerMessageHandler('execute_workflow', async (message) => {
      const { workflowId, context } = message.payload;
      return await this.executeWorkflow(workflowId, context);
    });

    // Task handlers
    this.registerTaskHandler('system_monitoring', async () => {
      return await this.getSystemHealth();
    });

    this.registerTaskHandler('workflow_management', async (task) => {
      const { action, workflowId, ...params } = task.parameters;
      
      switch (action) {
        case 'create':
          return await this.createWorkflow(params.name, params.description, params.steps);
        case 'execute':
          return await this.executeWorkflow(workflowId, params.context);
        case 'list':
          return Array.from(this.workflows.values()).map(w => ({
            id: w.id,
            name: w.name,
            status: w.status,
            createdAt: w.createdAt
          }));
        default:
          throw new Error(`Unknown workflow action: ${action}`);
      }
    });
  }

  /**
   * Agent startup logic
   */
  protected async onStart(): Promise<void> {
    this.log(LogLevel.INFO, 'Initializing orchestrator agent');
    
    // Start system monitoring
    setInterval(async () => {
      await this.getSystemHealth();
    }, 30000); // Every 30 seconds
    
    this.log(LogLevel.INFO, 'Orchestrator agent initialized');
  }

  /**
   * Agent shutdown logic
   */
  protected async onStop(): Promise<void> {
    this.log(LogLevel.INFO, 'Shutting down orchestrator agent');
    
    // Stop all registered agents
    for (const [agentId, agent] of this.agents) {
      try {
        await agent.stop();
      } catch (error) {
        this.log(LogLevel.ERROR, `Failed to stop agent ${agentId}: ${error}`);
      }
    }
    
    this.log(LogLevel.INFO, 'Orchestrator agent shutdown complete');
  }
}
