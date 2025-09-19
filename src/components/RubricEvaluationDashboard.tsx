/**
 * Rubric Evaluation Dashboard
 * React component for displaying LLM Rubric Framework evaluation results
 * 
 * This component provides:
 * - Real-time evaluation results display
 * - Performance metrics and scoring
 * - Category breakdown and analysis
 * - Recommendations and alerts
 * - Export and reporting capabilities
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Download, 
  RefreshCw,
  Target,
  Award,
  Clock,
  FileText,
  BarChart,
  PieChart
} from 'lucide-react';
import { useRubricEvaluation } from '@/hooks/useRubricEvaluation';
import { ComprehensiveEvaluationResult, RubricBenchmarkResult } from '@/lib/rubric/rubric-integration-service';

interface RubricEvaluationDashboardProps {
  evaluationService?: any;
  ragasService?: any;
  langSmithService?: any;
  className?: string;
}

export function RubricEvaluationDashboard({
  evaluationService,
  ragasService,
  langSmithService,
  className = '',
}: RubricEvaluationDashboardProps) {
  const {
    isEvaluating,
    isLoading,
    error,
    evaluationResults,
    benchmarkResults,
    currentEvaluation,
    evaluateResponse,
    generateBenchmark,
    generateReport,
    clearResults,
    exportResults,
    getServiceStatus,
  } = useRubricEvaluation({}, evaluationService, ragasService, langSmithService);

  const [selectedTimeRange, setSelectedTimeRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Get service status
  const serviceStatus = getServiceStatus();

  // Calculate summary statistics
  const summaryStats = {
    totalEvaluations: evaluationResults.length,
    averageScore: evaluationResults.length > 0 
      ? evaluationResults.reduce((sum, r) => sum + r.rubricEvaluation.overallScore, 0) / evaluationResults.length
      : 0,
    gradeDistribution: evaluationResults.reduce((acc, r) => {
      const grade = r.rubricEvaluation.grade;
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recentEvaluations: evaluationResults.slice(-5),
  };

  // Get grade color
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-orange-600 bg-orange-100';
      case 'F': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Handle export
  const handleExport = (format: 'json' | 'csv') => {
    try {
      const data = exportResults(format);
      const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rubric-evaluation-results.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Handle benchmark generation
  const handleGenerateBenchmark = async () => {
    try {
      await generateBenchmark(selectedTimeRange);
    } catch (err) {
      console.error('Benchmark generation failed:', err);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">LLM Rubric Evaluation Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive evaluation of LLM performance using standardized rubrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={serviceStatus.isEnabled ? 'default' : 'secondary'}>
            {serviceStatus.isEnabled ? 'Active' : 'Inactive'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => clearResults()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear Results
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Evaluations</p>
                <p className="text-2xl font-bold">{summaryStats.totalEvaluations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(summaryStats.averageScore)}`}>
                  {(summaryStats.averageScore * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Grade</p>
                <p className="text-2xl font-bold">
                  {Object.keys(summaryStats.gradeDistribution).length > 0
                    ? Object.entries(summaryStats.gradeDistribution)
                        .sort(([, a], [, b]) => b - a)[0][0]
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Evaluation</p>
                <p className="text-sm font-medium">
                  {serviceStatus.lastEvaluationTime
                    ? serviceStatus.lastEvaluationTime.toLocaleTimeString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="evaluations">Recent Evaluations</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grade Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Grade Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(summaryStats.gradeDistribution).map(([grade, count]) => (
                    <div key={grade} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={getGradeColor(grade)}>
                          Grade {grade}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {count} evaluation{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="w-20">
                        <Progress 
                          value={(count / summaryStats.totalEvaluations) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Performance Trends</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">
                      {(summaryStats.averageScore * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Overall Average</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Excellent (A)</span>
                      <span>{summaryStats.gradeDistribution.A || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Good (B)</span>
                      <span>{summaryStats.gradeDistribution.B || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Satisfactory (C)</span>
                      <span>{summaryStats.gradeDistribution.C || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Needs Improvement (D)</span>
                      <span>{summaryStats.gradeDistribution.D || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Failing (F)</span>
                      <span>{summaryStats.gradeDistribution.F || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recent Evaluations Tab */}
        <TabsContent value="evaluations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Evaluations</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-4">
              {summaryStats.recentEvaluations.map((evaluation, index) => (
                <Card key={evaluation.rubricEvaluation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Badge className={getGradeColor(evaluation.rubricEvaluation.grade)}>
                          Grade {evaluation.rubricEvaluation.grade}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {evaluation.rubricEvaluation.inputType.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {evaluation.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold ${getScoreColor(evaluation.rubricEvaluation.overallScore)}`}>
                          {(evaluation.rubricEvaluation.overallScore * 100).toFixed(1)}%
                        </span>
                        {evaluation.alerts.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {evaluation.alerts.length} Alert{evaluation.alerts.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Category Scores */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      {Object.entries(evaluation.rubricEvaluation.categoryScores).map(([category, score]) => (
                        <div key={category} className="text-center">
                          <p className="text-xs text-muted-foreground capitalize">
                            {category.replace('_', ' ')}
                          </p>
                          <p className={`text-sm font-medium ${getScoreColor(score)}`}>
                            {(score * 100).toFixed(0)}%
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Alerts */}
                    {evaluation.alerts.length > 0 && (
                      <div className="space-y-1">
                        {evaluation.alerts.map((alert, alertIndex) => (
                          <Alert key={alertIndex} variant="destructive" className="py-2">
                            <AlertTriangle className="h-3 w-3" />
                            <AlertDescription className="text-xs">{alert}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {summaryStats.recentEvaluations.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Evaluations Yet</h3>
                    <p className="text-muted-foreground">
                      Start evaluating LLM responses to see results here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Performance Benchmarks</h3>
            <Button 
              onClick={handleGenerateBenchmark}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BarChart className="h-4 w-4 mr-2" />
              )}
              Generate Benchmark
            </Button>
          </div>

          <div className="space-y-4">
            {benchmarkResults.map((benchmark, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{benchmark.modelName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {benchmark.evaluationCount} evaluations
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getScoreColor(benchmark.averageScore)}`}>
                        {(benchmark.averageScore * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Average Score</p>
                    </div>
                  </div>

                  {/* Grade Distribution */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Grade Distribution:</p>
                    <div className="flex space-x-4">
                      {Object.entries(benchmark.gradeDistribution).map(([grade, count]) => (
                        <div key={grade} className="text-center">
                          <Badge className={getGradeColor(grade)} variant="outline">
                            {grade}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {benchmarkResults.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <BarChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Benchmarks Yet</h3>
                  <p className="text-muted-foreground">
                    Generate benchmarks to compare performance across different models or time periods.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Evaluation Reports</h3>
            <Button 
              onClick={async () => {
                try {
                  const report = await generateReport(selectedTimeRange);
                  console.log('Generated report:', report);
                  // Handle report display or download
                } catch (err) {
                  console.error('Report generation failed:', err);
                }
              }}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Comprehensive Reports</h3>
              <p className="text-muted-foreground mb-4">
                Generate detailed reports with trends, analysis, and recommendations.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Performance trends over time</p>
                <p>• Category breakdown analysis</p>
                <p>• Recommendations for improvement</p>
                <p>• Export capabilities (JSON, CSV)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

