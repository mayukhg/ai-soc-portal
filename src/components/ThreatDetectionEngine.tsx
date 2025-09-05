import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Target, 
  Brain, 
  Activity, 
  Eye,
  Zap,
  Lock,
  Unlock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface ThreatIndicator {
  id: string;
  type: 'malware' | 'network' | 'behavioral' | 'ioc';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
  timestamp: string;
  source: string;
  ioc_value?: string;
  risk_score: number;
}

interface ThreatAnalysis {
  overall_risk: number;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  indicators: ThreatIndicator[];
  recommendations: string[];
  last_updated: string;
}

export function ThreatDetectionEngine() {
  const [threatAnalysis, setThreatAnalysis] = useState<ThreatAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Mock data for demonstration - in production, this would come from your backend
  const mockThreatData: ThreatAnalysis = {
    overall_risk: 75,
    threat_level: 'high',
    last_updated: new Date().toISOString(),
    indicators: [
      {
        id: '1',
        type: 'malware',
        severity: 'critical',
        description: 'Suspicious PowerShell execution detected',
        confidence: 0.95,
        timestamp: new Date(Date.now() - 300000).toISOString(),
        source: 'EDR Agent',
        ioc_value: 'powershell.exe -enc',
        risk_score: 90
      },
      {
        id: '2',
        type: 'network',
        severity: 'high',
        description: 'Unusual outbound connection to suspicious IP',
        confidence: 0.87,
        timestamp: new Date(Date.now() - 600000).toISOString(),
        source: 'Network Monitor',
        ioc_value: '192.168.1.100:443',
        risk_score: 80
      },
      {
        id: '3',
        type: 'behavioral',
        severity: 'medium',
        description: 'Multiple failed login attempts detected',
        confidence: 0.72,
        timestamp: new Date(Date.now() - 900000).toISOString(),
        source: 'Auth Logs',
        risk_score: 65
      },
      {
        id: '4',
        type: 'ioc',
        severity: 'high',
        description: 'Known malicious hash detected',
        confidence: 0.98,
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        source: 'Threat Intel Feed',
        ioc_value: 'a1b2c3d4e5f6...',
        risk_score: 85
      }
    ],
    recommendations: [
      'Isolate affected systems immediately',
      'Run full antivirus scan on all endpoints',
      'Review network traffic for additional indicators',
      'Check for lateral movement patterns',
      'Update threat intelligence feeds'
    ]
  };

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setThreatAnalysis(mockThreatData);
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getThreatTypeIcon = (type: string) => {
    switch (type) {
      case 'malware': return <Shield className="h-4 w-4" />;
      case 'network': return <Activity className="h-4 w-4" />;
      case 'behavioral': return <Brain className="h-4 w-4" />;
      case 'ioc': return <Target className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getRiskLevelColor = (risk: number) => {
    if (risk >= 80) return 'text-red-500';
    if (risk >= 60) return 'text-orange-500';
    if (risk >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Threat Detection Engine</h2>
          <p className="text-muted-foreground">Advanced threat analysis and indicator detection</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
            {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
          </Button>
        </div>
      </div>

      {/* Overall Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Overall Risk Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Risk Level</span>
              <Badge variant={getSeverityColor(mockThreatData.threat_level)}>
                {mockThreatData.threat_level.toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Risk Score</span>
                <span className={getRiskLevelColor(mockThreatData.overall_risk)}>
                  {mockThreatData.overall_risk}/100
                </span>
              </div>
              <Progress 
                value={mockThreatData.overall_risk} 
                className="h-2"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Last updated: {new Date(mockThreatData.last_updated).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Threat Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Active Threat Indicators</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockThreatData.indicators.map((indicator) => (
              <div key={indicator.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getThreatTypeIcon(indicator.type)}
                    <div>
                      <h4 className="font-medium">{indicator.description}</h4>
                      <p className="text-sm text-muted-foreground">
                        Source: {indicator.source} • {new Date(indicator.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getSeverityColor(indicator.severity)}>
                      {indicator.severity.toUpperCase()}
                    </Badge>
                    <span className={`text-sm font-medium ${getRiskLevelColor(indicator.risk_score)}`}>
                      {indicator.risk_score}%
                    </span>
                  </div>
                </div>
                
                {indicator.ioc_value && (
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      IOC: {indicator.ioc_value}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="flex items-center space-x-1">
                      <Target className="h-3 w-3" />
                      <span>Confidence: {Math.round(indicator.confidence * 100)}%</span>
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Zap className="h-3 w-3 mr-1" />
                    Investigate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Security Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockThreatData.recommendations.map((recommendation, index) => (
              <Alert key={index}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{recommendation}</AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
