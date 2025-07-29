import { useState } from 'react';
import { Bot, Send, Mic, Paperclip, Lightbulb, Search, Code } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  suggestions?: string[];
  artifacts?: {
    type: 'script' | 'report' | 'ioc';
    title: string;
    content: string;
  }[];
}

const mockMessages: Message[] = [
  {
    id: '1',
    type: 'ai',
    content: 'Hello! I\'m your SOC AI assistant. I can help you investigate alerts, analyze threats, generate reports, and provide security recommendations. What would you like to investigate today?',
    timestamp: '10:30 AM',
    suggestions: [
      'Analyze the latest PowerShell alert',
      'Generate threat intelligence report',
      'Check for lateral movement indicators',
      'Review recent failed logins'
    ]
  },
  {
    id: '2', 
    type: 'user',
    content: 'Can you help me investigate the suspicious PowerShell execution alert?',
    timestamp: '10:32 AM'
  },
  {
    id: '3',
    type: 'ai',
    content: 'I\'ve analyzed the PowerShell alert (ID: PWR-2024-001). Here\'s what I found:\n\n**Key Findings:**\n• Command executed: `powershell -enc <base64_encoded_payload>`\n• Process spawned from: winword.exe (Word document)\n• Network connection attempts to: 192.168.1.100:443\n• Credential dumping patterns detected\n\n**Risk Assessment:** HIGH - This appears to be a credential harvesting attempt via malicious macro.\n\n**Recommended Actions:**\n1. Isolate the affected workstation immediately\n2. Reset credentials for the affected user\n3. Block the C2 IP address: 192.168.1.100\n4. Scan for similar macro-enabled documents',
    timestamp: '10:33 AM',
    artifacts: [
      {
        type: 'script',
        title: 'PowerShell Forensic Analysis Script',
        content: 'Get-WinEvent -FilterHashtable @{LogName="Microsoft-Windows-PowerShell/Operational"}'
      },
      {
        type: 'ioc',
        title: 'Indicators of Compromise',
        content: 'IP: 192.168.1.100\nHash: a1b2c3d4e5f6...\nDomain: malicious-c2.evil'
      }
    ]
  }
];

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'I\'m analyzing your request. Let me gather the relevant threat intelligence and correlate it with our current security posture...',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          'Run automated threat hunting query',
          'Generate incident response playbook', 
          'Export findings to SIEM',
          'Schedule follow-up analysis'
        ]
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0 border-b border-border">
        <CardTitle className="flex items-center space-x-2">
          <div className="relative">
            <Bot className="h-6 w-6 text-primary" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-success rounded-full animate-pulse-glow" />
          </div>
          <span>SOC AI Assistant</span>
          <Badge variant="secondary" className="ml-auto">GPT-4o</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`flex items-start space-x-3 max-w-[80%] ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={
                      message.type === 'ai' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground'
                    }>
                      {message.type === 'ai' ? <Bot className="h-4 w-4" /> : 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-2">
                    <div className={`rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}>
                      <p className="whitespace-pre-line text-sm">{message.content}</p>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {message.timestamp}
                    </div>

                    {/* Suggestions */}
                    {message.suggestions && (
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <Lightbulb className="h-3 w-3 mr-1" />
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Artifacts */}
                    {message.artifacts && (
                      <div className="space-y-2">
                        {message.artifacts.map((artifact, index) => (
                          <Card key={index} className="border border-accent/20 bg-accent/5">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Code className="h-4 w-4 text-accent" />
                                  <span className="text-sm font-medium">{artifact.title}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {artifact.type.toUpperCase()}
                                </Badge>
                              </div>
                              <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
                                {artifact.content}
                              </pre>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-border p-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about threats, generate reports, or request analysis..."
                className="pr-12"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Paperclip className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Mic className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => handleSuggestionClick('Generate incident summary')}>
              <Search className="h-3 w-3 mr-1" />
              Investigate
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSuggestionClick('Create threat report')}>
              <Bot className="h-3 w-3 mr-1" />
              Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSuggestionClick('Hunt for similar threats')}>
              <Lightbulb className="h-3 w-3 mr-1" />
              Hunt
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}