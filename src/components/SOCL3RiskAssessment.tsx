import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, TrendingUp, Target, Brain, Zap, Clock, CheckCircle, XCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RiskAssessment {
  id: string;
  name: string;
  description: string;
  asset_type: 'server' | 'workstation' | 'network' | 'application' | 'database';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  likelihood: number; // 0-1
  impact: number; // 0-1
  risk_score: number; // 0-100
  threats: Threat[];
  controls: Control[];
  last_assessed: string;
  next_review: string;
  status: 'active' | 'mitigated' | 'accepted' | 'transferred';
}

interface Threat {
  id: string;
  name: string;
  description: string;
  category: 'malware' | 'insider' | 'external' | 'physical' | 'environmental';
  likelihood: number;
  impact: number;
  risk_score: number;
  mitigation_status: 'none' | 'partial' | 'full';
  controls: string[];
}

interface Control {
  id: string;
  name: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective' | 'compensating';
  effectiveness: number; // 0-1
  implementation_status: 'not_implemented' | 'partial' | 'fully_implemented';
  cost: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export function SOCL3RiskAssessment() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');
  const [filterAssetType, setFilterAssetType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Sample data - in real implementation, this would come from API
  useEffect(() => {
    const sampleAssessments: RiskAssessment[] = [
      {
        id: '1',
        name: 'Critical Database Server Risk Assessment',
        description: 'Risk assessment for the primary database server handling customer data',
        asset_type: 'database',
        risk_level: 'critical',
        likelihood: 0.8,
        impact: 0.9,
        risk_score: 85,
        threats: [
          {
            id: 't1',
            name: 'SQL Injection Attack',
            description: 'Malicious SQL injection attempts targeting the database',
            category: 'external',
            likelihood: 0.7,
            impact: 0.9,
            risk_score: 75,
            mitigation_status: 'partial',
            controls: ['Input validation', 'Parameterized queries', 'WAF']
          },
          {
            id: 't2',
            name: 'Insider Data Theft',
            description: 'Authorized user accessing and exfiltrating sensitive data',
            category: 'insider',
            likelihood: 0.3,
            impact: 0.8,
            risk_score: 35,
            mitigation_status: 'partial',
            controls: ['Access controls', 'Data encryption', 'Audit logging']
          }
        ],
        controls: [
          {
            id: 'c1',
            name: 'Database Encryption',
            description: 'Encrypt sensitive data at rest and in transit',
            type: 'preventive',
            effectiveness: 0.9,
            implementation_status: 'fully_implemented',
            cost: 'medium',
            effort: 'medium'
          },
          {
            id: 'c2',
            name: 'Intrusion Detection System',
            description: 'Monitor database access for suspicious activities',
            type: 'detective',
            effectiveness: 0.8,
            implementation_status: 'partial',
            cost: 'high',
            effort: 'high'
          }
        ],
        last_assessed: '2024-01-10T00:00:00Z',
        next_review: '2024-04-10T00:00:00Z',
        status: 'active'
      },
      {
        id: '2',
        name: 'Web Application Security Assessment',
        description: 'Risk assessment for the customer-facing web application',
        asset_type: 'application',
        risk_level: 'high',
        likelihood: 0.6,
        impact: 0.7,
        risk_score: 65,
        threats: [
          {
            id: 't3',
            name: 'Cross-Site Scripting (XSS)',
            description: 'Malicious scripts injected into web pages',
            category: 'external',
            likelihood: 0.8,
            impact: 0.6,
            risk_score: 60,
            mitigation_status: 'partial',
            controls: ['Input sanitization', 'CSP headers', 'Output encoding']
          }
        ],
        controls: [
          {
            id: 'c3',
            name: 'Web Application Firewall',
            description: 'Filter and monitor HTTP traffic',
            type: 'preventive',
            effectiveness: 0.7,
            implementation_status: 'fully_implemented',
            cost: 'medium',
            effort: 'low'
          }
        ],
        last_assessed: '2024-01-05T00:00:00Z',
        next_review: '2024-04-05T00:00:00Z',
        status: 'active'
      }
    ];

    setAssessments(sampleAssessments);
  }, []);

  const getRiskLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getAssetTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'server': <Shield className="h-4 w-4" />,
      'workstation': <Target className="h-4 w-4" />,
      'network': <Zap className="h-4 w-4" />,
      'application': <Brain className="h-4 w-4" />,
      'database': <AlertTriangle className="h-4 w-4" />
    };
    return icons[type] || <Shield className="h-4 w-4" />;
  };

  const getControlTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'preventive': <Shield className="h-4 w-4" />,
      'detective': <AlertTriangle className="h-4 w-4" />,
      'corrective': <CheckCircle className="h-4 w-4" />,
      'compensating': <Info className="h-4 w-4" />
    };
    return icons[type] || <Shield className="h-4 w-4" />;
  };

  const getMitigationStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'none': 'bg-red-100 text-red-800',
      'partial': 'bg-yellow-100 text-yellow-800',
      'full': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getImplementationStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'not_implemented': 'bg-red-100 text-red-800',
      'partial': 'bg-yellow-100 text-yellow-800',
      'fully_implemented': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesRiskLevel = filterRiskLevel === 'all' || assessment.risk_level === filterRiskLevel;
    const matchesAssetType = filterAssetType === 'all' || assessment.asset_type === filterAssetType;
    const matchesStatus = filterStatus === 'all' || assessment.status === filterStatus;
    return matchesRiskLevel && matchesAssetType && matchesStatus;
  });

  const selectedAssessmentData = assessments.find(a => a.id === selectedAssessment);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">SOC L3 Risk Assessment</h2>
          <p className="text-muted-foreground">AI-powered risk assessment and mitigation planning for critical assets</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="animate-pulse-glow">
            <Brain className="h-3 w-3 mr-1" />
            AI Enhanced
          </Badge>
          <Button>
            <Brain className="h-4 w-4 mr-2" />
            New Assessment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Risk Assessments</CardTitle>
                <div className="flex items-center space-x-2">
                  <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Risk Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterAssetType} onValueChange={setFilterAssetType}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Asset Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="workstation">Workstation</SelectItem>
                      <SelectItem value="network">Network</SelectItem>
                      <SelectItem value="application">Application</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="mitigated">Mitigated</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="transferred">Transferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAssessments.map((assessment) => (
                  <Card 
                    key={assessment.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedAssessment === assessment.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedAssessment(assessment.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {getAssetTypeIcon(assessment.asset_type)}
                          <div>
                            <h3 className="font-semibold">{assessment.name}</h3>
                            <p className="text-sm text-muted-foreground">{assessment.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getRiskLevelColor(assessment.risk_level)}>
                            {assessment.risk_level.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            Score: {assessment.risk_score}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-semibold text-muted-foreground">Likelihood</div>
                          <div className="flex items-center space-x-2">
                            <Progress value={assessment.likelihood * 100} className="flex-1" />
                            <span>{Math.round(assessment.likelihood * 100)}%</span>
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-muted-foreground">Impact</div>
                          <div className="flex items-center space-x-2">
                            <Progress value={assessment.impact * 100} className="flex-1" />
                            <span>{Math.round(assessment.impact * 100)}%</span>
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-muted-foreground">Threats</div>
                          <div>{assessment.threats.length} identified</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          {selectedAssessmentData ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assessment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="font-semibold text-muted-foreground">Asset Type</div>
                      <div className="flex items-center space-x-2">
                        {getAssetTypeIcon(selectedAssessmentData.asset_type)}
                        <span className="capitalize">{selectedAssessmentData.asset_type}</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-muted-foreground">Risk Score</div>
                      <div className="flex items-center space-x-2">
                        <Progress value={selectedAssessmentData.risk_score} className="flex-1" />
                        <span className="font-semibold">{selectedAssessmentData.risk_score}</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-muted-foreground">Last Assessed</div>
                      <div>{new Date(selectedAssessmentData.last_assessed).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-muted-foreground">Next Review</div>
                      <div>{new Date(selectedAssessmentData.next_review).toLocaleDateString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Threats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedAssessmentData.threats.map((threat) => (
                      <div key={threat.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">{threat.name}</h4>
                          <Badge className={getMitigationStatusColor(threat.mitigation_status)}>
                            {threat.mitigation_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{threat.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="font-semibold text-muted-foreground">Likelihood</div>
                            <div>{Math.round(threat.likelihood * 100)}%</div>
                          </div>
                          <div>
                            <div className="font-semibold text-muted-foreground">Impact</div>
                            <div>{Math.round(threat.impact * 100)}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Controls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedAssessmentData.controls.map((control) => (
                      <div key={control.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">{control.name}</h4>
                          <Badge className={getImplementationStatusColor(control.implementation_status)}>
                            {control.implementation_status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{control.description}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="font-semibold text-muted-foreground">Type</div>
                            <div className="flex items-center space-x-1">
                              {getControlTypeIcon(control.type)}
                              <span className="capitalize">{control.type}</span>
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-muted-foreground">Effectiveness</div>
                            <div>{Math.round(control.effectiveness * 100)}%</div>
                          </div>
                          <div>
                            <div className="font-semibold text-muted-foreground">Cost</div>
                            <div className="capitalize">{control.cost}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Select an Assessment</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a risk assessment from the list to view detailed information about threats and controls.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
