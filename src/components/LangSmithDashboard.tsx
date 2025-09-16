/**
 * LangSmith Dashboard Component
 * Provides real-time monitoring and analytics for LangSmith traces
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react';
import { useLangSmith } from '@/hooks/useLangSmith';

export function LangSmithDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    isEnabled,
    isLoading,
    activeTraces,
    currentTraceId,
    getPerformanceAnalytics,
    runEvaluations,
    exportTraces,
    getServiceStatus
  } = useLangSmith();

  const serviceStatus = getServiceStatus();

  // Load analytics data
  const loadAnalytics = async () => {
    if (!isEnabled) return;

    setLoading(true);
    setError(null);

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      const analyticsData = await getPerformanceAnalytics(startDate, endDate);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Load analytics on component mount
  useEffect(() => {
    loadAnalytics();
  }, [isEnabled]);

  // Auto-refresh analytics every 30 seconds
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, [isEnabled]);

  const handleRunEvaluations = async () => {
    if (!isEnabled) return;

    try {
      setLoading(true);
      const results = await runEvaluations(['accuracy', 'latency', 'cost', 'security_relevance']);
      console.log('Evaluation results:', results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run evaluations');
    } finally {
      setLoading(false);
    }
  };

  const handleExportTraces = async () => {
    if (!isEnabled || activeTraces.length === 0) return;

    try {
      const csvData = await exportTraces('csv');
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `langsmith-traces-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export traces');
    }
  };

  if (!isEnabled) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          LangSmith is not enabled. Please configure your API key and project settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">LangSmith Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring and analytics for AI workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadAnalytics} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleRunEvaluations} 
            disabled={loading || activeTraces.length === 0}
            variant="outline"
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Run Evaluations
          </Button>
          <Button 
            onClick={handleExportTraces} 
            disabled={activeTraces.length === 0}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {serviceStatus?.activeTraces || 0}
              </div>
              <div className="text-sm text-muted-foreground">Active Traces</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {serviceStatus?.totalMetrics || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Metrics</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {serviceStatus?.projectName || 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">Project</div>
            </div>
            <div className="text-center">
              <Badge variant={serviceStatus?.isEnabled ? 'default' : 'destructive'}>
                {serviceStatus?.isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Avg Latency</p>
                  <p className="text-2xl font-bold">
                    {Math.round(analytics.averageLatency)}ms
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Avg Cost</p>
                  <p className="text-2xl font-bold">
                    ${analytics.averageCost.toFixed(4)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {(analytics.successRate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Traces</p>
                  <p className="text-2xl font-bold">
                    {analytics.totalTraces}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Traces */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Active Traces ({activeTraces.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTraces.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No active traces at the moment
            </p>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {activeTraces.map((trace) => (
                  <div key={trace.traceId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{trace.workflowType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {trace.traceId}
                        </span>
                      </div>
                      <Badge 
                        variant={
                          trace.status === 'running' ? 'default' :
                          trace.status === 'completed' ? 'default' :
                          'destructive'
                        }
                      >
                        {trace.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Started:</span>
                        <br />
                        {trace.startTime.toLocaleTimeString()}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phases:</span>
                        <br />
                        {trace.phases.length}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tokens:</span>
                        <br />
                        {trace.totalTokens}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost:</span>
                        <br />
                        ${trace.totalCost.toFixed(4)}
                      </div>
                    </div>

                    {trace.phases.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm text-muted-foreground mb-2">Phases:</div>
                        <div className="flex flex-wrap gap-1">
                          {trace.phases.map((phase, index) => (
                            <Badge 
                              key={index}
                              variant={
                                phase.status === 'completed' ? 'default' :
                                phase.status === 'running' ? 'secondary' :
                                'destructive'
                              }
                              className="text-xs"
                            >
                              {phase.phaseName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
