/**
 * Explainability Dashboard Component
 * Provides visualization of explainability metrics and explanations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExplainability } from '@/hooks/useExplainability';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Brain,
  Shield,
  Target,
  Zap
} from 'lucide-react';

interface ExplainabilityDashboardProps {
  className?: string;
}

export const ExplainabilityDashboard: React.FC<ExplainabilityDashboardProps> = ({ className }) => {
  const { state, actions } = useExplainability({
    enableRealTimeMonitoring: true,
    enableIntegratedAlerts: true,
    monitoringIntervalMs: 300000,
    explanationRetentionDays: 7,
  });

  const [selectedTab, setSelectedTab] = useState('overview');

  // Health status colors
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Severity colors
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get latest metrics
  const latestMetrics = state.integratedMetrics[state.integratedMetrics.length - 1];

  return (
    <div className={`explainability-dashboard ${className || ''}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Explainability Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor AI model explanations and interpretability metrics
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getHealthColor(state.currentHealth)}>
              {state.currentHealth.toUpperCase()}
            </Badge>
            <Button
              onClick={state.isMonitoring ? actions.stopMonitoring : actions.startMonitoring}
              disabled={state.isLoading}
              variant={state.isMonitoring ? 'destructive' : 'default'}
            >
              {state.isLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : state.isMonitoring ? (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Start Monitoring
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {state.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="explanations">Explanations</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Overall Health */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{state.currentHealth}</div>
                  <p className="text-xs text-muted-foreground">
                    Current system health status
                  </p>
                </CardContent>
              </Card>

              {/* Integrated Score */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Integrated Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {latestMetrics ? (latestMetrics.integratedScore * 100).toFixed(1) : '0.0'}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Combined performance & explainability
                  </p>
                </CardContent>
              </Card>

              {/* Model Stability */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Model Stability</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {latestMetrics ? (latestMetrics.modelStability * 100).toFixed(1) : '0.0'}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Consistency over time
                  </p>
                </CardContent>
              </Card>

              {/* Explanation Drift */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Explanation Drift</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {latestMetrics ? (latestMetrics.explanationDrift * 100).toFixed(1) : '0.0'}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Change from baseline
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance vs Explainability */}
            {latestMetrics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>Current model performance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Accuracy</span>
                        <span>{(latestMetrics.performanceMetrics.accuracy * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={latestMetrics.performanceMetrics.accuracy * 100} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Latency</span>
                        <span>{latestMetrics.performanceMetrics.latencyMs}ms</span>
                      </div>
                      <Progress value={Math.max(0, 100 - (latestMetrics.performanceMetrics.latencyMs / 100))} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Confidence</span>
                        <span>{(latestMetrics.performanceMetrics.confidenceScore * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={latestMetrics.performanceMetrics.confidenceScore * 100} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Explainability Metrics</CardTitle>
                    <CardDescription>Explanation quality metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Confidence</span>
                        <span>{(latestMetrics.explainabilityMetrics.avgConfidence * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={latestMetrics.explainabilityMetrics.avgConfidence * 100} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Fidelity</span>
                        <span>{(latestMetrics.explainabilityMetrics.avgFidelity * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={latestMetrics.explainabilityMetrics.avgFidelity * 100} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Quality</span>
                        <span>{latestMetrics.explainabilityMetrics.explanationQuality}</span>
                      </div>
                      <Badge className={getHealthColor(latestMetrics.explainabilityMetrics.explanationQuality)}>
                        {latestMetrics.explainabilityMetrics.explanationQuality.toUpperCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historical Metrics</CardTitle>
                <CardDescription>Track explainability metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                {state.integratedMetrics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No metrics available. Start monitoring to collect data.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {state.integratedMetrics.slice(-10).reverse().map((metric, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {metric.timestamp.toLocaleString()}
                          </span>
                          <Badge className={getHealthColor(metric.overallHealth)}>
                            {metric.overallHealth.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Integrated Score:</span>
                            <div className="font-medium">{(metric.integratedScore * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Model Stability:</span>
                            <div className="font-medium">{(metric.modelStability * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Explanation Drift:</span>
                            <div className="font-medium">{(metric.explanationDrift * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Explanations:</span>
                            <div className="font-medium">{metric.explainabilityMetrics.totalExplanations}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Explainability Alerts</CardTitle>
                <CardDescription>Monitor explanation quality and model behavior</CardDescription>
              </CardHeader>
              <CardContent>
                {state.integratedAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    No alerts at this time. All systems are operating normally.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {state.integratedAlerts.slice(-20).reverse().map((alert) => (
                      <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{alert.message}</span>
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {alert.timestamp.toLocaleString()}
                            </div>
                            {alert.recommendations.length > 0 && (
                              <div className="text-sm">
                                <div className="font-medium mb-1">Recommendations:</div>
                                <ul className="list-disc list-inside space-y-1">
                                  {alert.recommendations.map((rec, index) => (
                                    <li key={index}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Explanations Tab */}
          <TabsContent value="explanations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Model Explanations</CardTitle>
                <CardDescription>View and analyze AI model explanations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-4" />
                  <p>Explanation visualization coming soon...</p>
                  <p className="text-sm">This will show LIME and SHAP explanations for model predictions.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <Button
            onClick={actions.resetBaseline}
            variant="outline"
            disabled={state.isLoading}
          >
            Reset Baseline
          </Button>
          <Button
            onClick={actions.clearData}
            variant="outline"
            disabled={state.isLoading}
          >
            Clear Data
          </Button>
          <Button
            onClick={actions.generateIntegratedMetrics}
            disabled={state.isLoading}
          >
            <Zap className="w-4 h-4 mr-2" />
            Generate Metrics
          </Button>
        </div>
      </div>
    </div>
  );
};
