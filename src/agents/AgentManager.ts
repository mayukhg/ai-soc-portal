/**
 * Agent Manager
 * 
 * The Agent Manager is responsible for initializing, managing, and coordinating
 * all agents in the SOC Nexus system. It provides a centralized interface
 * for agent lifecycle management and communication.
 */

import { OrchestratorAgent } from './OrchestratorAgent';
import { ThreatDetectionAgent } from './ThreatDetectionAgent';
import { 
  AgentType, 
  AgentConfig, 
  SystemConfig, 
  AgentMessage, 
  MessageType,
  LogLevel,
  SystemState
} from '../types/agent';

export class AgentManager {
  private orchestrator: OrchestratorAgent;
  private agents: Map<string, any>;
  private systemConfig: SystemConfig;
  private isInitialized: boolean;
  private messageQueue: AgentMessage[];

  constructor() {
    this.orchestrator = new OrchestratorAgent();
    this.agents = new Map();
    this.systemConfig = this.getDefaultConfig();
    this.isInitialized = false;
    this.messageQueue = [];
  }

  /**
   * Initialize the agent system
   */
  public async initialize(config?: Partial<SystemConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn('Agent system already initialized');
      return;
    }

    try {
      console.log('Initializing SOC Nexus Agent System...');

      // Update configuration if provided
      if (config) {
        this.systemConfig = { ...this.systemConfig, ...config };
      }

      // Start orchestrator agent
      await this.orchestrator.start();
      this.agents.set('orchestrator', this.orchestrator);

      // Initialize and start all configured agents
      await this.initializeAgents();

      // Register all agents with the orchestrator
      await this.registerAgentsWithOrchestrator();

      // Start message processing
      this.startMessageProcessing();

      this.isInitialized = true;
      console.log('SOC Nexus Agent System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize agent system:', error);
      throw error;
    }
  }

  /**
   * Shutdown the agent system
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      console.warn('Agent system not initialized');
      return;
    }

    try {
      console.log('Shutting down SOC Nexus Agent System...');

      // Stop all agents
      for (const [agentId, agent] of this.agents) {
        try {
          await agent.stop();
          console.log(`Agent stopped: ${agentId}`);
        } catch (error) {
          console.error(`Failed to stop agent ${agentId}:`, error);
        }
      }

      // Clear agent registry
      this.agents.clear();

      this.isInitialized = false;
      console.log('SOC Nexus Agent System shutdown complete');
    } catch (error) {
      console.error('Error during agent system shutdown:', error);
      throw error;
    }
  }

  /**
   * Get system status
   */
  public getSystemStatus(): any {
    const status: any = {
      initialized: this.isInitialized,
      agents: {},
      orchestrator: this.orchestrator.getState(),
      config: this.systemConfig
    };

    // Get status for each agent
    for (const [agentId, agent] of this.agents) {
      status.agents[agentId] = {
        identity: agent.getIdentity(),
        status: agent.getState().identity.status,
        uptime: agent.getState().performance.uptime
      };
    }

    return status;
  }

  /**
   * Send a message to a specific agent
   */
  public async sendMessage(
    recipient: string,
    type: MessageType,
    payload: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Agent system not initialized');
    }

    const agent = this.agents.get(recipient);
    if (!agent) {
      throw new Error(`Agent not found: ${recipient}`);
    }

    return await agent.sendMessage(recipient, type, payload, priority);
  }

  /**
   * Broadcast a message to all agents
   */
  public async broadcastMessage(
    type: MessageType,
    payload: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Agent system not initialized');
    }

    await this.orchestrator.broadcastMessage({
      id: this.generateId(),
      timestamp: new Date(),
      sender: 'agent_manager',
      recipient: 'broadcast',
      type,
      payload,
      priority
    });
  }

  /**
   * Execute a workflow
   */
  public async executeWorkflow(
    name: string,
    description: string,
    steps: any[],
    context: Record<string, any> = {}
  ): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Agent system not initialized');
    }

    const workflowId = await this.orchestrator.createWorkflow(name, description, steps);
    return await this.orchestrator.executeWorkflow(workflowId, context);
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: string): any {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  public getAllAgents(): Map<string, any> {
    return new Map(this.agents);
  }

  /**
   * Update system configuration
   */
  public updateConfig(config: Partial<SystemConfig>): void {
    this.systemConfig = { ...this.systemConfig, ...config };
    console.log('System configuration updated');
  }

  /**
   * Initialize all configured agents
   */
  private async initializeAgents(): Promise<void> {
    for (const agentConfig of this.systemConfig.agents) {
      if (agentConfig.enabled) {
        try {
          await this.initializeAgent(agentConfig);
        } catch (error) {
          console.error(`Failed to initialize agent ${agentConfig.id}:`, error);
        }
      }
    }
  }

  /**
   * Initialize a specific agent
   */
  private async initializeAgent(config: AgentConfig): Promise<void> {
    console.log(`Initializing agent: ${config.name} (${config.type})`);

    let agent: any;

    // Create agent based on type
    switch (config.type) {
      case AgentType.THREAT_DETECTION:
        agent = new ThreatDetectionAgent();
        break;
      case AgentType.INCIDENT_ANALYSIS:
        agent = this.createIncidentAnalysisAgent();
        break;
      case AgentType.RESPONSE_PLANNING:
        agent = this.createResponsePlanningAgent();
        break;
      case AgentType.INTELLIGENCE_GATHERING:
        agent = this.createIntelligenceGatheringAgent();
        break;
      case AgentType.COMMUNICATION:
        agent = this.createCommunicationAgent();
        break;
      case AgentType.MONITORING:
        agent = this.createMonitoringAgent();
        break;
      default:
        throw new Error(`Unknown agent type: ${config.type}`);
    }

    // Apply configuration
    if (config.settings) {
      agent.updateConfiguration(config.settings);
    }

    // Start agent
    await agent.start();

    // Register agent
    this.agents.set(config.id, agent);

    console.log(`Agent initialized: ${config.name}`);
  }

  /**
   * Register all agents with the orchestrator
   */
  private async registerAgentsWithOrchestrator(): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      if (agentId !== 'orchestrator') {
        this.orchestrator.registerAgent(agentId, agent);
      }
    }
  }

  /**
   * Start message processing loop
   */
  private startMessageProcessing(): void {
    setInterval(() => {
      if (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          this.processMessage(message);
        }
      }
    }, 100);
  }

  /**
   * Process incoming messages
   */
  private async processMessage(message: AgentMessage): Promise<void> {
    try {
      const agent = this.agents.get(message.recipient);
      if (agent) {
        await agent.processMessage(message);
      } else {
        console.warn(`No agent found for message recipient: ${message.recipient}`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  /**
   * Create Incident Analysis Agent
   */
  private createIncidentAnalysisAgent(): any {
    // Placeholder - would be implemented as a separate class
    return {
      getIdentity: () => ({ id: 'incident_analysis', name: 'Incident Analysis Agent', type: AgentType.INCIDENT_ANALYSIS }),
      getState: () => ({ identity: { status: 'active' }, performance: { uptime: 0 } }),
      start: async () => console.log('Incident Analysis Agent started'),
      stop: async () => console.log('Incident Analysis Agent stopped'),
      processMessage: async (msg: any) => console.log('Incident Analysis Agent processing message'),
      sendMessage: async (recipient: string, type: any, payload: any, priority: any) => 'msg-id',
      updateConfiguration: (config: any) => console.log('Configuration updated')
    };
  }

  /**
   * Create Response Planning Agent
   */
  private createResponsePlanningAgent(): any {
    // Placeholder - would be implemented as a separate class
    return {
      getIdentity: () => ({ id: 'response_planning', name: 'Response Planning Agent', type: AgentType.RESPONSE_PLANNING }),
      getState: () => ({ identity: { status: 'active' }, performance: { uptime: 0 } }),
      start: async () => console.log('Response Planning Agent started'),
      stop: async () => console.log('Response Planning Agent stopped'),
      processMessage: async (msg: any) => console.log('Response Planning Agent processing message'),
      sendMessage: async (recipient: string, type: any, payload: any, priority: any) => 'msg-id',
      updateConfiguration: (config: any) => console.log('Configuration updated')
    };
  }

  /**
   * Create Intelligence Gathering Agent
   */
  private createIntelligenceGatheringAgent(): any {
    // Placeholder - would be implemented as a separate class
    return {
      getIdentity: () => ({ id: 'intelligence_gathering', name: 'Intelligence Gathering Agent', type: AgentType.INTELLIGENCE_GATHERING }),
      getState: () => ({ identity: { status: 'active' }, performance: { uptime: 0 } }),
      start: async () => console.log('Intelligence Gathering Agent started'),
      stop: async () => console.log('Intelligence Gathering Agent stopped'),
      processMessage: async (msg: any) => console.log('Intelligence Gathering Agent processing message'),
      sendMessage: async (recipient: string, type: any, payload: any, priority: any) => 'msg-id',
      updateConfiguration: (config: any) => console.log('Configuration updated')
    };
  }

  /**
   * Create Communication Agent
   */
  private createCommunicationAgent(): any {
    // Placeholder - would be implemented as a separate class
    return {
      getIdentity: () => ({ id: 'communication', name: 'Communication Agent', type: AgentType.COMMUNICATION }),
      getState: () => ({ identity: { status: 'active' }, performance: { uptime: 0 } }),
      start: async () => console.log('Communication Agent started'),
      stop: async () => console.log('Communication Agent stopped'),
      processMessage: async (msg: any) => console.log('Communication Agent processing message'),
      sendMessage: async (recipient: string, type: any, payload: any, priority: any) => 'msg-id',
      updateConfiguration: (config: any) => console.log('Configuration updated')
    };
  }

  /**
   * Create Monitoring Agent
   */
  private createMonitoringAgent(): any {
    // Placeholder - would be implemented as a separate class
    return {
      getIdentity: () => ({ id: 'monitoring', name: 'Monitoring Agent', type: AgentType.MONITORING }),
      getState: () => ({ identity: { status: 'active' }, performance: { uptime: 0 } }),
      start: async () => console.log('Monitoring Agent started'),
      stop: async () => console.log('Monitoring Agent stopped'),
      processMessage: async (msg: any) => console.log('Monitoring Agent processing message'),
      sendMessage: async (recipient: string, type: any, payload: any, priority: any) => 'msg-id',
      updateConfiguration: (config: any) => console.log('Configuration updated')
    };
  }

  /**
   * Get default system configuration
   */
  private getDefaultConfig(): SystemConfig {
    return {
      agents: [
        {
          id: 'threat_detection',
          type: AgentType.THREAT_DETECTION,
          name: 'Threat Detection Agent',
          description: 'Detects and analyzes security threats',
          enabled: true,
          settings: {
            logLevel: LogLevel.INFO,
            maxConcurrentTasks: 10
          }
        },
        {
          id: 'incident_analysis',
          type: AgentType.INCIDENT_ANALYSIS,
          name: 'Incident Analysis Agent',
          description: 'Analyzes security incidents',
          enabled: true,
          settings: {
            logLevel: LogLevel.INFO,
            maxConcurrentTasks: 5
          }
        },
        {
          id: 'response_planning',
          type: AgentType.RESPONSE_PLANNING,
          name: 'Response Planning Agent',
          description: 'Plans and executes incident responses',
          enabled: true,
          settings: {
            logLevel: LogLevel.INFO,
            maxConcurrentTasks: 3
          }
        },
        {
          id: 'intelligence_gathering',
          type: AgentType.INTELLIGENCE_GATHERING,
          name: 'Intelligence Gathering Agent',
          description: 'Gathers threat intelligence',
          enabled: true,
          settings: {
            logLevel: LogLevel.INFO,
            maxConcurrentTasks: 5
          }
        },
        {
          id: 'communication',
          type: AgentType.COMMUNICATION,
          name: 'Communication Agent',
          description: 'Handles external communications',
          enabled: true,
          settings: {
            logLevel: LogLevel.INFO,
            maxConcurrentTasks: 8
          }
        },
        {
          id: 'monitoring',
          type: AgentType.MONITORING,
          name: 'Monitoring Agent',
          description: 'Monitors system health and performance',
          enabled: true,
          settings: {
            logLevel: LogLevel.INFO,
            maxConcurrentTasks: 5
          }
        }
      ],
      workflows: {},
      security: {
        encryptionEnabled: true,
        authenticationRequired: true,
        auditLogging: true,
        rateLimiting: true,
        maxRetries: 3
      },
      monitoring: {
        healthCheckInterval: 30000,
        metricsRetention: 30,
        alertThresholds: {
          cpu: 80,
          memory: 85,
          disk: 90
        }
      },
      integrations: {
        threatIntelligence: {
          enabled: true,
          providers: ['virustotal', 'abuseipdb', 'alienvault']
        },
        notification: {
          enabled: true,
          channels: ['email', 'slack', 'teams']
        }
      }
    };
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `agent-manager-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
