import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Mic, Paperclip, Lightbulb, Search, Code, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { PLAYBOOKS, track } from '@/lib/tracking';

export function AIAssistant() {
  const { messages, loading, sendMessage, clearHistory } = useAIAssistant();
  const [inputMessage, setInputMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const message = inputMessage.trim();
    setInputMessage('');
    await sendMessage(message);
  };

  const suggestions = [
    'Analyze the latest PowerShell alert',
    'Generate threat intelligence report',
    'Check for lateral movement indicators',
    'Review recent failed logins',
    'Investigate suspicious network traffic',
    'Create incident response playbook'
  ];

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">AI Assistant</h2>
          <p className="text-muted-foreground">Intelligent cybersecurity analysis and investigation support</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="animate-pulse-glow">
            <Bot className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
          <Button variant="outline" size="sm" onClick={clearHistory}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        </div>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <span>SOC AI Assistant</span>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4" data-hj-suppress="">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Welcome to SOC AI Assistant</h3>
                  <p className="text-muted-foreground mb-4">
                    I can help you investigate alerts, analyze threats, generate reports, and provide security recommendations.
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

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.message_type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.message_type === 'assistant' && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.message_type === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-accent/50'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                    <div className="text-xs opacity-70 mt-2">
                      {formatMessageTime(message.created_at)}
                      {message.message_type === 'assistant' && message.metadata?.tier && (
                        <span>
                          {' · '}
                          {message.metadata.tier === 'deep' ? 'Deep path' : 'Fast path'}
                          {Array.isArray(message.metadata.models) && message.metadata.models.length > 0
                            ? ` · ${message.metadata.models.join(', ')}`
                            : ' · database'}
                        </span>
                      )}
                    </div>
                    {message.message_type === 'assistant' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Select onValueChange={(action) => track('ai_recommendation_accepted', { recommendation_id: message.id, action_taken: action })}>
                          <SelectTrigger aria-label="Accept recommendation" className="h-8 w-36">
                            <SelectValue placeholder="Accept" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="acknowledge_alert">Acknowledge alert</SelectItem>
                            <SelectItem value="open_incident">Open incident</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select onValueChange={(reason) => track('ai_recommendation_rejected', { recommendation_id: message.id, reject_reason: reason })}>
                          <SelectTrigger aria-label="Reject recommendation" className="h-8 w-36">
                            <SelectValue placeholder="Reject" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_relevant">Not relevant</SelectItem>
                            <SelectItem value="incorrect">Incorrect</SelectItem>
                            <SelectItem value="incomplete">Incomplete</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select onValueChange={(feedback) => track('ai_feedback_submitted', { recommendation_id: message.id, feedback_type: feedback })}>
                          <SelectTrigger aria-label="Recommendation feedback" className="h-8 w-36">
                            <SelectValue placeholder="Feedback" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="helpful">Helpful</SelectItem>
                            <SelectItem value="not_helpful">Not helpful</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => track('playbook_executed', {
                            playbook_id: PLAYBOOKS[0].id,
                            playbook_name: PLAYBOOKS[0].name,
                            trigger_source: 'assistant',
                          })}
                        >
                          Run playbook
                        </Button>
                      </div>
                    )}
                  </div>

                  {message.message_type === 'user' && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-accent">
                        U
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-accent/50 rounded-lg p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
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
                  placeholder="Ask me about security incidents, threats, or analysis..."
                  disabled={loading}
                  className="pr-24"
                  data-hj-suppress=""
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
              <Button type="submit" aria-label="Send" title="Send" disabled={!inputMessage.trim() || loading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            
            <div className="flex items-center justify-center mt-2">
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span className="flex items-center space-x-1">
                  <Search className="h-3 w-3" />
                  <span>Threat Analysis</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Code className="h-3 w-3" />
                  <span>Script Generation</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Lightbulb className="h-3 w-3" />
                  <span>Recommendations</span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}