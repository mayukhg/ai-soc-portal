/**
 * Agent Context
 * 
 * React context that provides access to the agent system throughout the application.
 * This allows components to interact with agents, send messages, and execute workflows.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AgentManager } from '../agents/AgentManager';
import { 
  AgentMessage, 
  MessageType, 
  AgentTask, 
  SystemConfig,
  LogLevel
} from '../types/agent';

interface AgentContextType {
  // Agent system management
  isInitialized: boolean;
  initialize: (config?: Partial<SystemConfig>) => Promise<void>;
  shutdown: () => Promise<void>;
  
  // Agent communication
  sendMessage: (recipient: string, type: MessageType, payload: any, priority?: 'low' | 'medium' | 'high' | 'critical') => Promise<string>;
  broadcastMessage: (type: MessageType, payload: any, priority?: 'low' | 'medium' | 'high' | 'critical') => Promise<void>;
  
  // Workflow management
  executeWorkflow: (name: string, description: string, steps: any[], context?: Record<string, any>) => Promise<any>;
  
  // System status
  getSystemStatus: () => any;
  systemStatus: any;
  
  // Agent access
  getAgent: (agentId: string) => any;
  getAllAgents: () => Map<string, any>;
  
  // Configuration
  updateConfig: (config: Partial<SystemConfig>) => void;
  
  // Error handling
  error: string | null;
  clearError: () => void;
  
  // Loading states
  isLoading: boolean;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

interface AgentProviderProps {
  children: React.ReactNode;
  config?: Partial<SystemConfig>;
}

export const AgentProvider: React.FC<AgentProviderProps> = ({ children, config }) => {
  const [agentManager] = useState(() => new AgentManager());
  const [isInitialized, setIsInitialized] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize the agent system
  const initialize = useCallback(async (initConfig?: Partial<SystemConfig>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await agentManager.initialize(initConfig || config);
      setIsInitialized(true);
      
      // Get initial system status
      const status = agentManager.getSystemStatus();
      setSystemStatus(status);
      
      console.log('Agent system initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize agent system';
      setError(errorMessage);
      console.error('Failed to initialize agent system:', err);
    } finally {
      setIsLoading(false);
    }
  }, [agentManager, config]);

  // Shutdown the agent system
  const shutdown = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await agentManager.shutdown();
      setIsInitialized(false);
      setSystemStatus(null);
      console.log('Agent system shutdown successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to shutdown agent system';
      setError(errorMessage);
      console.error('Failed to shutdown agent system:', err);
    } finally {
      setIsLoading(false);
    }
  }, [agentManager]);

  // Send message to specific agent
  const sendMessage = useCallback(async (
    recipient: string,
    type: MessageType,
    payload: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) => {
    if (!isInitialized) {
      throw new Error('Agent system not initialized');
    }
    
    try {
      return await agentManager.sendMessage(recipient, type, payload, priority);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw err;
    }
  }, [agentManager, isInitialized]);

  // Broadcast message to all agents
  const broadcastMessage = useCallback(async (
    type: MessageType,
    payload: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) => {
    if (!isInitialized) {
      throw new Error('Agent system not initialized');
    }
    
    try {
      await agentManager.broadcastMessage(type, payload, priority);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to broadcast message';
      setError(errorMessage);
      throw err;
    }
  }, [agentManager, isInitialized]);

  // Execute workflow
  const executeWorkflow = useCallback(async (
    name: string,
    description: string,
    steps: any[],
    context: Record<string, any> = {}
  ) => {
    if (!isInitialized) {
      throw new Error('Agent system not initialized');
    }
    
    try {
      return await agentManager.executeWorkflow(name, description, steps, context);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute workflow';
      setError(errorMessage);
      throw err;
    }
  }, [agentManager, isInitialized]);

  // Get system status
  const getSystemStatus = useCallback(() => {
    if (!isInitialized) {
      return null;
    }
    
    try {
      const status = agentManager.getSystemStatus();
      setSystemStatus(status);
      return status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get system status';
      setError(errorMessage);
      return null;
    }
  }, [agentManager, isInitialized]);

  // Get specific agent
  const getAgent = useCallback((agentId: string) => {
    if (!isInitialized) {
      return null;
    }
    
    try {
      return agentManager.getAgent(agentId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get agent';
      setError(errorMessage);
      return null;
    }
  }, [agentManager, isInitialized]);

  // Get all agents
  const getAllAgents = useCallback(() => {
    if (!isInitialized) {
      return new Map();
    }
    
    try {
      return agentManager.getAllAgents();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get agents';
      setError(errorMessage);
      return new Map();
    }
  }, [agentManager, isInitialized]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<SystemConfig>) => {
    try {
      agentManager.updateConfig(newConfig);
      
      // Update system status after config change
      if (isInitialized) {
        const status = agentManager.getSystemStatus();
        setSystemStatus(status);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration';
      setError(errorMessage);
    }
  }, [agentManager, isInitialized]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-initialize on mount if config is provided
  useEffect(() => {
    if (config && !isInitialized && !isLoading) {
      initialize();
    }
  }, [config, isInitialized, isLoading, initialize]);

  // Periodic status updates
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      getSystemStatus();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isInitialized, getSystemStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInitialized) {
        shutdown();
      }
    };
  }, [isInitialized, shutdown]);

  const contextValue: AgentContextType = {
    isInitialized,
    initialize,
    shutdown,
    sendMessage,
    broadcastMessage,
    executeWorkflow,
    getSystemStatus,
    systemStatus,
    getAgent,
    getAllAgents,
    updateConfig,
    error,
    clearError,
    isLoading
  };

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
};

// Custom hook to use the agent context
export const useAgentSystem = (): AgentContextType => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgentSystem must be used within an AgentProvider');
  }
  return context;
};

// Hook for agent-specific operations
export const useAgent = (agentId: string) => {
  const { getAgent, sendMessage, isInitialized } = useAgentSystem();
  
  const agent = isInitialized ? getAgent(agentId) : null;
  
  const sendMessageToAgent = useCallback(async (
    type: MessageType,
    payload: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) => {
    return await sendMessage(agentId, type, payload, priority);
  }, [agentId, sendMessage]);

  return {
    agent,
    sendMessage: sendMessageToAgent,
    isAvailable: !!agent
  };
};

// Hook for workflow operations
export const useWorkflow = () => {
  const { executeWorkflow, isInitialized } = useAgentSystem();
  
  const execute = useCallback(async (
    name: string,
    description: string,
    steps: any[],
    context: Record<string, any> = {}
  ) => {
    if (!isInitialized) {
      throw new Error('Agent system not initialized');
    }
    return await executeWorkflow(name, description, steps, context);
  }, [executeWorkflow, isInitialized]);

  return {
    execute,
    isAvailable: isInitialized
  };
};

// Hook for system monitoring
export const useSystemMonitoring = () => {
  const { systemStatus, getSystemStatus, isInitialized } = useAgentSystem();
  
  const refreshStatus = useCallback(() => {
    if (isInitialized) {
      getSystemStatus();
    }
  }, [isInitialized, getSystemStatus]);

  return {
    status: systemStatus,
    refreshStatus,
    isAvailable: isInitialized
  };
};
