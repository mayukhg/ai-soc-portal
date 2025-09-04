/**
 * Base Agent Class
 * 
 * This class provides the foundation for all agents in the SOC Nexus system.
 * It handles common functionality like message passing, state management,
 * task processing, and lifecycle management.
 */

import { 
  AgentIdentity, 
  AgentType, 
  AgentStatus, 
  AgentState, 
  AgentMessage, 
  MessageType, 
  MessagePriority, 
  AgentTask, 
  TaskStatus,
  AgentCapability,
  MessageHandler,
  TaskHandler,
  EventHandler,
  AgentEvent,
  LogLevel
} from '../types/agent';

export abstract class BaseAgent {
  protected state: AgentState;
  protected messageHandlers: Map<string, MessageHandler>;
  protected taskHandlers: Map<string, TaskHandler>;
  protected eventHandlers: Map<string, EventHandler>;
  protected messageQueue: AgentMessage[];
  protected isRunning: boolean;
  protected heartbeatInterval?: NodeJS.Timeout;

  constructor(
    id: string,
    name: string,
    type: AgentType,
    capabilities: AgentCapability[] = []
  ) {
    // Initialize agent identity
    const identity: AgentIdentity = {
      id,
      name,
      type,
      version: '1.0.0',
      capabilities,
      status: AgentStatus.INACTIVE,
      lastHeartbeat: new Date()
    };

    // Initialize agent state
    this.state = {
      identity,
      messageQueue: [],
      performance: {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        uptime: 0,
        lastMetricsUpdate: new Date()
      },
      configuration: {
        maxConcurrentTasks: 5,
        messageTimeout: 30000, // 30 seconds
        retryAttempts: 3,
        logLevel: LogLevel.INFO,
        features: {}
      }
    };

    // Initialize handlers
    this.messageHandlers = new Map();
    this.taskHandlers = new Map();
    this.eventHandlers = new Map();
    this.messageQueue = [];
    this.isRunning = false;

    // Register default handlers
    this.registerDefaultHandlers();
  }

  /**
   * Start the agent and begin processing messages and tasks
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.log(LogLevel.WARN, 'Agent is already running');
      return;
    }

    try {
      this.log(LogLevel.INFO, `Starting agent: ${this.state.identity.name}`);
      
      // Update agent status
      this.state.identity.status = AgentStatus.ACTIVE;
      this.isRunning = true;

      // Initialize agent-specific resources
      await this.onStart();

      // Start heartbeat
      this.startHeartbeat();

      // Start message processing
      this.startMessageProcessing();

      this.log(LogLevel.INFO, `Agent started successfully: ${this.state.identity.name}`);
    } catch (error) {
      this.log(LogLevel.ERROR, `Failed to start agent: ${error}`);
      this.state.identity.status = AgentStatus.ERROR;
      throw error;
    }
  }

  /**
   * Stop the agent and clean up resources
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      this.log(LogLevel.WARN, 'Agent is not running');
      return;
    }

    try {
      this.log(LogLevel.INFO, `Stopping agent: ${this.state.identity.name}`);
      
      // Update agent status
      this.state.identity.status = AgentStatus.INACTIVE;
      this.isRunning = false;

      // Stop heartbeat
      this.stopHeartbeat();

      // Clean up agent-specific resources
      await this.onStop();

      this.log(LogLevel.INFO, `Agent stopped successfully: ${this.state.identity.name}`);
    } catch (error) {
      this.log(LogLevel.ERROR, `Failed to stop agent: ${error}`);
      throw error;
    }
  }

  /**
   * Send a message to another agent
   */
  public async sendMessage(
    recipient: string,
    type: MessageType,
    payload: any,
    priority: MessagePriority = MessagePriority.MEDIUM,
    context?: any
  ): Promise<string> {
    const message: AgentMessage = {
      id: this.generateId(),
      timestamp: new Date(),
      sender: this.state.identity.id,
      recipient,
      type,
      payload,
      priority,
      context
    };

    this.log(LogLevel.DEBUG, `Sending message to ${recipient}: ${type}`);
    
    // Emit message event
    await this.emitEvent('message_sent', {
      message,
      recipient
    });

    return message.id;
  }

  /**
   * Process an incoming message
   */
  public async processMessage(message: AgentMessage): Promise<void> {
    if (!this.isRunning) {
      this.log(LogLevel.WARN, 'Cannot process message: agent is not running');
      return;
    }

    try {
      this.log(LogLevel.DEBUG, `Processing message: ${message.type} from ${message.sender}`);

      // Add to message queue
      this.messageQueue.push(message);

      // Emit message received event
      await this.emitEvent('message_received', { message });

      // Process message based on type
      switch (message.type) {
        case MessageType.REQUEST:
          await this.handleRequest(message);
          break;
        case MessageType.NOTIFICATION:
          await this.handleNotification(message);
          break;
        case MessageType.HEARTBEAT:
          await this.handleHeartbeat(message);
          break;
        default:
          this.log(LogLevel.WARN, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.log(LogLevel.ERROR, `Error processing message: ${error}`);
      await this.emitEvent('message_error', { message, error });
    }
  }

  /**
   * Execute a task
   */
  public async executeTask(task: AgentTask): Promise<any> {
    if (!this.isRunning) {
      throw new Error('Agent is not running');
    }

    try {
      this.log(LogLevel.INFO, `Executing task: ${task.type}`);

      // Update task status
      task.status = TaskStatus.RUNNING;
      task.startTime = new Date();

      // Store current task
      this.state.currentTask = task;

      // Emit task started event
      await this.emitEvent('task_started', { task });

      // Execute task
      const handler = this.taskHandlers.get(task.type);
      if (!handler) {
        throw new Error(`No handler registered for task type: ${task.type}`);
      }

      const result = await handler(task);

      // Update task status
      task.status = TaskStatus.COMPLETED;
      task.progress = 100;

      // Clear current task
      this.state.currentTask = undefined;

      // Emit task completed event
      await this.emitEvent('task_completed', { task, result });

      this.log(LogLevel.INFO, `Task completed: ${task.type}`);
      return result;
    } catch (error) {
      this.log(LogLevel.ERROR, `Task failed: ${task.type} - ${error}`);
      
      // Update task status
      task.status = TaskStatus.FAILED;
      this.state.currentTask = undefined;

      // Emit task failed event
      await this.emitEvent('task_failed', { task, error });
      
      throw error;
    }
  }

  /**
   * Register a message handler
   */
  public registerMessageHandler(type: string, handler: MessageHandler): void {
    this.messageHandlers.set(type, handler);
    this.log(LogLevel.DEBUG, `Registered message handler: ${type}`);
  }

  /**
   * Register a task handler
   */
  public registerTaskHandler(type: string, handler: TaskHandler): void {
    this.taskHandlers.set(type, handler);
    this.log(LogLevel.DEBUG, `Registered task handler: ${type}`);
  }

  /**
   * Register an event handler
   */
  public registerEventHandler(type: string, handler: EventHandler): void {
    this.eventHandlers.set(type, handler);
    this.log(LogLevel.DEBUG, `Registered event handler: ${type}`);
  }

  /**
   * Get agent state
   */
  public getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Get agent identity
   */
  public getIdentity(): AgentIdentity {
    return { ...this.state.identity };
  }

  /**
   * Update agent configuration
   */
  public updateConfiguration(config: Partial<AgentState['configuration']>): void {
    this.state.configuration = { ...this.state.configuration, ...config };
    this.log(LogLevel.INFO, 'Configuration updated');
  }

  /**
   * Log a message with the specified level
   */
  protected log(level: LogLevel, message: string, data?: any): void {
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.state.identity.name}] ${message}`;
      
      switch (level) {
        case LogLevel.ERROR:
          console.error(logMessage, data);
          break;
        case LogLevel.WARN:
          console.warn(logMessage, data);
          break;
        case LogLevel.INFO:
          console.info(logMessage, data);
          break;
        case LogLevel.DEBUG:
          console.debug(logMessage, data);
          break;
      }
    }
  }

  /**
   * Emit an event to registered handlers
   */
  protected async emitEvent(type: string, data: any): Promise<void> {
    const event: AgentEvent = {
      type,
      source: this.state.identity.id,
      timestamp: new Date(),
      data
    };

    const handler = this.eventHandlers.get(type);
    if (handler) {
      try {
        await handler(event);
      } catch (error) {
        this.log(LogLevel.ERROR, `Error in event handler for ${type}: ${error}`);
      }
    }
  }

  /**
   * Generate a unique ID
   */
  protected generateId(): string {
    return `${this.state.identity.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevel = levels.indexOf(this.state.configuration.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= currentLevel;
  }

  /**
   * Register default message and task handlers
   */
  private registerDefaultHandlers(): void {
    // Default message handlers
    this.registerMessageHandler('ping', async (message) => {
      await this.sendMessage(message.sender, MessageType.RESPONSE, { pong: true });
    });

    this.registerMessageHandler('status', async (message) => {
      await this.sendMessage(message.sender, MessageType.RESPONSE, {
        status: this.state.identity.status,
        uptime: this.state.performance.uptime,
        currentTask: this.state.currentTask?.type
      });
    });

    // Default task handlers
    this.registerTaskHandler('health_check', async (task) => {
      return {
        status: this.state.identity.status,
        uptime: this.state.performance.uptime,
        messageQueueLength: this.messageQueue.length,
        currentTask: this.state.currentTask?.type
      };
    });
  }

  /**
   * Handle incoming requests
   */
  private async handleRequest(message: AgentMessage): Promise<void> {
    const handler = this.messageHandlers.get(message.payload.action);
    if (handler) {
      try {
        const response = await handler(message);
        if (response) {
          await this.sendMessage(
            message.sender,
            MessageType.RESPONSE,
            response,
            message.priority,
            message.context
          );
        }
      } catch (error) {
        await this.sendMessage(
          message.sender,
          MessageType.ERROR,
          { error: error.message },
          MessagePriority.HIGH,
          message.context
        );
      }
    } else {
      await this.sendMessage(
        message.sender,
        MessageType.ERROR,
        { error: `Unknown action: ${message.payload.action}` },
        MessagePriority.HIGH,
        message.context
      );
    }
  }

  /**
   * Handle incoming notifications
   */
  private async handleNotification(message: AgentMessage): Promise<void> {
    const handler = this.messageHandlers.get('notification');
    if (handler) {
      await handler(message);
    }
  }

  /**
   * Handle heartbeat messages
   */
  private async handleHeartbeat(message: AgentMessage): Promise<void> {
    this.state.identity.lastHeartbeat = new Date();
    await this.emitEvent('heartbeat_received', { message });
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.state.identity.lastHeartbeat = new Date();
      this.state.performance.uptime += 1;
    }, 1000);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Start message processing loop
   */
  private startMessageProcessing(): void {
    setInterval(async () => {
      if (this.messageQueue.length > 0 && this.isRunning) {
        const message = this.messageQueue.shift();
        if (message) {
          await this.processMessage(message);
        }
      }
    }, 100);
  }

  // Abstract methods that must be implemented by derived classes
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
}
