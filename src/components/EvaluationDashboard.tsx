/**
 * Evaluation Dashboard Component
 * Real-time dashboard for AI model evaluation and monitoring
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useEvaluationService } from '../hooks/useEvaluationService';
import { 
  Play, 
  Square, 
  RefreshCw, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  Brain
} from 'lucide-react';

export const EvaluationDashboard: React.FC = () => {
  const {
    isRunning,
    isLoading,
    error,
    reports,
    latestReport,
    benchmarks,
    latestBenchmarks,
    startService,
    stopService,
    runEvaluation,
    generateReport,
    runBenchmarking,
    exportReport,
    getServiceStatus,
  } = useEvaluationService();

  const [selectedTab, setSelectedTab] = useState('overview');
  const [serviceStatus, setServiceStatus] = useState<any>(null);

  useEffect(() => {
    const updateStatus = () => {
      const status = getServiceStatus();
      setServiceStatus(status);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, [getServiceStatus]);

  const handleStartService = async () => {
    await startService();
  };

  const handleStopService = async () => {
    await stopService();
  };

  const handleRunEvaluation = async () => {
    await runEvaluation();
  };

  const handleGenerateReport = async () => {
    await generateReport();
  };

  const handleRunBenchmarking = async () => {
    await runBenchmarking();
  };

  const handleExportReport = async (reportId: string, format: 'json' | 'html') => {
    try {
      const content = await exportReport(reportId, format);
      const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluation-report-${reportId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-orange-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'fair': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'poor': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable': return <Target className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Model Evaluation Dashboard</h1>
          <p className="text-gray-600">Monitor accuracy, latency, and hallucination detection</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={isRunning ? handleStopService : handleStartService}
            disabled={isLoading}
            variant={isRunning ? "destructive" : "default"}
          >
            {isRunning ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isRunning ? 'Stop Service' : 'Start Service'}
          </Button>
          <Button onClick={handleRunEvaluation} disabled={isLoading || !isRunning}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Run Evaluation
          </Button>
          <Button onClick={handleGenerateReport} disabled={isLoading || !isRunning}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button onClick={handleRunBenchmarking} disabled={isLoading || !isRunning}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Run Benchmark
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Service Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Service Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{serviceStatus?.reportsCount || 0}</div>
                  <div className="text-sm text-gray-600">Reports</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{serviceStatus?.benchmarksCount || 0}</div>
                  <div className="text-sm text-gray-600">Benchmarks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{serviceStatus?.monitoringStatus?.snapshotsCount || 0}</div>
                  <div className="text-sm text-gray-600">Snapshots</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{serviceStatus?.monitoringStatus?.alertsCount || 0}</div>
                  <div className="text-sm text-gray-600">Alerts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Latest Report Summary */}
          {latestReport && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  Latest Evaluation Report
                </CardTitle>
                <CardDescription>
                  Generated: {new Date(latestReport.timestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Overall Score</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(latestReport.summary.status)}
                      <span className={`text-2xl font-bold ${getStatusColor(latestReport.summary.status)}`}>
                        {latestReport.summary.overallScore.toFixed(1)}%
                      </span>
                      <Badge variant="outline">{latestReport.summary.status}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Accuracy</div>
                      <div className="text-xl font-semibold">{latestReport.summary.keyMetrics.accuracy.toFixed(1)}%</div>
                      <Progress value={latestReport.summary.keyMetrics.accuracy} className="mt-2" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Latency</div>
                      <div className="text-xl font-semibold">{latestReport.summary.keyMetrics.latency.toFixed(0)}ms</div>
                      <Progress value={Math.max(0, 100 - (latestReport.summary.keyMetrics.latency / 50))} className="mt-2" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Hallucination Rate</div>
                      <div className="text-xl font-semibold">{latestReport.summary.keyMetrics.hallucinationRate.toFixed(1)}%</div>
                      <Progress value={Math.max(0, 100 - latestReport.summary.keyMetrics.hallucinationRate * 10)} className="mt-2" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Confidence</div>
                      <div className="text-xl font-semibold">{latestReport.summary.keyMetrics.confidence.toFixed(1)}%</div>
                      <Progress value={latestReport.summary.keyMetrics.confidence} className="mt-2" />
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-2">Trend Analysis</div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(latestReport.trendAnalysis.overallTrend)}
                        <span className="text-sm">Overall: {latestReport.trendAnalysis.overallTrend}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(latestReport.trendAnalysis.accuracyTrend)}
                        <span className="text-sm">Accuracy: {latestReport.trendAnalysis.accuracyTrend}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(latestReport.trendAnalysis.latencyTrend)}
                        <span className="text-sm">Latency: {latestReport.trendAnalysis.latencyTrend}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {latestReport && latestReport.summary.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {latestReport.summary.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Reports</CardTitle>
              <CardDescription>Historical evaluation reports and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No reports available. Run an evaluation to generate reports.
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">Report {report.id}</span>
                          <Badge variant="outline">{report.summary.status}</Badge>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportReport(report.id, 'json')}
                          >
                            Export JSON
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportReport(report.id, 'html')}
                          >
                            Export HTML
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Generated: {new Date(report.timestamp).toLocaleString()}
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>Score: {report.summary.overallScore.toFixed(1)}%</div>
                        <div>Accuracy: {report.summary.keyMetrics.accuracy.toFixed(1)}%</div>
                        <div>Latency: {report.summary.keyMetrics.latency.toFixed(0)}ms</div>
                        <div>Hallucination: {report.summary.keyMetrics.hallucinationRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Model Benchmarks</CardTitle>
              <CardDescription>Performance comparison across different AI models</CardDescription>
            </CardHeader>
            <CardContent>
              {latestBenchmarks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No benchmark results available. Run benchmarking to compare models.
                </div>
              ) : (
                <div className="space-y-4">
                  {latestBenchmarks.map((benchmark) => (
                    <div key={benchmark.modelName} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{benchmark.modelName}</span>
                          <Badge variant="outline">Rank #{benchmark.ranking}</Badge>
                        </div>
                        <div className="text-lg font-bold">{benchmark.overallScore.toFixed(1)}%</div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>Accuracy: {benchmark.accuracy.toFixed(1)}%</div>
                        <div>Latency: {benchmark.latency.toFixed(0)}ms</div>
                        <div>Hallucination: {benchmark.hallucinationRate.toFixed(1)}%</div>
                        <div>Confidence: {benchmark.confidence.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Monitoring</CardTitle>
              <CardDescription>Live performance metrics and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Service Status</span>
                      <Badge variant={isRunning ? "default" : "secondary"}>
                        {isRunning ? "Running" : "Stopped"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Snapshots</span>
                      <span>{serviceStatus?.monitoringStatus?.snapshotsCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Alerts</span>
                      <span>{serviceStatus?.monitoringStatus?.alertsCount || 0}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">System Health</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Reports Generated</span>
                      <span>{serviceStatus?.reportsCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Benchmarks Run</span>
                      <span>{serviceStatus?.benchmarksCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Update</span>
                      <span>{new Date().toLocaleTimeString()}</span>
                    </div>
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
