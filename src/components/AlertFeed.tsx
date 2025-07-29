import { useState } from 'react';
import { Clock, ExternalLink, MessageSquare, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Alert {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  timestamp: string;
  status: 'new' | 'investigating' | 'resolved';
  assignee?: string;
  description: string;
  aiSummary: string;
  tags: string[];
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    title: 'Suspicious PowerShell Execution',
    severity: 'critical',
    source: 'EDR',
    timestamp: '2 minutes ago',
    status: 'new',
    description: 'Unusual PowerShell command detected with potential credential dumping',
    aiSummary: 'AI detected potential credential harvesting attempt using PowerShell. High confidence malicious activity.',
    tags: ['powershell', 'credential-dump', 'lateral-movement']
  },
  {
    id: '2',
    title: 'Multiple Failed Login Attempts',
    severity: 'high',
    source: 'SIEM',
    timestamp: '5 minutes ago',
    status: 'investigating',
    assignee: 'Sarah Chen',
    description: 'Brute force attack detected against domain controller',
    aiSummary: 'Coordinated brute force attack from multiple IPs. Recommend immediate account lockdown.',
    tags: ['brute-force', 'authentication', 'domain-controller']
  },
  {
    id: '3',
    title: 'Outbound DNS Query to Suspicious Domain',
    severity: 'medium',
    source: 'Network',
    timestamp: '12 minutes ago',
    status: 'new',
    description: 'DNS query to known C2 domain detected',
    aiSummary: 'Potential C2 communication detected. Domain matches known threat intelligence feeds.',
    tags: ['dns', 'c2', 'network-anomaly']
  }
];

export function AlertFeed() {
  const [alerts] = useState<Alert[]>(mockAlerts);
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-critical border-critical';
      case 'high': return 'text-high border-high';
      case 'medium': return 'text-medium border-medium';
      case 'low': return 'text-low border-low';
      default: return 'text-muted-foreground border-border';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-critical text-primary-foreground';
      case 'high': return 'bg-high text-primary-foreground';
      case 'medium': return 'bg-medium text-primary-foreground';
      case 'low': return 'bg-low text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Alert Feed</h2>
        <div className="flex items-center space-x-3">
          <Badge variant="outline">Live Updates</Badge>
          <Button variant="outline" size="sm">
            Export Feed
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {alerts.map((alert, index) => (
          <Card 
            key={alert.id} 
            className={`transition-all duration-300 hover:shadow-lg border-l-4 ${getSeverityColor(alert.severity)} animate-slide-in`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className={`h-5 w-5 mt-1 ${getSeverityColor(alert.severity)}`} />
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{alert.title}</CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {alert.timestamp}
                      </span>
                      <span>Source: {alert.source}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge className={getSeverityBadge(alert.severity)}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                  {alert.status === 'investigating' && (
                    <Badge variant="secondary">Investigating</Badge>
                  )}
                  {alert.status === 'resolved' && (
                    <Badge className="bg-success text-primary-foreground">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolved
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-foreground">{alert.description}</p>
              
              {/* AI Summary */}
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="h-2 w-2 bg-accent rounded-full animate-pulse-glow" />
                  <span className="text-sm font-medium text-accent">AI Analysis</span>
                </div>
                <p className="text-sm text-foreground">{alert.aiSummary}</p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {alert.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-3">
                  {alert.assignee && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {alert.assignee.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">Assigned to {alert.assignee}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Comment
                  </Button>
                  <Button variant="outline" size="sm">
                    <User className="h-3 w-3 mr-1" />
                    Assign
                  </Button>
                  <Button variant="secondary" size="sm">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Investigate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}