/**
 * LangGraph AI Assistant Component
 * Enhanced AI Assistant using LangGraph workflows for intelligent security analysis
 */

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Mic, Paperclip, Lightbulb, Search, Code, RefreshCw, Workflow, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLangGraphWorkflow } from '@/hooks/useLangGraphWorkflow';
import { Alert as AlertType, Incident, Entity, ThreatIntelligence } from '@/lib/langgraph/types';

export function LangGraphAIAssistant() {
  const [inputMessage, setInputMessage] = useState('');
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [humanInput, setHumanInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    executeThreatAnalysis,
    executeIncidentInvestigation,
    executeRiskAssessment,
    executeCorrelationAnalysis,
    executeAutomatedResponse,
    executePlaybook,
    provideHumanInput,
    cancelWorkflow,
    currentState,
    isExecuting,
    currentPhase,
    progress,
    errors,
    warnings,
    workflowInfo,
    metrics,
  } = useLangGraphWorkflow({
    onWorkflowComplete: (result) => {
      console.log('Workflow completed:', result);
    },
    onWorkflowError: (error) => {
      console.error('Workflow error:', error);
    },
    onPhaseChange: (phase) => {
      console.log('Phase changed to:', phase);
    },
    onHumanInputRequired: (prompt) => {
      console.log('Human input required:', prompt);
    },
  });

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [currentState]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isExecuting) return;

    const message = inputMessage.trim();
    setInputMessage('');

    // Parse the message to determine workflow type
    await executeWorkflowFromMessage(message);
  };

  const executeWorkflowFromMessage = async (message: string) => {
    const lowerMessage = message.toLowerCase();
    
    // Mock data - in real implementation, this would come from the actual data sources
    const mockData = {
      alerts: [] as AlertType[],
      incidents: [] as Incident[],
      entities: [] as Entity[],
      threatIntelligence: [] as ThreatIntelligence[],
      userId: 'user_123',
      sessionId: `session_${Date.now()}`,
    };

    try {
      if (lowerMessage.includes('threat') || lowerMessage.includes('analyze')) {
        await executeThreatAnalysis(mockData);
      } else if (lowerMessage.includes('incident') || lowerMessage.includes('investigate')) {
        await executeIncidentInvestigation({
          ...mockData,
          incident: {
            id: 'incident_1',
            title: 'Security Incident',
            description: 'Mock incident for testing',
            severity: 'high',
            status: 'open',
            created_at: new Date(),
            updated_at: new Date(),
            assigned_to: 'analyst_1',
            tags: ['malware', 'phishing'],
            related_alerts: [],
            timeline: [],
          },
        });
      } else if (lowerMessage.includes('risk') || lowerMessage.includes('assess')) {
        await executeRiskAssessment(mockData);
      } else if (lowerMessage.includes('correlation') || lowerMessage.includes('pattern')) {
        await executeCorrelationAnalysis(mockData);
      } else if (lowerMessage.includes('automated') || lowerMessage.includes('response')) {
        await executeAutomatedResponse(mockData);
      } else if (lowerMessage.includes('playbook') || lowerMessage.includes('execute')) {
        await executePlaybook({
          ...mockData,
          playbookId: 'malware_response',
        });
      } else {
        // Default to threat analysis
        await executeThreatAnalysis(mockData);
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
    }
  };

  const handleHumanInput = () => {
    if (humanInput.trim()) {
      provideHumanInput(humanInput.trim());
      setHumanInput('');
    }
  };

  const suggestions = [
    'Analyze threats in the system',
    'Investigate security incident',
    'Assess risk levels',
    'Find correlation patterns',
    'Execute automated response',
    'Run malware playbook'
  ];

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'threat_analysis':
        return <Search className="h-4 w-4" />;
      case 'risk_assessment':
        return <AlertTriangle className="h-4 w-4" />;
      case 'decision_making':
        return <Lightbulb className="h-4 w-4" />;
      case 'response_generation':
        return <Code className="h-4 w-4" />;
      case 'action_execution':
        return <Workflow className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'human_review':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">LangGraph AI Assistant</h2>
          <p className="text-muted-foreground">Advanced AI-powered security analysis using LangGraph workflows</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="animate-pulse-glow">
            <Workflow className="h-3 w-3 mr-1" />
            LangGraph
          </Badge>
          <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Workflow className="h-4 w-4 mr-2" />
                Workflow Info
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Workflow Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Workflow Name</h4>
                  <p className="text-sm text-muted-foreground">{workflowInfo.name}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Description</h4>
                  <p className="text-sm text-muted-foreground">{workflowInfo.description}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Capabilities</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {workflowInfo.capabilities.map((capability: string) => (
                      <Badge key={capability} variant="secondary">
                        {capability}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={cancelWorkflow} disabled={!isExecuting}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      {/* Workflow Status */}
      {isExecuting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getPhaseIcon(currentPhase)}
                  <span className={`font-medium ${getPhaseColor(currentPhase)}`}>
                    {currentPhase.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <div className="font-medium">{metrics.total_duration}ms</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence:</span>
                    <div className="font-medium">
                      {Object.values(metrics.confidence_scores).length > 0
                        ? Math.round(
                            Object.values(metrics.confidence_scores).reduce((a: number, b: number) => a + b, 0) /
                            Object.values(metrics.confidence_scores).length * 100
                          )
                        : 0}%
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors:</span>
                    <div className="font-medium">{metrics.error_count}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Warnings:</span>
                    <div className="font-medium">{metrics.warning_count}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors and Warnings */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div key={index} className="text-sm">{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {warnings.map((warning, index) => (
                <div key={index} className="text-sm">{warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Human Input Required */}
      {currentState?.human_input_required && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">Human Input Required</span>
              </div>
              <p className="text-sm text-muted-foreground">{currentState.human_input_prompt}</p>
              <div className="flex space-x-2">
                <Input
                  value={humanInput}
                  onChange={(e) => setHumanInput(e.target.value)}
                  placeholder="Enter your response..."
                  className="flex-1"
                />
                <Button onClick={handleHumanInput} disabled={!humanInput.trim()}>
                  Submit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {currentState && currentState.current_phase === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Analysis Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentState.natural_language_response && (
                <div>
                  <h4 className="font-semibold mb-2">Analysis Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    {currentState.natural_language_response.content}
                  </p>
                </div>
              )}
              
              {currentState.recommendations && currentState.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {currentState.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        • {rec.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentState.playbook_suggestions && currentState.playbook_suggestions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Suggested Playbooks</h4>
                  <div className="space-y-2">
                    {currentState.playbook_suggestions.map((playbook, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="font-medium">{playbook.name}</div>
                        <div className="text-sm text-muted-foreground">{playbook.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <span>LangGraph AI Assistant</span>
            {isExecuting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {!currentState && (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Welcome to LangGraph AI Assistant</h3>
                  <p className="text-muted-foreground mb-4">
                    I can execute intelligent workflows for threat analysis, incident investigation, risk assessment, and more.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                    {suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setInputMessage(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {currentState && (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-accent/50">
                    <div className="flex items-center space-x-2 mb-2">
                      {getPhaseIcon(currentState.current_phase)}
                      <span className="font-medium">Workflow Status</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Phase: {currentState.current_phase.replace('_', ' ').toUpperCase()}
                    </div>
                    {currentState.workflow_id && (
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {currentState.workflow_id}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me to analyze threats, investigate incidents, or assess risks..."
                  disabled={isExecuting}
                  className="pr-24"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Paperclip className="h-3 w-3" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Mic className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Button type="submit" disabled={!inputMessage.trim() || isExecuting}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            
            <div className="flex items-center justify-center mt-2">
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span className="flex items-center space-x-1">
                  <Workflow className="h-3 w-3" />
                  <span>LangGraph Workflows</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Search className="h-3 w-3" />
                  <span>Multi-Agent AI</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Lightbulb className="h-3 w-3" />
                  <span>Intelligent Analysis</span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
