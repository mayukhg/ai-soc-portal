/**
 * SOC Dashboard - Agent-Based Implementation
 * 
 * This component provides a comprehensive dashboard for the SOC Nexus system
 * with agent-based architecture integration. It displays agent status, system
 * health, threat intelligence, and provides controls for agent management.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
  Activity, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Play, 
  Stop, 
  RefreshCw,
  Users,
  Workflow,
  MessageSquare,
  BarChart3,
  Settings,
  Bot
} from 'lucide-react';
import { useAgentSystem, useSystemMonitoring, useWorkflow } from '../contexts/AgentContext';
import { MessageType, AgentType, ThreatSeverity } from '../types/agent';

interface DashboardMetrics {
  totalAgents: number;
  activeAgents: number;
  systemHealth: string;
  activeThreats: number;
  pendingIncidents: number;
  responseTime: number;
  uptime: number;
}

export const SOCDashboard: React.FC = () => {
  const { 
    isInitialized, 
    initialize, 
    shutdown, 
    sendMessage, 
    broadcastMessage,
    systemStatus,
    error,
    clearError,
    isLoading 
  } = useAgentSystem();
  
  const { status: monitoringStatus, refreshStatus } = useSystemMonitoring();
  const { execute: executeWorkflow } = useWorkflow();
  
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalAgents: 0,
    activeAgents: 0,
    systemHealth: 'unknown',
    activeThreats: 0,
    pendingIncidents: 0,
    responseTime: 0,
    uptime: 0
  });
  
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [workflowResults, setWorkflowResults] = useState<any[]>([]);

  // Update metrics when system status changes
  useEffect(() => {
    if (systemStatus) {
      const agents = systemStatus.agents || {};
      const activeAgents = Object.values(agents).filter((agent: any) => 
        agent.status === 'active'
      ).length;
      
      setMetrics({
        totalAgents: Object.keys(agents).length,
        activeAgents,
        systemHealth: systemStatus.orchestrator?.identity?.status || 'unknown',
        activeThreats: 0, // Would be calculated from threat detection agent
        pendingIncidents: 0, // Would be calculated from incident analysis agent
        responseTime: systemStatus.orchestrator?.performance?.responseTime || 0,
        uptime: systemStatus.orchestrator?.performance?.uptime || 0
      });
    }
  }, [systemStatus]);

  // Auto-refresh status
  useEffect(() => {
    if (isInitialized) {
      const interval = setInterval(() => {
        refreshStatus();
      }, 10000); // Refresh every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [isInitialized, refreshStatus]);

  const handleInitialize = async () => {
    try {
      await initialize();
    } catch (err) {
      console.error('Failed to initialize agent system:', err);
    }
  };

  const handleShutdown = async () => {
    try {
      await shutdown();
    } catch (err) {
      console.error('Failed to shutdown agent system:', err);
    }
  };

  const handleAgentAction = async (agentId: string, action: string) => {
    try {
      await sendMessage(agentId, MessageType.REQUEST, { action }, 'medium');
    } catch (err) {
      console.error(`Failed to send ${action} to agent ${agentId}:`, err);
    }
  };

  const handleThreatDetection = async () => {
    try {
      const result = await executeWorkflow(
        'Threat Detection Workflow',
        'Automated threat detection and analysis',
        [
          {
            id: 'detect_threats',
            name: 'Detect Threats',
            agent: 'threat_detection',
            action: 'detect_threats',
            parameters: { 
              data: { source: 'system_logs', timestamp: new Date() },
              source: 'dashboard_trigger'
            }
          },
          {
            id: 'analyze_patterns',
            name: 'Analyze Patterns',
            agent: 'threat_detection',
            action: 'analyze_patterns',
            parameters: { 
              events: [],
              timeWindow: 3600
            }
          }
        ]
      );
      
      setWorkflowResults(prev => [...prev, { id: Date.now(), result, timestamp: new Date() }]);
    } catch (err) {
      console.error('Failed to execute threat detection workflow:', err);
    }
  };

  const handleSystemHealthCheck = async () => {
    try {
      await broadcastMessage(MessageType.REQUEST, { action: 'health_check' }, 'medium');
    } catch (err) {
      console.error('Failed to broadcast health check:', err);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
      case 'busy':
        return 'bg-yellow-500';
      case 'error':
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case AgentType.THREAT_DETECTION:
        return <Shield className="h-4 w-4" />;
      case AgentType.INCIDENT_ANALYSIS:
        return <AlertTriangle className="h-4 w-4" />;
      case AgentType.RESPONSE_PLANNING:
        return <Workflow className="h-4 w-4" />;
      case AgentType.COMMUNICATION:
        return <MessageSquare className="h-4 w-4" />;
      case AgentType.MONITORING:
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">SOC Nexus Dashboard</h1>
          <p className="text-muted-foreground">Agent-Based Security Operations Center</p>
        </div>
        <div className="flex gap-2">
          {!isInitialized ? (
            <Button onClick={handleInitialize} disabled={isLoading}>
              <Play className="h-4 w-4 mr-2" />
              Initialize System
            </Button>
          ) : (
            <Button onClick={handleShutdown} variant="destructive" disabled={isLoading}>
              <Stop className="h-4 w-4 mr-2" />
              Shutdown System
            </Button>
          )}
          <Button onClick={refreshStatus} disabled={!isInitialized}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="link" onClick={clearError} className="ml-2">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <div className={`h-3 w-3 rounded-full ${getHealthColor(metrics.systemHealth)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{metrics.systemHealth}</div>
            <p className="text-xs text-muted-foreground">
              {isInitialized ? 'System Online' : 'System Offline'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeAgents}/{metrics.totalAgents}</div>
            <Progress value={(metrics.activeAgents / Math.max(metrics.totalAgents, 1)) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(metrics.uptime / 3600)}h</div>
            <p className="text-xs text-muted-foreground">
              {Math.floor((metrics.uptime % 3600) / 60)}m {metrics.uptime % 60}s
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agent Management</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="monitoring">System Monitoring</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Status</CardTitle>
              <CardDescription>
                Monitor and manage all agents in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemStatus?.agents && Object.entries(systemStatus.agents).map(([agentId, agent]: [string, any]) => (
                  <div key={agentId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getAgentTypeIcon(agent.identity?.type)}
                        <span className="font-medium">{agent.identity?.name}</span>
                      </div>
                      <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {agent.identity?.description || 'No description available'}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleAgentAction(agentId, 'status')}
                        disabled={!isInitialized}
                      >
                        Status
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedAgent(agentId)}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Management</CardTitle>
              <CardDescription>
                Execute and monitor automated workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={handleThreatDetection} disabled={!isInitialized}>
                    <Shield className="h-4 w-4 mr-2" />
                    Threat Detection
                  </Button>
                  <Button onClick={handleSystemHealthCheck} disabled={!isInitialized}>
                    <Activity className="h-4 w-4 mr-2" />
                    Health Check
                  </Button>
                </div>
                
                {workflowResults.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Recent Workflow Results</h3>
                    <div className="space-y-2">
                      {workflowResults.slice(-5).map((result) => (
                        <div key={result.id} className="border rounded p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">Workflow executed</p>
                              <p className="text-sm text-muted-foreground">
                                {result.timestamp.toLocaleString()}
                              </p>
                            </div>
                            <Badge variant="outline">Completed</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
              <CardDescription>
                Real-time system health and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monitoringStatus ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium">Overall Health</h4>
                      <Badge className={`mt-1 ${getHealthColor(monitoringStatus.overall)}`}>
                        {monitoringStatus.overall}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-medium">Last Check</h4>
                      <p className="text-sm text-muted-foreground">
                        {monitoringStatus.timestamp?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Agent Health</h4>
                    <div className="space-y-2">
                      {monitoringStatus.agents && Array.from(monitoringStatus.agents.entries()).map(([agentId, status]: [string, any]) => (
                        <div key={agentId} className="flex justify-between items-center">
                          <span className="text-sm">{agentId}</span>
                          <Badge variant={status === 'healthy' ? 'default' : 'secondary'}>
                            {status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No monitoring data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common actions for system management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">System Actions</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleSystemHealthCheck}
                      disabled={!isInitialized}
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      System Health Check
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={refreshStatus}
                      disabled={!isInitialized}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Status
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Agent Actions</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => broadcastMessage(MessageType.REQUEST, { action: 'ping' }, 'low')}
                      disabled={!isInitialized}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Ping All Agents
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleThreatDetection}
                      disabled={!isInitialized}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Run Threat Detection
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};