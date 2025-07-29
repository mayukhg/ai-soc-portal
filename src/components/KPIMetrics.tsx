import { TrendingUp, TrendingDown, Clock, Target, Users, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface KPIMetric {
  title: string;
  value: string;
  change: number;
  changeType: 'increase' | 'decrease';
  description: string;
  target?: number;
  progress?: number;
}

const kpiData: KPIMetric[] = [
  {
    title: 'Mean Time to Detection (MTTD)',
    value: '4.2 min',
    change: -12,
    changeType: 'decrease',
    description: 'Average time to detect threats',
    target: 5,
    progress: 84
  },
  {
    title: 'Mean Time to Response (MTTR)',
    value: '18.5 min',
    change: -8,
    changeType: 'decrease',
    description: 'Average time to respond to incidents',
    target: 20,
    progress: 92
  },
  {
    title: 'False Positive Rate',
    value: '12.3%',
    change: -5,
    changeType: 'decrease',
    description: 'Percentage of false positive alerts',
    target: 10,
    progress: 88
  },
  {
    title: 'Alert Resolution Rate',
    value: '94.7%',
    change: 3,
    changeType: 'increase',
    description: 'Percentage of alerts resolved within SLA',
    target: 95,
    progress: 95
  },
  {
    title: 'Threat Intelligence Coverage',
    value: '87.2%',
    change: 2,
    changeType: 'increase',
    description: 'Coverage of known threat indicators',
    target: 90,
    progress: 87
  },
  {
    title: 'Escalation Rate',
    value: '15.8%',
    change: 1,
    changeType: 'increase',
    description: 'Alerts escalated to higher tiers',
    target: 15,
    progress: 85
  }
];

const dailyStats = {
  alertsProcessed: 234,
  incidentsResolved: 18,
  threatsBlocked: 45,
  analystEfficiency: 92
};

export function KPIMetrics() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">SOC KPI Metrics</h2>
        <div className="flex items-center space-x-3">
          <Badge variant="outline">Last 24h</Badge>
          <Badge variant="secondary">Auto-refreshing</Badge>
        </div>
      </div>

      {/* Daily Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alerts Processed</p>
                <p className="text-2xl font-bold text-primary">{dailyStats.alertsProcessed}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Incidents Resolved</p>
                <p className="text-2xl font-bold text-success">{dailyStats.incidentsResolved}</p>
              </div>
              <Target className="h-8 w-8 text-success opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Threats Blocked</p>
                <p className="text-2xl font-bold text-warning">{dailyStats.threatsBlocked}</p>
              </div>
              <Target className="h-8 w-8 text-warning opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Analyst Efficiency</p>
                <p className="text-2xl font-bold text-accent">{dailyStats.analystEfficiency}%</p>
              </div>
              <Users className="h-8 w-8 text-accent opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiData.map((metric, index) => (
          <Card 
            key={metric.title} 
            className="animate-fade-in transition-all hover:shadow-lg"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">{metric.title}</CardTitle>
                <div className="flex items-center space-x-1">
                  {metric.changeType === 'increase' ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-success" />
                  )}
                  <span className={`text-sm font-medium ${
                    metric.changeType === 'increase' 
                      ? metric.title.includes('Rate') && metric.title !== 'Alert Resolution Rate'
                        ? 'text-warning' 
                        : 'text-success'
                      : 'text-success'
                  }`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-foreground">
                  {metric.value}
                </div>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>

              <p className="text-sm text-muted-foreground">{metric.description}</p>

              {metric.progress !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target Performance</span>
                    <span className="font-medium">{metric.progress}%</span>
                  </div>
                  <Progress 
                    value={metric.progress} 
                    className="h-2"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Updated 2 min ago</span>
                <Badge 
                  variant={metric.progress && metric.progress >= 90 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {metric.progress && metric.progress >= 90 ? "On Target" : "Monitor"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-primary" />
            <span>Performance Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-success">Performing Well</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-success rounded-full" />
                  <span>MTTD significantly below target (4.2 min vs 5.0 min)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-success rounded-full" />
                  <span>Alert resolution rate exceeding 94%</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-success rounded-full" />
                  <span>False positive rate trending downward</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-warning">Areas for Improvement</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-warning rounded-full" />
                  <span>Escalation rate slightly above target</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-warning rounded-full" />
                  <span>Threat intelligence coverage needs improvement</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}