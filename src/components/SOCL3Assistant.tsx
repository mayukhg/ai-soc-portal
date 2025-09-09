import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Mic, Paperclip, Lightbulb, Search, Code, RefreshCw, Shield, Target, Zap, Brain, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIAssistant } from '@/hooks/useAIAssistant';

interface SOCL3Message {
  id: string;
  user_id: string;
  session_id: string;
  message_type: 'user' | 'assistant';
  content: string;
  context_type?: 'threat_analysis' | 'incident_investigation' | 'risk_assessment' | 'threat_hunting' | 'compliance' | 'training';
  context_id?: string;
  reasoning_chain?: string[];
  confidence_score?: number;
  suggested_actions?: string[];
  created_at: string;
}

export function SOCL3Assistant() {
  const { messages, loading, sendMessage, clearHistory } = useAIAssistant();
  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState('analysis');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const message = inputMessage.trim();
    setInputMessage('');
    await sendMessage(message, getContextTypeFromTab(activeTab));
  };

  const getContextTypeFromTab = (tab: string) => {
    const contextMap: Record<string, string> = {
      'analysis': 'threat_analysis',
      'investigation': 'incident_investigation',
      'risk': 'risk_assessment',
      'hunting': 'threat_hunting',
      'compliance': 'compliance',
      'training': 'training'
    };
    return contextMap[tab] || 'threat_analysis';
  };

  const socL3Suggestions = {
    analysis: [
      'Analyze the latest APT campaign indicators',
      'Perform deep threat analysis on suspicious network traffic',
      'Generate comprehensive threat intelligence report',
      'Assess the security posture of our critical assets',
      'Analyze the attack chain from the recent breach'
    ],
    investigation: [
      'Investigate the lateral movement indicators',
      'Reconstruct the complete attack timeline',
      'Analyze the malware behavior patterns',
      'Investigate the data exfiltration attempts',
      'Perform forensic analysis on the compromised systems'
    ],
    risk: [
      'Assess the risk level of the new vulnerability',
      'Evaluate the business impact of the security incident',
      'Prioritize the security controls based on risk',
      'Generate risk assessment for the new system',
      'Analyze the threat landscape for our industry'
    ],
    hunting: [
      'Hunt for indicators of compromise in the network',
      'Search for advanced persistent threat activities',
      'Look for signs of data exfiltration',
      'Hunt for privilege escalation attempts',
      'Search for command and control communications'
    ],
    compliance: [
      'Generate compliance report for SOC 2 audit',
      'Assess GDPR compliance for data processing',
      'Create executive summary for board meeting',
      'Generate incident report for regulatory filing',
      'Assess compliance with industry standards'
    ],
    training: [
      'Create training module on threat hunting techniques',
      'Generate incident response playbook',
      'Develop security awareness training content',
      'Create tabletop exercise scenario',
      'Generate knowledge base article on APT detection'
    ]
  };

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTabIcon = (tab: string) => {
    const icons: Record<string, React.ReactNode> = {
      'analysis': <Brain className="h-4 w-4" />,
      'investigation': <Search className="h-4 w-4" />,
      'risk': <AlertTriangle className="h-4 w-4" />,
      'hunting': <Target className="h-4 w-4" />,
      'compliance': <Shield className="h-4 w-4" />,
      'training': <TrendingUp className="h-4 w-4" />
    };
    return icons[tab] || <Brain className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">SOC L3 AI Assistant</h2>
          <p className="text-muted-foreground">Advanced AI-powered analysis and investigation support for senior analysts</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="animate-pulse-glow">
            <Zap className="h-3 w-3 mr-1" />
            L3 Enhanced
          </Badge>
          <Button variant="outline" size="sm" onClick={clearHistory}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="analysis" className="flex items-center space-x-2">
            {getTabIcon('analysis')}
            <span>Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="investigation" className="flex items-center space-x-2">
            {getTabIcon('investigation')}
            <span>Investigation</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center space-x-2">
            {getTabIcon('risk')}
            <span>Risk</span>
          </TabsTrigger>
          <TabsTrigger value="hunting" className="flex items-center space-x-2">
            {getTabIcon('hunting')}
            <span>Hunting</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center space-x-2">
            {getTabIcon('compliance')}
            <span>Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center space-x-2">
            {getTabIcon('training')}
            <span>Training</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-primary" />
                <span>SOC L3 AI Assistant - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Welcome to SOC L3 AI Assistant</h3>
                      <p className="text-muted-foreground mb-4">
                        I can help you with advanced threat analysis, incident investigation, risk assessment, 
                        threat hunting, compliance reporting, and training content generation.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                        {socL3Suggestions[activeTab as keyof typeof socL3Suggestions]?.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs text-left justify-start"
                            onClick={() => setInputMessage(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message: SOCL3Message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.message_type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                    >
                      <div className={`flex max-w-[80%] ${message.message_type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {message.message_type === 'user' ? 'U' : 'AI'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`rounded-lg px-4 py-2 ${
                          message.message_type === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                          {message.confidence_score && (
                            <div className="mt-2 text-xs opacity-70">
                              Confidence: {Math.round(message.confidence_score * 100)}%
                            </div>
                          )}
                          {message.reasoning_chain && message.reasoning_chain.length > 0 && (
                            <div className="mt-2 text-xs opacity-70">
                              <div className="font-semibold">Reasoning Chain:</div>
                              <ul className="list-disc list-inside">
                                {message.reasoning_chain.map((step, index) => (
                                  <li key={index}>{step}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {message.suggested_actions && message.suggested_actions.length > 0 && (
                            <div className="mt-2 text-xs opacity-70">
                              <div className="font-semibold">Suggested Actions:</div>
                              <ul className="list-disc list-inside">
                                {message.suggested_actions.map((action, index) => (
                                  <li key={index}>{action}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="text-xs opacity-50 mt-1">
                            {formatMessageTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={`Ask me about ${activeTab}...`}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={loading || !inputMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
