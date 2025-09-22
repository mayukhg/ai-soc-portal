/**
 * LLM Logging Dashboard Component
 * Comprehensive dashboard for LLM operations monitoring and analytics
 * 
 * Features:
 * - Real-time performance metrics
 * - Cost tracking and analysis
 * - Quality assessment monitoring
 * - Alert management
 * - Log export and compliance
 * - Historical trend analysis
 */

import { useState, useEffect } from 'react';
import { 
  Activity, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  Filter, 
  Calendar,
  BarChart3,
  PieChart,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLLMLogging } from '@/hooks/useLLMLogging';
import { useToast } from '@/hooks/use-toast';

export function LLMLoggingDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ start: Date; end: Date } | undefined>();
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  const {
    isInitialized,
    isLoading,
    error,
    metrics,
    alerts,
    getMetrics,
    getCostBreakdown,
    getQualityAssessment,
    exportLogs,
    clearAlerts,
    resolveAlert,
    cleanupOldLogs,
  } = useLLMLogging({
    enableRealTimeMonitoring: true,
    enableAlerts: true,
    autoCleanup: true,
  });

  const { toast } = useToast();

  // Auto-refresh metrics
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      getMetrics(selectedTimeRange);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isInitialized, selectedTimeRange, refreshInterval, getMetrics]);

  // Handle export logs
  const handleExportLogs = () => {
    const exportedData = exportLogs(selectedTimeRange, exportFormat);
    if (exportedData) {
      const blob = new Blob([exportedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `llm-logs-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Handle cleanup old logs
  const handleCleanupLogs = () => {
    cleanupOldLogs();
  };

  // Get alert severity color
  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  // Get alert icon
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'latency': return <Clock className="h-4 w-4" />;
      case 'cost': return <DollarSign className="h-4 w-4" />;
      case 'quality': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing LLM logging...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LLM Operations Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive monitoring and analytics for LLM operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => getMetrics(selectedTimeRange)} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
          <Button onClick={handleCleanupLogs} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Cleanup
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Latency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.averageLatency.toFixed(0)}ms</div>
              <p className="text-xs text-muted-foreground">
                P95: {metrics.p95Latency.toFixed(0)}ms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.totalCost.toFixed(4)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: ${metrics.averageCostPerRequest.toFixed(4)}/req
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Error: {metrics.errorRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics.averageConfidence * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Avg confidence
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Alerts ({alerts.filter(a => !a.resolved).length})
              </CardTitle>
              <Button onClick={clearAlerts} variant="outline" size="sm">
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {alerts.filter(a => !a.resolved).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      {getAlertIcon(alert.type)}
                      <span className="text-sm">{alert.message}</span>
                      <Badge variant={getAlertSeverityColor(alert.severity) as any}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                      <Button
                        onClick={() => resolveAlert(alert.id)}
                        variant="outline"
                        size="sm"
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Token Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Token Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Input Tokens</span>
                    <span>{metrics?.averageInputTokens.toFixed(0)} avg</span>
                  </div>
                  <Progress value={50} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Output Tokens</span>
                    <span>{metrics?.averageOutputTokens.toFixed(0)} avg</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Processed</span>
                    <span>{metrics?.totalTokensProcessed.toLocaleString()}</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div className="text-sm text-muted-foreground">
                  Efficiency: {(metrics?.tokenEfficiency || 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>

            {/* Model Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Model Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.mostUsedModels.map((model, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{model.model}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{model.count} requests</span>
                        <Badge variant="outline">${model.cost.toFixed(4)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agent Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.mostUsedAgents.map((agent, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{agent.agent}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{agent.count} requests</span>
                      <span className="text-sm text-muted-foreground">{agent.avgLatency.toFixed(0)}ms avg</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Average Latency</Label>
                  <div className="text-2xl font-bold">{metrics?.averageLatency.toFixed(0)}ms</div>
                </div>
                <div className="space-y-2">
                  <Label>P95 Latency</Label>
                  <div className="text-2xl font-bold">{metrics?.p95Latency.toFixed(0)}ms</div>
                </div>
                <div className="space-y-2">
                  <Label>P99 Latency</Label>
                  <div className="text-2xl font-bold">{metrics?.p99Latency.toFixed(0)}ms</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Throughput</Label>
                <div className="text-2xl font-bold">{metrics?.throughput.toFixed(1)} req/min</div>
              </div>

              <div className="space-y-2">
                <Label>Success Rate</Label>
                <Progress value={metrics?.successRate || 0} className="h-2" />
                <div className="text-sm text-muted-foreground">
                  {metrics?.successRate.toFixed(1)}% success, {metrics?.errorRate.toFixed(1)}% errors
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Cost</Label>
                  <div className="text-2xl font-bold">${metrics?.totalCost.toFixed(4)}</div>
                </div>
                <div className="space-y-2">
                  <Label>Average Cost per Request</Label>
                  <div className="text-2xl font-bold">${metrics?.averageCostPerRequest.toFixed(4)}</div>
                </div>
                <div className="space-y-2">
                  <Label>Cost per Token</Label>
                  <div className="text-2xl font-bold">${metrics?.costPerToken.toFixed(6)}</div>
                </div>
                <div className="space-y-2">
                  <Label>Daily Cost</Label>
                  <div className="text-2xl font-bold">${metrics?.dailyCost.toFixed(4)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Average Confidence</Label>
                  <div className="text-2xl font-bold">{(metrics?.averageConfidence || 0) * 100}%</div>
                </div>
                <div className="space-y-2">
                  <Label>Toxicity Score</Label>
                  <div className="text-2xl font-bold">{(metrics?.averageToxicityScore || 0) * 100}%</div>
                </div>
                <div className="space-y-2">
                  <Label>Bias Score</Label>
                  <div className="text-2xl font-bold">{(metrics?.averageBiasScore || 0) * 100}%</div>
                </div>
                <div className="space-y-2">
                  <Label>Hallucination Score</Label>
                  <div className="text-2xl font-bold">{(metrics?.averageHallucinationScore || 0) * 100}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Total Alerts: {alerts.length}</span>
                  <span>Active: {alerts.filter(a => !a.resolved).length}</span>
                  <span>Resolved: {alerts.filter(a => a.resolved).length}</span>
                </div>
                
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div key={alert.id} className={`flex items-center justify-between p-3 border rounded ${alert.resolved ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2">
                          {getAlertIcon(alert.type)}
                          <span className="text-sm">{alert.message}</span>
                          <Badge variant={getAlertSeverityColor(alert.severity) as any}>
                            {alert.severity}
                          </Badge>
                          {alert.resolved && <Badge variant="secondary">Resolved</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                          {!alert.resolved && (
                            <Button
                              onClick={() => resolveAlert(alert.id)}
                              variant="outline"
                              size="sm"
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
