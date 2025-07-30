import { TrendingUp, TrendingDown, Clock, Target, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useKPIMetrics } from '@/hooks/useKPIMetrics';

interface KPIMetric {
  metric_name: string;
  current_value: number;
  previous_value?: number;
  target_value?: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  metric_category: string;
}

export function KPIMetrics() {
  const { metrics, loading, error, calculateKPIs } = useKPIMetrics();

  const formatValue = (value: number, unit: string) => {
    if (unit === 'percentage') {
      return `${value.toFixed(1)}%`;
    } else if (unit === 'hours') {
      return `${value.toFixed(1)}h`;
    } else if (unit === 'minutes') {
      return `${value.toFixed(1)}m`;
    } else {
      return Math.round(value).toString();
    }
  };

  const getChangePercentage = (current: number, previous?: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getProgressValue = (current: number, target?: number) => {
    if (!target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getMetricIcon = (category: string) => {
    switch (category) {
      case 'response_time': return <Clock className="h-5 w-5" />;
      case 'resolution': return <Target className="h-5 w-5" />;
      case 'alerts': return <AlertTriangle className="h-5 w-5" />;
      case 'performance': return <TrendingUp className="h-5 w-5" />;
      case 'threats': return <Users className="h-5 w-5" />;
      default: return <TrendingUp className="h-5 w-5" />;
    }
  };

  const getTrendIcon = (trend?: string, changePercent?: number) => {
    if (!trend && changePercent !== undefined) {
      return changePercent > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
    }
    
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4" />;
      case 'down': return <TrendingDown className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getTrendColor = (trend?: string, changePercent?: number) => {
    if (!trend && changePercent !== undefined) {
      return changePercent > 0 ? 'text-success' : 'text-info';
    }
    
    switch (trend) {
      case 'up': return 'text-success';
      case 'down': return 'text-info';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>KPI Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>KPI Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading KPI metrics: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">KPI Metrics</h2>
          <p className="text-muted-foreground">Real-time security operations performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="animate-pulse-glow">
            <Clock className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
          <Button variant="outline" size="sm" onClick={calculateKPIs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recalculate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const changePercent = getChangePercentage(metric.current_value, metric.previous_value);
          const progressValue = getProgressValue(metric.current_value, metric.target_value);
          
          return (
            <Card 
              key={metric.metric_name}
              className="relative overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {getMetricIcon(metric.metric_category)}
                      </div>
                    </div>
                    <CardTitle className="text-sm font-medium leading-tight">
                      {metric.metric_name}
                    </CardTitle>
                  </div>
                  
                  {(metric.trend || metric.previous_value) && (
                    <div className={`flex items-center space-x-1 ${getTrendColor(metric.trend, changePercent)}`}>
                      {getTrendIcon(metric.trend, changePercent)}
                      {metric.previous_value && (
                        <span className="text-xs font-medium">
                          {Math.abs(changePercent).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {formatValue(metric.current_value, metric.unit)}
                  </div>
                  
                  {metric.previous_value && (
                    <div className="text-xs text-muted-foreground">
                      Previous: {formatValue(metric.previous_value, metric.unit)}
                    </div>
                  )}
                </div>

                {metric.target_value && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-medium">
                        {formatValue(metric.target_value, metric.unit)}
                      </span>
                    </div>
                    <Progress 
                      value={progressValue} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      {progressValue.toFixed(1)}% of target
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border/50">
                  <Badge variant="outline" className="text-xs">
                    {metric.metric_category.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {metrics.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No KPI metrics available.</p>
            <Button className="mt-4" onClick={calculateKPIs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Calculate Metrics
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}