import { useState } from 'react';
import { Brain, Target, AlertTriangle, Shield, TrendingUp, Zap, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SOCL3Assistant } from './SOCL3Assistant';
import { SOCL3ThreatHunting } from './SOCL3ThreatHunting';
import { SOCL3RiskAssessment } from './SOCL3RiskAssessment';

interface SOCL3Metrics {
  total_incidents: number;
  critical_incidents: number;
  resolved_incidents: number;
  avg_resolution_time: string;
  threat_hunting_queries: number;
  active_queries: number;
  risk_assessments: number;
  high_risk_assets: number;
  ai_automation_rate: number;
  false_positive_reduction: number;
}

export function SOCL3Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<SOCL3Metrics>({
    total_incidents: 247,
    critical_incidents: 12,
    resolved_incidents: 198,
    avg_resolution_time: '2.3 hours',
    threat_hunting_queries: 24,
    active_queries: 8,
    risk_assessments: 15,
    high_risk_assets: 7,
    ai_automation_rate: 78,
    false_positive_reduction: 92
  });

  const getTabIcon = (tab: string) => {
    const icons: Record<string, React.ReactNode> = {
      'overview': <Brain className="h-4 w-4" />,
      'assistant': <Brain className="h-4 w-4" />,
      'hunting': <Target className="h-4 w-4" />,
      'risk': <AlertTriangle className="h-4 w-4" />,
      'analytics': <TrendingUp className="h-4 w-4" />
    };
    return icons[tab] || <Brain className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">SOC L3 Command Center</h1>
          <p className="text-muted-foreground">Advanced AI-powered security operations for senior analysts</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="animate-pulse-glow">
            <Zap className="h-3 w-3 mr-1" />
            L3 Enhanced
          </Badge>
          <Badge variant="outline" className="animate-pulse-glow">
            <Brain className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            {getTabIcon('overview')}
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="assistant" className="flex items-center space-x-2">
            {getTabIcon('assistant')}
            <span>AI Assistant</span>
          </TabsTrigger>
          <TabsTrigger value="hunting" className="flex items-center space-x-2">
            {getTabIcon('hunting')}
            <span>Threat Hunting</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center space-x-2">
            {getTabIcon('risk')}
            <span>Risk Assessment</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            {getTabIcon('analytics')}
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.total_incidents}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-600">{metrics.critical_incidents} critical</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved Incidents</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.resolved_incidents}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((metrics.resolved_incidents / metrics.total_incidents) * 100)}% resolution rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.avg_resolution_time}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">75% faster</span> with AI
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Automation Rate</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.ai_automation_rate}%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{metrics.false_positive_reduction}%</span> false positive reduction
                </p>
              </CardContent>
            </Card>
          </div>

          {/* L3 Specific Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Threat Hunting Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Queries</span>
                    <Badge variant="outline">{metrics.active_queries}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Queries</span>
                    <Badge variant="outline">{metrics.threat_hunting_queries}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Success Rate</span>
                    <Badge className="bg-green-100 text-green-800">85%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Risk Assessment Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Assessments</span>
                    <Badge variant="outline">{metrics.risk_assessments}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">High Risk Assets</span>
                    <Badge className="bg-red-100 text-red-800">{metrics.high_risk_assets}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Coverage</span>
                    <Badge className="bg-blue-100 text-blue-800">92%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Automation Benefits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>AI Automation Benefits</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">75%</div>
                  <div className="text-sm text-muted-foreground">Faster Response Time</div>
                  <div className="text-xs text-muted-foreground mt-1">AI-powered analysis and automation</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">92%</div>
                  <div className="text-sm text-muted-foreground">False Positive Reduction</div>
                  <div className="text-xs text-muted-foreground mt-1">Machine learning accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">65%</div>
                  <div className="text-sm text-muted-foreground">Time Savings</div>
                  <div className="text-xs text-muted-foreground mt-1">Focus on strategic tasks</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex flex-col space-y-2" onClick={() => setActiveTab('assistant')}>
                  <Brain className="h-6 w-6" />
                  <span className="text-sm">AI Assistant</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col space-y-2" onClick={() => setActiveTab('hunting')}>
                  <Target className="h-6 w-6" />
                  <span className="text-sm">Threat Hunting</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col space-y-2" onClick={() => setActiveTab('risk')}>
                  <AlertTriangle className="h-6 w-6" />
                  <span className="text-sm">Risk Assessment</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col space-y-2">
                  <TrendingUp className="h-6 w-6" />
                  <span className="text-sm">Analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assistant">
          <SOCL3Assistant />
        </TabsContent>

        <TabsContent value="hunting">
          <SOCL3ThreatHunting />
        </TabsContent>

        <TabsContent value="risk">
          <SOCL3RiskAssessment />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>L3 Analytics Dashboard</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground mb-4">
                  Comprehensive analytics and reporting for SOC L3 operations
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">85%</div>
                    <div className="text-sm text-muted-foreground">Threat Detection Accuracy</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">2.3h</div>
                    <div className="text-sm text-muted-foreground">Average Resolution Time</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">78%</div>
                    <div className="text-sm text-muted-foreground">AI Automation Rate</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
